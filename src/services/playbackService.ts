/**
 * @file src/services/playbackService.ts
 *
 * @description
 * Сервис сохранения и восстановления текущего состояния
 * воспроизведения.
 *
 * Данные хранятся отдельно от настроек приложения.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CurrentPlayback } from '../library/types';

import { readMigratedStorageValue } from './storageMigration';

const PLAYBACK_KEY = '@moode_remote/currentPlayback';

/*
 * Ключ состояния воспроизведения из прежней версии
 * приложения (FoobarRemote). При первом чтении значение
 * переносится в новый ключ.
 */
const LEGACY_PLAYBACK_KEY = '@foobar_remote/currentPlayback';

/**
 * Загружает сохраненное состояние воспроизведения.
 *
 * Возвращает null, если состояние еще не сохранялось.
 */
export async function loadCurrentPlayback(): Promise<CurrentPlayback | null> {
    try {
        const value = await readMigratedStorageValue(
            PLAYBACK_KEY,
            LEGACY_PLAYBACK_KEY,
        );

        if (!value) {
            return null;
        }

        const playback = JSON.parse(value) as CurrentPlayback;

        /*
         * Минимальная проверка структуры.
         *
         * Состояние должно иметь корректный источник
         * и непротиворечивый контекст этого источника.
         */
        if (!isValidLoadedPlayback(playback)) {
            console.warn('Invalid saved current playback state.');

            return null;
        }

        return playback;
    } catch (error) {
        console.error('Failed to load current playback:', error);

        return null;
    }
}

/**
 * Проверяет загруженное состояние на минимальную
 * структурную корректность.
 *
 * Легаси-состояния (без playbackSource) считаются
 * album-состояниями.
 */
function isValidLoadedPlayback(playback: CurrentPlayback): boolean {
    /*
     * Легаси-состояния: playbackSource отсутствует,
     * но альбомный контекст присутствует.
     */
    if (playback.playbackSource === undefined) {
        return (
            typeof playback.currentAlbumId === 'string' &&
            typeof playback.currentTrackId === 'string' &&
            typeof playback.currentTime === 'number'
        );
    }

    if (playback.playbackSource === 'album') {
        return (
            typeof playback.currentAlbumId === 'string' &&
            typeof playback.currentTrackId === 'string' &&
            typeof playback.currentTime === 'number'
        );
    }

    if (playback.playbackSource === 'playlist') {
        return (
            playback.currentPlaylistId !== null &&
            typeof playback.currentPlaylistTrackTime === 'number' &&
            Number.isFinite(playback.currentPlaylistTrackTime) &&
            playback.currentPlaylistTrackTime >= 0 &&
            (playback.currentPlaylistTrackId === null ||
                typeof playback.currentPlaylistTrackId === 'string')
        );
    }

    return false;
}

/**
 * Сохраняет текущее состояние воспроизведения.
 */
export async function saveCurrentPlayback(
    playback: CurrentPlayback,
): Promise<void> {
    try {
        await AsyncStorage.setItem(PLAYBACK_KEY, JSON.stringify(playback));
    } catch (error) {
        console.error('Failed to save current playback:', error);

        throw error;
    }
}

/**
 * Удаляет сохраненное состояние
 * воспроизведения.
 */
export async function clearCurrentPlayback(): Promise<void> {
    try {
        await Promise.all([
            AsyncStorage.removeItem(PLAYBACK_KEY),
            AsyncStorage.removeItem(LEGACY_PLAYBACK_KEY),
        ]);
    } catch (error) {
        console.error('Failed to clear current playback:', error);

        throw error;
    }
}
