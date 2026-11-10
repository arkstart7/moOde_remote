/**
 * @file PlaybackControl.tsx
 * @description
 * Компактный блок управления текущим воспроизведением.
 *
 * Логика воспроизведения находится в playbackController;
 * опрос запускается, пока компонент на сфокусированном экране.
 */

import React, {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

import { Image, Pressable, StyleSheet, View } from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText, NextIcon, PauseIcon, PlayIcon, PreviousIcon } from './';

import { typography } from '../theme/typography';

import { colors } from '../theme/colors';

import { libraryStore } from '../library/LibraryStore';

import { albumArtService } from '../services/albumArtService';

import { playbackController } from '../services/playbackController';

import { useTranslation } from '../i18n';

import { RootStackParamList } from '../types/navigation';

import ProgressBar from './ProgressBar';

const NO_ALBUM_ART = require('../assets/images/no-album-art.jpg');

const PLAYLIST_ART = require('../assets/images/playlist.jpg');

type PlaybackControlProps = {
    /*
     * 'row' (по умолчанию) — компактная строка:
     * обложка, подписи и кнопки в один ряд.
     *
     * 'stacked' — вертикальный блок для ландшафта:
     * обложка и подписи в ряд, кнопки ниже.
     */
    layout?: 'row' | 'stacked';
};

