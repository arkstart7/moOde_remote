/**
 * @file MainScreen.tsx
 * @description Главный экран.
 *
 * Вся логика воспроизведения (опрос, команды, громкость)
 * находится в playbackController. Экран только подписывается
 * на состояние и вызывает действия контроллера.
 */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import {
    AppText,
    BeefwebWaveformSlider,
    NextIconLarge,
    PauseIconLarge,
    PlayIconLarge,
    PreviousIcon,
    PreviousIconLarge,
    SettingsIcon,
    VolumeSlider,
} from '../components';

import { libraryStore } from '../library/LibraryStore';

import { albumArtService } from '../services/albumArtService';

import { playbackController } from '../services/playbackController';

import { formatError, useTranslation } from '../i18n';

import { colors } from '../theme/colors';

import { typography } from '../theme/typography';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { RootStackParamList } from '../types/navigation';

const NO_ALBUM_ART = require('../assets/images/no-album-art.jpg');

const PLAYLIST_ART = require('../assets/images/playlist.jpg');

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function MainScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    const navigation = useNavigation<Navigation>();

    const { t } = useTranslation();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * экран делится на левую и правую части.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;

    /*
     * Подписываемся на LibraryStore (альбом, трек, время)
     * и на playbackController (состояние, громкость, ошибки).
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
     * Опрос запускается, пока экран в фокусе.
     * Контроллер сам следит, чтобы цикл был один
     * на все подписанные экраны.
     */
    useFocusEffect(useCallback(() => playbackController.acquirePolling(), []));

    /*
     * ========================================================
     * Current Playback
     * ========================================================
     */

    /*
     * Активный источник воспроизведения:
     * альбом или плейлист.
     */
    const playbackSource = libraryStore.getPlaybackSource();

    const currentAlbum = libraryStore.getCurrentAlbum();

    const currentTrack = libraryStore.getCurrentTrack();

    /*
     * Строка плейлиста текущего трека. Для треков вне медиатеки
     * (например, из .cue-файлов) currentTrack === undefined,
     * но метаданные есть в самой строке плейлиста.
     */
    const playlistEntry = libraryStore.getCurrentPlaylistEntry();

    const playbackState = playbackController.getPlaybackState();

    const playbackPending = playbackController.isPending();

    const playbackError = playbackController.getError();

    const volumeLevel = playbackController.getVolumeLevel();

    const isMuted = playbackController.isMuted();

    const volumeReady = playbackController.isVolumeReady();

    /*
     * ========================================================
     * Album image
     * ========================================================

     * Загрузка обложки идет через albumArtService с общим кэшем.
     */
    const [albumImage, setAlbumImage] = useState<string | null>(null);

    const currentAlbumId = currentAlbum?.id ?? null;
    const currentAlbumArtist =
        currentAlbum?.artist ?? playlistEntry?.artist ?? '';
    const currentAlbumTitle = currentAlbum?.title ?? playlistEntry?.album ?? '';

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
     * ========================================================
     * Track information
     * ========================================================
     */

    /*
     * Позиция активного источника: getCurrentTime()
     * учитывает источник — время альбома или плейлиста.
     */
    const currentTime = libraryStore.getCurrentTime();

    const trackIndex = libraryStore.getCurrentTrackIndex();

    /*
     * Количество треков активного источника:
     * текущего альбома или активного плейлиста.
     */
    const totalTracks = libraryStore.getActiveTrackCount();

    const previousTrackDisabled = playbackPending || trackIndex <= 0;

    const nextTrackDisabled =
        playbackPending ||
        totalTracks === 0 ||
        trackIndex < 0 ||
        trackIndex >= totalTracks - 1;

    /*
     * На обложке остался только горизонтальный свайп
     * (переключение трека). Вертикальное движение жест
     * не активирует.
     */
    const coverSwipeGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetX([-50, 50])
                .failOffsetY([-50, 50])
                .runOnJS(true)
                .onEnd(event => {
                    playbackController.selectTrack(
                        event.translationX > 0 ? 'previous' : 'next',
                    );
                }),
        [],
    );

    /*
     * Кнопка Назад: возвращает на предыдущий экран стека.
     * Если назад идти некуда (Main — единственный экран после
     * Start), кнопка не показывается.
     */
    const canGoBack = navigation.canGoBack();

    const backButton = canGoBack ? (
        <Pressable
            style={styles.backButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={() => navigation.goBack()}
        >
            <PreviousIcon color={theme.textPrimary} />

            <AppText
                style={[
                    typography.navigationTitle,
                    { color: theme.textPrimary },
                ]}
            >
                {t('common.back')}
            </AppText>
        </Pressable>
    ) : null;

    /*
     * Шапка с кнопкой настроек.
     */
    const settingsButton = (
        <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.settings')}
            onPress={() => navigation.navigate('Settings', {})}
        >
            <SettingsIcon color={theme.textPrimary} />
        </Pressable>
    );
    const settingsHeader = (
        <View style={styles.header}>
            {backButton}

            {settingsButton}
        </View>
    );

    /*
     * Обложка альбома: одинакова для портретной
     * и ландшафтной разметки.
     */
    const albumCover = (
        <GestureDetector gesture={coverSwipeGesture}>
            <View style={styles.coverImageContainer}>
                <Image
                    source={
                        albumImage
                            ? { uri: albumImage }
                            : playbackSource === 'playlist'
                            ? PLAYLIST_ART
                            : NO_ALBUM_ART
                    }
                    style={styles.coverImage}
                    resizeMode="contain"
                />
            </View>
        </GestureDetector>
    );

    /*
     * Название трека, исполнителя и альбома.
     */
    const trackInfo = (
        <View
            style={[
                styles.coverTitle,
                isLandscape && styles.trackInfoLandscape,
            ]}
        >
            <AppText
                style={[typography.boldText, { color: theme.textPrimary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {currentTrack?.title ?? playlistEntry?.title ?? ''}
            </AppText>

            <AppText
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {currentTrack?.artist ?? currentAlbumArtist ?? ''}
            </AppText>

            <AppText
                style={{ color: theme.textSecondary }}
                numberOfLines={1}
                ellipsizeMode="tail"
            >
                {currentAlbumTitle}
            </AppText>
        </View>
    );

    /*
     * Прогресс-бар с цифрами времени под ним.
     */
    const progressBlock = (
        <BeefwebWaveformSlider
            trackId={currentTrack?.id ?? ''}
            currentTime={currentTime}
            duration={
                currentTrack?.duration ?? playlistEntry?.durationSeconds ?? 0
            }
            trackIndex={trackIndex}
            totalTracks={totalTracks}
            onSeek={playbackController.seek}
        />
    );

    /*
     * Громкость и кнопки управления.
     */
    const playerControls = (
        <View style={styles.coverControl}>
            <VolumeSlider
                volumeLevel={volumeLevel}
                isMuted={isMuted}
                ready={volumeReady}
                onVolumeChange={playbackController.previewVolume}
                onVolumeCommit={playbackController.commitVolume}
                onMuteToggle={playbackController.toggleMute}
            />

            <View style={styles.coverPlaybackControl}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('controls.previousTrack')}
                    onPress={() => {
                        playbackController.selectTrack('previous');
                    }}
                    disabled={previousTrackDisabled}
                    style={previousTrackDisabled && styles.disabledControl}
                >
                    <PreviousIconLarge />
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                        playbackState === 'playing'
                            ? t('controls.pauseTrack')
                            : t('controls.playTrack')
                    }
                    onPress={() => {
                        playbackController.playPause();
                    }}
                    disabled={playbackPending}
                >
                    {playbackState === 'playing' ? (
                        <PauseIconLarge />
                    ) : (
                        <PlayIconLarge />
                    )}
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('controls.nextTrack')}
                    onPress={() => {
                        playbackController.selectTrack('next');
                    }}
                    disabled={nextTrackDisabled}
                    style={nextTrackDisabled && styles.disabledControl}
                >
                    <NextIconLarge />
                </Pressable>
            </View>
        </View>
    );

    /*
     * Ошибка воспроизведения.
     */
    const playbackErrorBlock = playbackError ? (
        <AppText style={[styles.playbackError, { color: theme.textSecondary }]}>
            {formatError(playbackError, t)}
        </AppText>
    ) : null;

    /*
     * Ландшафтная разметка: обложка слева,
     * плеер и navigation bar справа.
     */
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
                        <View style={styles.coverPane}>{albumCover}</View>

                        <View style={styles.controlsPane}>
                            <View style={styles.trackInfoRowLandscape}>
                                {backButton}

                                {trackInfo}

                                {settingsButton}
                            </View>

                            {progressBlock}

                            <View style={styles.playerArea}>
                                {playerControls}

                                {playbackErrorBlock}
                            </View>
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
                {settingsHeader}

                <View style={styles.screen}>
                    {albumCover}

                    <View style={styles.lowerHalf}>
                        {trackInfo}

                        {progressBlock}

                        {playerControls}

                        {playbackErrorBlock}
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    /*
     * Доступная область экрана.
     */
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    /*
     * Шапка с кнопкой настроек — под статус-баром,
     * над обложкой, прижата к правому краю.
     */
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        marginBottom: 16,
    },

    /*
     * Обложка альбома.
     */
    coverImageContainer: {
        width: '85%',
        aspectRatio: 1,
    },

    coverImage: {
        width: '100%',
        height: '100%',
    },

    /*
     * Основной блок экрана.
     */
    screen: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    /*
     * Всё ниже обложки.
     */
    lowerHalf: {
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
    },

    /*
     * Название трека, артиста и альбома.
     */
    coverTitle: {
        width: '90%',
        paddingBottom: 20,
        alignItems: 'center',
    },

    /*
     * Блок управления громкостью
     * и воспроизведением.
     */
    coverControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        marginHorizontal: 10,
        backgroundColor: colors.highLighting,
        width: '100%',
    },

    /*
     * Prev / Play / Next.
     */
    coverPlaybackControl: {
        width: '50%',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },

    playbackError: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },

    disabledControl: {
        opacity: 0.4,
    },

    /*
     * Ландшафтная разметка: обложка слева,
     * плеер справа.
     */
    landscape: {
        flex: 1,
        flexDirection: 'row',
    },

    coverPane: {
        width: '40%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },

    controlsPane: {
        flex: 1,
    },

    trackInfoLandscape: {
        alignItems: 'flex-start',
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 0,
    },

    /*
     * Строка с текстом трека и иконкой настроек
     * в ландшафте.
     */
    trackInfoRowLandscape: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 16,
    },

    playerArea: {
        flex: 1,
        justifyContent: 'center',
    },
});
