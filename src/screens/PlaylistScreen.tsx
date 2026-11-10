/**
 * @file PlaylistScreen.tsx
 * @description Экран списка плейлистов.
 *
 * Показывает все пользовательские плейлисты с треками.
 * Служебные и пустые плейлисты отфильтрованы сервисом.
 * Выбор плейлиста делегирован playbackController:
 * выбранный плейлист выделяется, как выбранный альбом
 * на экране альбомов.
 */

import React, { useEffect, useState, useSyncExternalStore } from 'react';

import {
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { NavigationBar, PlaybackControl, AppText } from '../components';
import { libraryStore } from '../library/LibraryStore';

import {
    TracklistPlaylist,
    loadTracklistPlaylists,
} from '../services/tracklistService';

import { playbackController } from '../services/playbackController';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { typography } from '../theme/typography';

import { formatError, useTranslation } from '../i18n';

export default function PlaylistScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    const { t } = useTranslation();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * экран делится на левую и правую части.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;

    const [playlists, setPlaylists] = useState<TracklistPlaylist[]>([]);

    const [isLoading, setIsLoading] = useState(true);

    /*
     * Подписываемся на изменения LibraryStore
     * и playbackController (pending/error при выборе плейлиста).
     */
    useSyncExternalStore(
        libraryStore.subscribe,
        libraryStore.getSnapshot,
        libraryStore.getSnapshot,
    );

    useSyncExternalStore(
        playbackController.subscribe,
        playbackController.getSnapshot,
        playbackController.getSnapshot,
    );

    const currentPlaylistId =
        libraryStore.getCurrentPlayback()?.currentPlaylistId ?? null;

    const selectionPending = playbackController.isPending();

    const selectionError = playbackController.getError();

    /*
     * Загружаем список плейлистов при открытии экрана.
     * Флаг cancelled защищает от установки состояния
     * после размонтирования экрана.
     */
    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            try {
                const loadedPlaylists = await loadTracklistPlaylists();

                if (!cancelled) {
                    setPlaylists(loadedPlaylists);
                }
            } catch (error) {
                console.error('Не удалось загрузить список плейлистов:', error);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const renderPlaylist = ({ item }: { item: TracklistPlaylist }) => {
        const selected = item.id === currentPlaylistId;

        return (
            <Pressable
                style={[
                    styles.item,
                    selected && {
                        backgroundColor: theme.highLighting,
                    },
                    selectionPending && styles.disabledItem,
                ]}
                onPress={() => {
                    playbackController.selectPlaylist(item.id);
                }}
                disabled={selectionPending}
                accessibilityRole="button"
                accessibilityLabel={t('library.selectPlaylist', {
                    name: item.title,
                })}
            >
                <AppText style={[styles.title, { color: theme.textPrimary }]}>
                    {item.title}
                </AppText>

                <Text style={[styles.count, { color: theme.textSecondary }]}>
                    {item.itemCount}
                </Text>
            </Pressable>
        );
    };

    /*
     * Список плейлистов: одинаков для портретной
     * и ландшафтной разметки. Строки "Все ..." нет:
     * список начинается сразу с плейлистов.
     *
     * Сообщение об ошибке показывается во всех состояниях
     * списка (загрузка, пусто, список) — как на экране альбомов:
     * над блоком управления воспроизведением.
     */
    const selectionErrorBlock = selectionError ? (
        <AppText
            style={[styles.selectionError, { color: theme.textSecondary }]}
        >
            {formatError(selectionError, t)}
        </AppText>
    ) : null;

    const playlistsList = (
        <>
            {isLoading ? (
                <AppText
                    style={[styles.status, { color: theme.textSecondary }]}
                >
                    {t('tracklist.loading')}
                </AppText>
            ) : playlists.length === 0 ? (
                <AppText
                    style={[styles.status, { color: theme.textSecondary }]}
                >
                    {t('tracklist.empty')}
                </AppText>
            ) : (
                <FlatList
                    data={playlists}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderPlaylist}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {selectionErrorBlock}
        </>
    );

    if (isLandscape) {
        return (
            <>
                <StatusBar
                    barStyle={
                        resolvedTheme === 'light'
                            ? 'dark-content'
                            : 'light-content'
                    }
                />

                <SafeAreaView
                    style={[
                        styles.container,
                        { backgroundColor: theme.background },
                    ]}
                >
                    <View style={styles.landscape}>
                        {/*
                         * Левая часть: только список плейлистов.
                         */}
                        <View style={styles.playlistsPane}>
                            {playlistsList}
                        </View>

                        {/*
                         * Правая часть: настройки, плеер
                         * и navigation bar.
                         */}
                        <View style={styles.playerPane}>
                            <View style={styles.playerArea}>
                                <PlaybackControl layout="stacked" />
                            </View>

                            <NavigationBar active="playlists" />
                        </View>
                    </View>
                </SafeAreaView>
            </>
        );
    }

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
                <View style={styles.listContainer}>{playlistsList}</View>
                <View style={styles.playbackContainer}>
                    <PlaybackControl />
                </View>
                <NavigationBar active="playlists" />
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    listContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },

    /*
     * Ландшафт: две колонки.
     */
    landscape: {
        flex: 1,
        flexDirection: 'row',
    },

    /*
     * Левая колонка — только список плейлистов.
     */
    playlistsPane: {
        width: '40%',
        paddingHorizontal: 16,
    },

    /*
     * Правая колонка — плеер
     * и navigation bar.
     */
    playerPane: {
        flex: 1,
    },

    /*
     * Область плеера в правой колонке.
     */
    playerArea: {
        flex: 1,
        justifyContent: 'center',
    },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: 8,
    },

    /*
     * Во время выбора плейлиста строки
     * визуально отключаются.
     */
    disabledItem: {
        opacity: 0.5,
    },

    title: {
        ...typography.smallText,
        flex: 1,
    },

    count: {
        fontSize: 14,
        marginLeft: 12,
    },

    selectionError: {
        ...typography.smallText,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },

    status: {
        ...typography.smallText,
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    playbackContainer: {
        marginTop: 20,
    },
});
