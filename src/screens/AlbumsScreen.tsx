/**
 * @file AlbumsScreen.tsx
 * @description Экран альбомов.
 *
 * Выбор альбома и загрузка обложек делегированы
 * playbackController и albumArtService.
 */

import React, {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    FlatList,
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
    AppText,
    PlaybackControl,
    NavigationBar,
} from '../components';
import { libraryStore } from '../library/LibraryStore';

import { LibraryAlbum } from '../library/types';

import { albumArtService } from '../services/albumArtService';

import { playbackController } from '../services/playbackController';

import { colors } from '../theme/colors';

import { typography } from '../theme/typography';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { formatError, useTranslation } from '../i18n';

const NO_ALBUM_ART = require('../assets/images/no-album-art.jpg');

export default function AlbumsScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * экран делится на левую и правую части, сетка
     * альбомов занимает только левую часть.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;

    const { t } = useTranslation();

    const horizontalPadding = 16;
    const imagePadding = 6;

    /*
     * В ландшафте сетка альбомов размещается
     * в левой колонке шириной 40% экрана.
     */
    const listWidth = isLandscape ? screenWidth * 0.4 : screenWidth;

    const cardWidth = (listWidth - horizontalPadding * 2) / 3;

    const albumWidth = cardWidth - imagePadding * 2;

    /*
     * Подписываемся на изменения LibraryStore
     * и playbackController (pending/error при выборе альбома).
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
     * Текущий выбранный жанр.
     */
    const selectedGenreId = libraryStore.getSelectedGenreId();

    /*
     * Текущий выбранный артист.
     */
    const selectedArtistId = libraryStore.getSelectedArtistId();

    /*
     * Объекты выбранного жанра и артиста.
     */
    const selectedGenre =
        selectedGenreId !== null
            ? libraryStore.getGenre(selectedGenreId)
            : undefined;

    const selectedArtist =
        selectedArtistId !== null
            ? libraryStore.getArtist(selectedArtistId)
            : undefined;

    /*
     * Альбомы с учетом текущего выбора: genre + artist.
     */
    const albums = libraryStore.getSelectedAlbums();

    const currentPlayback = libraryStore.getCurrentPlayback();

    const currentAlbumId = currentPlayback?.currentAlbumId ?? null;

    const selectionPending = playbackController.isPending();

    const selectionError = playbackController.getError();

    /*
     * Изображения альбомов, готовые к отображению:
     * ID альбома → file:// путь в кэше приложения.
     */
    const [albumImages, setAlbumImages] = useState<Record<string, string>>({});

    const albumsKey = albums.map(album => album.id).join('|');

    /*
     * Загружаем изображения альбомов через общий кэш
     * при изменении набора альбомов.
     */
    useEffect(() => {
        let cancelled = false;

        const albumsToLoad = libraryStore.getSelectedAlbums();

        /*
         * Сначала показываем все обложки, которые уже в кэше,
         * затем дозагружаем отсутствующие.
         */
        const cachedImages = albumsToLoad.reduce<Record<string, string>>(
            (result, album) => {
                const cachedImage = albumArtService.getCached(album.id);

                if (cachedImage) {
                    result[album.id] = cachedImage;
                }

                return result;
            },
            {},
        );

        setAlbumImages(cachedImages);

        albumArtService.warmup(
            albumsToLoad.map(album => album.id),
            (albumId, imageUri) => {
                if (!cancelled) {
                    setAlbumImages(currentImages => ({
                        ...currentImages,
                        [albumId]: imageUri,
                    }));
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [albumsKey]);

    /**
     * Формирует заголовок текущего выбора.
     *
     * Примеры:
     *
     * All genres - All artists
     * Rock - All artists
     * Rock - Pink Floyd
     */
    const contextTitle = `${selectedGenre?.name ?? t('library.allGenres')} - ${
        selectedArtist?.name ?? t('library.allArtists')
    }`;

    /**
     * Один альбом.
     */
    const renderAlbum = useCallback(
        ({ item }: { item: LibraryAlbum }) => {
            const imageUri = albumImages[item.id];
            const selected = item.id === currentAlbumId;

            return (
                <Pressable
                    style={[
                        styles.albumCard,
                        {
                            width: cardWidth,
                        },
                        selected && {
                            backgroundColor: theme.highLighting,
                        },
                        selectionPending && styles.disabledAlbumCard,
                    ]}
                    onPress={() => {
                        playbackController.selectAlbum(item.id);
                    }}
                    disabled={selectionPending}
                    accessibilityRole="button"
                    accessibilityLabel={t('library.selectAlbum', {
                        title: item.title,
                    })}
                >
                    <View style={styles.albumImageContainer}>
                        <Image
                            source={imageUri ? { uri: imageUri } : NO_ALBUM_ART}
                            style={[
                                styles.albumImage,
                                {
                                    width: albumWidth,
                                    height: albumWidth,
                                },
                            ]}
                            resizeMode="cover"
                        />
                    </View>
                    <View
                        style={[
                            styles.albumTextContainer,
                            { width: albumWidth },
                        ]}
                    >
                        <AppText
                            style={[
                                styles.albumTitle,
                                { color: theme.textPrimary },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {item.title}
                        </AppText>

                        <AppText
                            style={[
                                styles.albumArtist,
                                { color: theme.textSecondary },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {item.artist}
                        </AppText>
                    </View>
                </Pressable>
            );
        },
        [
            albumImages,
            albumWidth,
            cardWidth,
            currentAlbumId,
            selectionPending,
            theme,
            t,
        ],
    );

    /*
     * Список альбомов: одинаков для портретной
     * и ландшафтной разметки.
     */
    const albumsList = (
        <>
            <FlatList
                data={albums}
                extraData={albumImages}
                keyExtractor={item => item.id}
                renderItem={renderAlbum}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />

            {selectionError && (
                <AppText
                    style={[
                        styles.albumSelectionError,
                        { color: theme.textSecondary },
                    ]}
                >
                    {formatError(selectionError, t)}
                </AppText>
            )}
        </>
    );

    /*
     * Верхняя строка: текущий жанр и артист,
     * кнопка настроек.
     */
    const topBar = (
        <View style={styles.topBar}>
            <View
                style={[
                    styles.selectedGenreArtistNameContainer,
                    { backgroundColor: theme.backgroundTitle },
                ]}
            >
                <AppText
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                        typography.smallText2,
                        { color: theme.textPrimary },
                    ]}
                >
                    {contextTitle}
                </AppText>
            </View>
        </View>
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
                         * Левая часть: только сетка альбомов.
                         */}
                        <View style={styles.albumsPane}>{albumsList}</View>

                        {/*
                         * Правая часть: жанр, артист и настройки,
                         * плеер и navigation bar.
                         */}
                        <View style={styles.playerPane}>
                            {topBar}

                            <View style={styles.playerArea}>
                                <PlaybackControl layout="stacked" />
                            </View>

                            <NavigationBar active="albums" />
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
                {/*
                 * Текущий жанр и артист.
                 */}
                {topBar}

                <View style={styles.albumsList}>{albumsList}</View>
                <View style={styles.playbackContainer}>
                    <PlaybackControl />
                </View>

                <NavigationBar active="albums" />
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    selectedGenreArtistNameContainer: {
        flex: 1,
        height: 36,
        backgroundColor: colors.backgroundTitle,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },

    settingsButton: {
        marginLeft: 8,
    },

    albumsList: {
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
     * Левая колонка — только сетка альбомов.
     */
    albumsPane: {
        width: '40%',
        paddingHorizontal: 16,
    },

    /*
     * Правая колонка — жанр, артист, плеер
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
        paddingTop: 12,
        paddingBottom: 12,
    },

    albumCard: {
        marginBottom: 20,
    },
    albumImage: {
        borderRadius: 4,
    },

    albumTitle: {
        ...typography.smallText,
        fontSize: 13,
    },

    albumArtist: {
        ...typography.smallText2,
        fontSize: 13,
        marginTop: 1,
    },

    disabledAlbumCard: {
        opacity: 0.6,
    },

    albumImageContainer: {
        padding: 6,
    },

    albumTextContainer: {
        marginTop: 2,
        marginHorizontal: 6,
    },

    playbackContainer: {
        marginTop: 20,
    },

    albumSelectionError: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginVertical: 8,
    },
});
