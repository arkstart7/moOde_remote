/**
 * @file StartScreen.tsx
 * @description
 * Стартовый экран приложения.
 *
 * Выполняет последовательность:
 *
 * 1. Загрузка сохранённых настроек.
 * 2. Проверка настроек.
 * 3. Загрузка Library из плейлиста "beefweb-catalog"
 *    + восстановление CurrentPlayback.
 * 4. Загрузка текущего альбома в playlist.
 *    Пока используется заглушка.
 * 5. Открытие AlbumsScreen.
 *
 * Если настройки отсутствуют или некорректны,
 * открывается SettingsScreen.
 *
 * После возврата из SettingsScreen
 * StartScreen запускает процесс заново.
 */

import React, { useCallback, useState } from 'react';

import {
    ActivityIndicator,
    Image,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFocusEffect } from '@react-navigation/native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '../components';

import { loadSettings } from '../services/settingsService';

import { validateSettings } from '../services/settingsValidator';

import { loadLibrary } from '../services/LibraryLoader';

import { libraryStore } from '../library/LibraryStore';

import { readPlaylistTrackInfo } from '../services/tracklistService';

import {
    loadCurrentAlbumToBeefwebPlaylist,
    loadTrackPathsToBeefwebPlaylist,
    playlistExists,
} from '../services/beefwebPlaylistService';

import { stopPlayer } from '../services/beefwebPlayerService';

import { createDefaultPlayback } from '../services/playbackInitializer';

import { saveCurrentPlayback } from '../services/playbackService';

import { RootStackParamList } from '../types/navigation';

import { colors } from '../theme/colors';

import { typography } from '../theme/typography';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { buildBeefwebUrl } from '../services/beefwebUrl';

import { describeError, Translation, useTranslation } from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Start'>;

/**
 * Состояния процесса запуска.
 */
type StartStatus = 'checkingSettings' | 'loadingLibrary' | 'loadingPlaylist';

/**
 * Сбрасывает воспроизведение к состоянию по умолчанию:
 * первый альбом библиотеки, первый трек, остановлено.
 *
 * Выполняется, когда сохранённый плейлист недоступен
 * (например, удалён на сервере в foobar2000) и его
 * строки невозможно восстановить.
 *
 * @param beefwebUrl Базовый URL Beefweb без завершающего "/".
 */
async function resetToDefaultPlayback(beefwebUrl: string): Promise<void> {
    const playback = createDefaultPlayback(libraryStore.getLibrary());

    /*
     * Состояние заменяется до обращения к серверу:
     * loadCurrentAlbumToBeefwebPlaylist() читает пути
     * треков нового текущего альбома из LibraryStore.
     */
    libraryStore.setCurrentPlayback(playback);

    await stopPlayer(beefwebUrl);

    await loadCurrentAlbumToBeefwebPlaylist(beefwebUrl);

    await saveCurrentPlayback(playback);

    console.error(
        'Saved playback source is unavailable, reset to the first album.',
    );
}

