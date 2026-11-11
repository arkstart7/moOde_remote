/**
 * @file settingsService.ts
 * @description Сервис для работы с настройками приложения.
 *
 * Настройки читаются из AsyncStorage один раз и кэшируются
 * в памяти: цикл опроса состояния проигрывателя обращается
 * к ним каждую секунду, и повторные чтения хранилища
 * и разбор JSON на каждый тик недопустимы.
 *
 * Кэш инвалидируется при сохранении и очистке настроек.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { readMigratedStorageValue } from './storageMigration';

export interface AppSettings {
    host: string;
    port: string;
}

const SETTINGS_KEY = '@moode_remote/settings';

/*
 * Ключ настроек из прежней версии приложения (FoobarRemote).
 * При первом чтении значение переносится в новый ключ.
 */
const LEGACY_SETTINGS_KEY = '@foobar_remote/settings';

/*
 * undefined означает «еще не читали»,
 * null — «прочитали, настроек нет или они некорректны».
 */
let cachedSettings: AppSettings | null | undefined;

/**
 * Загружает настройки.
 *
 * Возвращает null, если настроек нет,
 * либо сохраненное значение не прошло проверку структуры.
 */
export async function loadSettings(): Promise<AppSettings | null> {
    if (cachedSettings !== undefined) {
        return cachedSettings;
    }

    try {
        const value = await readMigratedStorageValue(
            SETTINGS_KEY,
            LEGACY_SETTINGS_KEY,
        );

        cachedSettings = value ? parseAppSettings(value) : null;
    } catch (error) {
        console.error('Failed to load settings:', error);

        cachedSettings = null;
    }

    return cachedSettings;
}

/**
 * Сохраняет настройки и обновляет кэш.
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
    try {
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings:', error);

        throw error;
    }

    cachedSettings = settings;
}

/**
 * Удаляет настройки и сбрасывает кэш.
 */
export async function clearSettings(): Promise<void> {
    try {
        await Promise.all([
            AsyncStorage.removeItem(SETTINGS_KEY),
            AsyncStorage.removeItem(LEGACY_SETTINGS_KEY),
        ]);
    } catch (error) {
        console.error('Failed to clear settings:', error);

        throw error;
    }

    cachedSettings = null;
}

/**
 * Разбирает и проверяет JSON настроек.
 *
 * Внешние данные обрабатываются как unknown:
 * структура должна точно соответствовать AppSettings,
 * иначе настройки считаются отсутствующими.
 */
function parseAppSettings(value: string): AppSettings | null {
    let parsed: unknown;

    try {
        parsed = JSON.parse(value);
    } catch (error) {
        console.error('Saved settings contain invalid JSON:', error);

        return null;
    }

    if (!isAppSettings(parsed)) {
        console.warn('Saved settings have unexpected structure.');

        return null;
    }

    return parsed;
}

function isAppSettings(value: unknown): value is AppSettings {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const settings = value as Partial<Record<keyof AppSettings, unknown>>;

    return (
        typeof settings.host === 'string' && typeof settings.port === 'string'
    );
}