export default function PlaybackControl({
    layout = 'row',
}: PlaybackControlProps) {
    const stacked = layout === 'stacked';

    /*
     * Подписываемся на LibraryStore (трек, альбом, время)
     * и на playbackController (состояние воспроизведения).
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

    /*
     * Опрос активен, пока экран с блоком управления виден.
     * Контроллер не создает второй цикл, если другой экран
     * уже опрашивает сервер.
     */
    useFocusEffect(useCallback(() => playbackController.acquirePolling(), []));

    const currentAlbum = libraryStore.getCurrentAlbum();

    const currentTrack = libraryStore.getCurrentTrack();

    /*
     * Строка плейлиста текущего трека. Для треков вне медиатеки
     * (например, треки из .cue-файлов) currentTrack === null,
     * но метаданные есть в самой строке плейлиста.
     */
    const playlistEntry = libraryStore.getCurrentPlaylistEntry();

    const playbackState = playbackController.getPlaybackState();

    const playbackPending = playbackController.isPending();

    const { t } = useTranslation();

    const navigation =
        useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    /*
     * Тап по обложке или подписям трека открывает Главный экран.
     */
    const openMain = useCallback(
        () => navigation.navigate('Main'),
        [navigation],
    );

    /*
     * Обложка текущего альбома через общий кэш.
     */
    const [albumImage, setAlbumImage] = useState<string | null>(null);

    const currentAlbumId = currentAlbum?.id ?? null;

    useEffect(() => {
        let cancelled = false;

        setAlbumImage(null);

        if (!currentAlbumId) {
            return;
        }

        albumArtService.getAlbumImage(currentAlbumId).then(imageUri => {
            if (!cancelled && imageUri) {
                setAlbumImage(imageUri);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [currentAlbumId]);

    /*
     * Позиция активного источника: getCurrentTime()
     * учитывает источник — время альбома или плейлиста.
     */
    const currentTime = libraryStore.getCurrentTime();

    const duration =
        currentTrack?.duration ?? playlistEntry?.durationSeconds ?? 0;

    const progress =
        duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

    const trackIndex = libraryStore.getCurrentTrackIndex();

    const activeTrackCount = libraryStore.getActiveTrackCount();

    const previousTrackDisabled = playbackPending || trackIndex <= 0;

    const nextTrackDisabled =
        playbackPending || trackIndex < 0 || trackIndex >= activeTrackCount - 1;

    /*
     * Обложка: кэш альбома, либо изображение плейлиста,
     * когда активным источником является плейлист.
     */
    const coverSource =
        albumImage !== null
            ? { uri: albumImage }
            : libraryStore.getPlaybackSource() === 'playlist'
            ? PLAYLIST_ART
            : NO_ALBUM_ART;

    /*
     * Кнопки управления плеером: общие
     * для обоих вариантов разметки.
     */
    const controls = (
        <>
            <Pressable
                onPress={() => {
                    playbackController.selectTrack('previous');
                }}
                disabled={previousTrackDisabled}
                style={previousTrackDisabled && styles.disabledControl}
                accessibilityRole="button"
                accessibilityLabel={t('controls.previousTrack')}
                hitSlop={8}
            >
                <PreviousIcon />
            </Pressable>

            <Pressable
                onPress={() => {
                    playbackController.playPause();
                }}
                disabled={playbackPending}
                accessibilityRole="button"
                accessibilityLabel={
                    playbackState === 'playing'
                        ? t('controls.pause')
                        : t('controls.play')
                }
                hitSlop={8}
            >
                {playbackState === 'playing' ? <PauseIcon /> : <PlayIcon />}
            </Pressable>

            <Pressable
                onPress={() => {
                    playbackController.selectTrack('next');
                }}
                disabled={nextTrackDisabled}
                style={nextTrackDisabled && styles.disabledControl}
                accessibilityRole="button"
                accessibilityLabel={t('controls.nextTrack')}
                hitSlop={8}
            >
                <NextIcon />
            </Pressable>
        </>
    );

    return (
        <>
            <ProgressBar
                progress={progress}
                duration={duration}
                onSeek={playbackController.seek}
            />

            <View
                style={[
                    stacked ? styles.containerStacked : styles.container,
                    { backgroundColor: colors.highLighting },
                ]}
            >
                {stacked ? (
                    <>
                        {/*
                         * Обложка альбома и подписи в одном ряду.
                         */}
                        <View style={styles.infoRow}>
                            <Pressable
                                onPress={openMain}
                                accessibilityRole="button"
                                accessibilityLabel={t('menu.main')}
                            >
                                <View style={styles.imageContainerStacked}>
                                    <Image
                                        source={coverSource}
                                        resizeMode="contain"
                                        style={styles.imageStacked}
                                    />
                                </View>
                            </Pressable>

                            <Pressable
                                style={styles.titleStacked}
                                onPress={openMain}
                                accessibilityRole="button"
                                accessibilityLabel={t('menu.main')}
                            >
                                <AppText
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={styles.titleText}
                                >
                                    {currentTrack?.title ??
                                        playlistEntry?.title ??
                                        t('playback.unknownTrack')}
                                </AppText>

                                <AppText
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={typography.smallText}
                                >
                                    {currentTrack?.artist ??
                                        playlistEntry?.artist ??
                                        currentAlbum?.artist ??
                                        ''}
                                </AppText>

                                <AppText
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={typography.smallText}
                                >
                                    {currentAlbum?.title ??
                                        currentTrack?.album ??
                                        playlistEntry?.album ??
                                        ''}
                                </AppText>
                            </Pressable>
                        </View>

                        {/*
                         * Кнопки управления — отдельным рядом ниже.
                         */}
                        <View style={styles.iconsStacked}>{controls}</View>
                    </>
                ) : (
                    <>
                        {/*
                         * Обложка альбома.
                         */}
                        <Pressable
                            onPress={openMain}
                            accessibilityRole="button"
                            accessibilityLabel={t('menu.main')}
                        >
                            <View style={styles.imageContainer}>
                                <Image
                                    source={coverSource}
                                    resizeMode="contain"
                                    style={styles.image}
                                />
                            </View>
                        </Pressable>

                        {/*
                         * Название трека, исполнитель и альбом.
                         */}
                        <Pressable
                            style={styles.title}
                            onPress={openMain}
                            accessibilityRole="button"
                            accessibilityLabel={t('menu.main')}
                        >
                            <AppText
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={styles.titleText}
                            >
                                {currentTrack?.title ??
                                    playlistEntry?.title ??
                                    t('playback.unknownTrack')}
                            </AppText>

                            <AppText
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={typography.smallText}
                            >
                                {currentTrack?.artist ??
                                    playlistEntry?.artist ??
                                    currentAlbum?.artist ??
                                    ''}
                            </AppText>

                            <AppText
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                style={typography.smallText}
                            >
                                {currentAlbum?.title ??
                                    currentTrack?.album ??
                                    playlistEntry?.album ??
                                    ''}
                            </AppText>
                        </Pressable>

                        {/*
                         * Кнопки управления.
                         */}
                        <View style={styles.icons}>{controls}</View>
                    </>
                )}

            </View>
        </>
    );
}

const styles = StyleSheet.create({
    containerStacked: {
        flexDirection: 'column',
        paddingVertical: 8,
    },

    container: {
        flexDirection: 'row',
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    imageContainer: {
        height: 70,
        justifyContent: 'center',
    },

    imageContainerStacked: {
        justifyContent: 'center',
    },

    image: {
        aspectRatio: 1,
        height: '82%',
    },

    imageStacked: {
        aspectRatio: 1,
        width: 120,
        marginHorizontal: 12,
    },

    title: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: 8,
        justifyContent: 'center',
    },

    titleStacked: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        marginRight: 8,
    },

    titleText: {
        ...typography.smallText,
        fontWeight: '700',
    },

    icons: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconsStacked: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        paddingVertical: 12,
    },

    disabledControl: {
        opacity: 0.4,
    },
});