export default function StartScreen({ navigation }: Props) {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    const [status, setStatus] = useState<StartStatus>('checkingSettings');

    const { t } = useTranslation();

    /*
     * --------------------------------------------------------
     * Запуск приложения.
     * useFocusEffect используется специально.
     * Когда SettingsScreen делает:
     * navigation.replace('Start')
     * StartScreen снова получает focus,
     * и весь процесс запуска выполняется заново.
     * --------------------------------------------------------
     */
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            const start = async () => {
                try {
                    /*
                     * ==================================================
                     * 1. Загрузка сохранённых настроек
                     * ==================================================
                     */
                    setStatus('checkingSettings');

                    const settings = await loadSettings();

                    if (cancelled) {
                        return;
                    }

                    /*
                     * --------------------------------------------------
                     * Настроек нет.
                     * Открываем Settings.
                     *
                     * Используем navigate(), а не replace(),
                     * чтобы Start остался в Stack.
                     *
                     * Settings после Back заменит себя
                     * обратно на Start.
                     * --------------------------------------------------
                     */

                    if (!settings) {
                        navigation.navigate('Settings', {
                            errors: [],
                            fromStart: true,
                        });

                        return;
                    }

                    /*
                     * ==================================================
                     * 2. Проверка настроек
                     * ==================================================
                     */

                    const validationResult = await validateSettings(settings);

                    if (cancelled) {
                        return;
                    }

                    /*
                     * Настройки некорректны.
                     */

                    if (validationResult.errors.length > 0) {
                        navigation.navigate('Settings', {
                            errors: validationResult.errors,
                            fromStart: true,
                        });

                        return;
                    }

                    /*
                     * ==================================================
                     * Настройки корректны
                     * ==================================================
                     */

                    /*
                     * ==================================================
                     * 3. Загрузка Library
                     * ==================================================
                     *
                     * loadLibrary():
                     *
                     * - читает плейлист "beefweb-catalog";
                     * - импортирует Library;
                     * - устанавливает Library в LibraryStore;
                     * - восстанавливает CurrentPlayback;
                     * - устанавливает CurrentPlayback
                     *   в LibraryStore.
                     */

                    setStatus('loadingLibrary');

                    const beefwebUrl = buildBeefwebUrl(
                        settings.foobarUrl,
                        settings.foobarPort,
                    );

                    await loadLibrary(beefwebUrl);

                    if (cancelled) {
                        return;
                    }

                    /*
                     * ==================================================
                     * 4. Загрузка playlist
                     * ==================================================
                     *
                     * Пока используется заглушка.
                     *
                     * Загрузка:
                     *
                     * libraryStore.getCurrentAlbumTrackPaths()
                     *
                     * в Beefweb playlist.
                     */

                    setStatus('loadingPlaylist');

                    /*
                     * Активный источник определяет, какие треки
                     * попадают в playlist "beefweb" при запуске:
                     * треки текущего альбома или треки выбранного
                     * плейлиста.
                     */
                    if (libraryStore.getPlaybackSource() === 'playlist') {
                        const playlistId =
                            libraryStore.getCurrentPlayback()
                                ?.currentPlaylistId;

                        /*
                         * Сохранённый плейлист мог быть удалён
                         * на сервере (например, в foobar2000).
                         * В этом случае состояние по умолчанию:
                         * первый альбом и первый трек.
                         */
                        let playlistRestored = false;

                        if (playlistId !== null && playlistId !== undefined) {
                            try {
                                if (
                                    await playlistExists(beefwebUrl, playlistId)
                                ) {
                                    const items = await readPlaylistTrackInfo(
                                        playlistId,
                                    );

                                    /*
                                     * Восстанавливаем строки плейлиста
                                     * в LibraryStore: без них индекс
                                     * текущего трека не определён и
                                     * управление воспроизведением
                                     * невозможно.
                                     */
                                    libraryStore.restorePlaylistEntries(
                                        playlistId,
                                        items,
                                    );

                                    await loadTrackPathsToBeefwebPlaylist(
                                        beefwebUrl,
                                        items.map(item => item.path),
                                    );

                                    playlistRestored = true;
                                }
                            } catch (error) {
                                console.error(
                                    'Saved playlist is unavailable, falling back to the first album:',
                                    error,
                                );
                            }
                        }

                        if (!playlistRestored) {
                            await resetToDefaultPlayback(beefwebUrl);
                        }
                    } else {
                        await loadCurrentAlbumToBeefwebPlaylist(beefwebUrl);
                    }

                    if (cancelled) {
                        return;
                    }

                    /*
                     * ==================================================
                     * 5. Открываем Albums
                     * ==================================================
                     *
                     * Start больше не нужен,
                     * поэтому replace() здесь правильный.
                     */

                    navigation.replace('Albums');
                } catch (error) {
                    console.error('Failed to start application:', error);

                    if (cancelled) {
                        return;
                    }

                    /*
                     * Любая ошибка запуска
                     * передаётся в Settings.
                     */

                    navigation.navigate('Settings', {
                        errors: [describeError(error)],
                        fromStart: true,
                    });
                }
            };

            start();

            /*
             * При потере focus прекращаем
             * дальнейшее выполнение процесса.
             *
             * Например:
             *
             * Start → Settings
             *
             * Старый start() не должен продолжать
             * работу поверх Settings.
             */

            return () => {
                cancelled = true;
            };
        }, [navigation]),
    );

    return (
        <>
            <StatusBar
                barStyle={
                    resolvedTheme === 'light' ? 'dark-content' : 'light-content'
                }
            />

            <SafeAreaView
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
            >
                <View style={styles.coverImageContainer}>
                    <Image
                        source={require('../assets/images/foobar_18940.png')}
                        resizeMode="contain"
                        style={styles.coverImage}
                    />
                </View>

                <View style={styles.textContainer}>
                    <ActivityIndicator size="large" color={theme.textPrimary} />

                    <AppText
                        style={[styles.text, { color: theme.textPrimary }]}
                    >
                        {getStartStatusText(status, t)}
                    </AppText>
                </View>
            </SafeAreaView>
        </>
    );
}

/**
 * Возвращает текст для текущего
 * состояния запуска.
 */
function getStartStatusText(status: StartStatus, t: Translation): string {
    switch (status) {
        case 'checkingSettings':
            return t('start.checkingSettings');

        case 'loadingLibrary':
            return t('start.loadingLibrary');

        case 'loadingPlaylist':
            return t('start.loadingPlaylist');
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    coverImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    coverImage: {
        width: '80%',
        height: '80%',
    },

    textContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 60,
    },

    text: {
        ...typography.navigationTitle,
        marginTop: 30,
    },
});
