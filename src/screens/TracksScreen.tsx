/**
 * @file TracksScreen.tsx
 * @description Экран треков активного источника:
 * текущего альбома или активного плейлиста.
 */

import React, { useMemo, useSyncExternalStore } from 'react';

import {
    Pressable,
    SectionList,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, PlaybackControl, NavigationBar } from '../components';
import { libraryStore } from '../library/LibraryStore';

import { playbackController } from '../services/playbackController';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { formatError, useTranslation } from '../i18n';

/**
 * Строка списка треков для отображения.
 *
 * entryIndex — позиция в активном плейлисте; для плейлиста
 * все строки запускаются по нажатию через playPlaylistEntry,
 * включая строки без трека в медиатеке.
 */
interface TrackDisplayItem {
    id: string;
    playable: boolean;
    entryIndex?: number;
    title: string;
    duration: number;
}

interface TrackSection {
    title: string;
    data: TrackDisplayItem[];
    showHeader: boolean;
}

export default function TracksScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    /*
     * Подписываемся на изменения LibraryStore
     * и playbackController (pending/error при выборе трека):
     * без подписки на контроллер экран не перерисовался бы
     * при ошибке и сообщение не появлялось бы.
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

    const { t } = useTranslation();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * экран делится на левую и правую части.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;

    /*
     * Текущий альбом.
     */
    const currentAlbum = libraryStore.getCurrentAlbum();

    /*
     * Текущий трек.
     */
    const currentTrack = libraryStore.getCurrentTrack();

    /*
     * Активный источник воспроизведения
     * и строки активного плейлиста.
     */
    const playbackSource = libraryStore.getPlaybackSource();

    const playlistEntries =
        playbackSource === 'playlist'
            ? libraryStore.getPlaylistEntries()
            : null;

    /*
     * Треки активного источника: текущего альбома
     * или строки активного плейлиста.
     */
    const trackSections = useMemo<TrackSection[]>(() => {
        /*
         * Плейлист: строки плейлиста, включая треки вне
         * медиатеки. Все строки запускаются по нажатию:
         * сервер воспроизводит плейлист по индексу строки.
         */
        if (playlistEntries) {
            return [
                {
                    title: '',
                    showHeader: false,
                    data: playlistEntries.map((entry, index) => {
                        const track =
                            entry.trackId !== null
                                ? libraryStore.getTrack(entry.trackId)
                                : undefined;

                        return {
                            id: track?.id ?? `playlist-entry:${index}`,
                            playable: true,
                            entryIndex: index,
                            title: track?.title ?? entry.title ?? entry.path,
                            duration:
                                track?.duration ?? entry.durationSeconds ?? 0,
                        };
                    }),
                },
            ];
        }

        if (!currentAlbum) {
            return [];
        }

        const tracks = libraryStore.getTracks(currentAlbum.id);

        const discs = Object.values(currentAlbum.discs).sort(
            (discA, discB) => discA.number - discB.number,
        );

        const isMultiDisc = discs.length > 1;

        if (!isMultiDisc) {
            return [
                {
                    title: '',
                    showHeader: false,
                    data: tracks.map(track => ({
                        id: track.id,
                        playable: true,
                        title: track.title,
                        duration: track.duration,
                    })),
                },
            ];
        }

        return discs.map(disc => ({
            title: disc.name ?? '',
            showHeader: true,
            data: libraryStore
                .getDiscTracks(currentAlbum.id, disc.number)
                .map(track => ({
                    id: track.id,
                    playable: true,
                    title: track.title,
                    duration: track.duration,
                })),
        }));
    }, [currentAlbum, playlistEntries]);

    const selectionPending = playbackController.isPending();

    const selectionError = playbackController.getError();

    /**
     * Форматирует продолжительность трека.
     *
     * Например:
     * 65  -> 1:05
     * 245 -> 4:05
     */
    const formatDuration = (duration: number): string => {
        const totalSeconds = Math.max(0, Math.floor(duration));

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    /**
     * Один трек.
     */
    const renderTrack = ({
        item,
        index,
    }: {
        item: TrackDisplayItem;
        index: number;
    }) => {
        const selected =
            item.id === currentTrack?.id ||
            (playlistEntries !== null &&
                libraryStore.getCurrentTrackIndex() === index);

        return (
            <Pressable
                style={[
                    styles.trackItem,
                    selected && { backgroundColor: theme.highLighting },
                    selectionPending && styles.disabledTrackItem,
                ]}
                onPress={() => {
                    if (playlistEntries !== null) {
                        const entryIndex = item.entryIndex ?? index;

                        if (entryIndex >= 0) {
                            playbackController.playPlaylistEntry(entryIndex);
                        }
                    } else if (item.playable) {
                        playbackController.playTrack(item.id);
                    }
                }}
                disabled={selectionPending || !item.playable}
                accessibilityRole="button"
                accessibilityLabel={t('library.selectTrack', {
                    title: item.title,
                })}
            >
                <View style={styles.trackNumberContainer}>
                    <AppText
                        style={[
                            styles.trackNumber,
                            { color: theme.textPrimary },
                            selected && [
                                styles.selectedTrackText,
                                { color: theme.onHighlight },
                            ],
                        ]}
                    >
                        {index + 1}
                    </AppText>
                </View>

                <View style={styles.trackTitleContainer}>
                    <AppText
                        style={[
                            styles.trackTitle,
                            { color: theme.textPrimary },
                            selected && [
                                styles.selectedTrackText,
                                { color: theme.onHighlight },
                            ],
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.title}
                    </AppText>
                </View>

                <AppText
                    style={[
                        styles.trackDuration,
                        { color: theme.textSecondary },
                        selected && [
                            styles.selectedTrackText,
                            { color: theme.onHighlight },
                        ],
                    ]}
                >
                    {formatDuration(item.duration)}
                </AppText>
            </Pressable>
        );
    };

    const renderSectionHeader = ({ section }: { section: TrackSection }) => {
        if (!section.showHeader) {
            return null;
        }

        return (
            <AppText
                style={[
                    styles.discSubtitle,
                    {
                        color: theme.textPrimary,
                        backgroundColor: theme.backgroundTitle,
                    },
                ]}
            >
                {section.title}
            </AppText>
        );
    };

    /*
     * Список треков: одинаков для портретной
     * и ландшафтной разметки.
     */
    const tracksList = (
        <>
            <SectionList
                sections={trackSections}
                keyExtractor={item => item.id}
                renderItem={renderTrack}
                renderSectionHeader={renderSectionHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            {(selectionPending || selectionError) && (
                <AppText
                    style={[
                        selectionPending && !selectionError
                            ? styles.pendingText
                            : styles.selectionError,
                        { color: theme.textSecondary },
                    ]}
                >
                    {selectionPending && !selectionError
                        ? t('playback.commandPending')
                        : selectionError
                        ? formatError(selectionError, t)
                        : null}
                </AppText>
            )}
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
                         * Левая часть: только список треков.
                         */}
                        <View style={styles.tracksPane}>{tracksList}</View>

                        {/*
                         * Правая часть: настройки, плеер
                         * и navigation bar.
                         */}
                        <View style={styles.playerPane}>
                            <View style={styles.playerArea}>
                                <PlaybackControl layout="stacked" />
                            </View>

                            <NavigationBar active="tracks" />
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
                <View style={styles.tracksList}>{tracksList}</View>
                <View style={styles.playbackContainer}>
                    <PlaybackControl />
                </View>

                <NavigationBar active="tracks" />
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    tracksList: {
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
     * Левая колонка — только список треков.
     */
    tracksPane: {
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

    listContent: {
        paddingTop: 8,
        paddingBottom: 20,
    },

    discSubtitle: {
        ...typography.menu,
        color: colors.textSecondary,
        backgroundColor: colors.backgroundTitle,
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },

    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingHorizontal: 8,
        borderRadius: 8,
    },

    trackNumberContainer: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    trackNumber: {
        ...typography.smallText2,
    },

    trackTitleContainer: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },

    trackTitle: {
        ...typography.smallText,
    },

    trackDuration: {
        ...typography.smallText2,
        marginLeft: 12,
        minWidth: 42,
        textAlign: 'right',
    },

    selectedTrackText: {
        fontWeight: '700',
    },

    playbackContainer: {
        marginTop: 20,
    },

    disabledTrackItem: {
        opacity: 0.6,
    },

    selectionError: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 8,
    },

    pendingText: {
        ...typography.menu,
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 8,
    },
});
