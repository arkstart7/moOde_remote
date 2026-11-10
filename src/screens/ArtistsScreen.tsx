/**
 * @file ArtistsScreen.tsx
 * @description Экран исполнителей.
 */

import React, { useCallback, useSyncExternalStore } from 'react';

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
import {
    NavigationBar,
    PlaybackControl,
    AppText,
} from '../components';
import { libraryStore } from '../library/LibraryStore';

import { LibraryArtist } from '../library/types';

import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { useTranslation } from '../i18n';

export default function ArtistsScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    /*
     * Подписываемся на изменения LibraryStore.
     */
    useSyncExternalStore(
        libraryStore.subscribe,
        libraryStore.getSnapshot,
        libraryStore.getSnapshot,
    );

    const { t } = useTranslation();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * экран делится на левую и правую части.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;

    /*
     * Текущий выбранный жанр.
     *
     * null означает All genres.
     */
    const selectedGenreId = libraryStore.getSelectedGenreId();

    /*
     * Текущий выбранный артист.
     *
     * null означает All artists.
     */
    const selectedArtistId = libraryStore.getSelectedArtistId();

    /*
     * Получаем выбранный жанр.
     */
    const selectedGenre =
        selectedGenreId !== null
            ? libraryStore.getGenre(selectedGenreId)
            : undefined;

    /*
     * Получаем артистов с учетом
     * выбранного жанра.
     */
    const artists = libraryStore.getSelectedArtists();

    /**
     * Выбор артиста.
     *
     * Перехода на другой экран нет.
     */
    const handleSelectArtist = useCallback((artistId: string | null) => {
        libraryStore.setSelectedArtistId(artistId);
    }, []);

    /**
     * Количество альбомов артиста
     * в текущем контексте выбранного жанра.
     */
    const getAlbumCount = useCallback(
        (artist: LibraryArtist): number => {
            /*
             * Если жанр не выбран,
             * используем общее количество
             * альбомов артиста.
             */
            if (!selectedGenreId) {
                return artist.albumIds.length;
            }

            /*
             * Получаем альбомы текущего жанра.
             */
            const artistAlbumIds = new Set(artist.albumIds);

            return libraryStore
                .getAlbumsByGenre(selectedGenreId)
                .filter(album => artistAlbumIds.has(album.id)).length;
        },
        [selectedGenreId],
    );

    /**
     * All artists.
     */
    const renderAllArtists = () => {
        const selected = selectedArtistId === null;

        return (
            <Pressable
                style={[
                    styles.item,
                    selected && { backgroundColor: theme.highLighting },
                ]}
                onPress={() => handleSelectArtist(null)}
                accessibilityRole="button"
                accessibilityLabel={t('library.allArtists')}
            >
                <View style={styles.titleContainer}>
                    <AppText
                        style={[
                            styles.title,
                            { color: theme.textPrimary },
                            selected && [
                                styles.selectedTitle,
                                { color: theme.onHighlight },
                            ],
                        ]}
                    >
                        {t('library.allArtists')}
                    </AppText>
                </View>

                <AppText style={[styles.count, { color: theme.textSecondary }]}>
                    {artists.length}
                </AppText>
            </Pressable>
        );
    };

    /**
     * Один артист.
     */
    const renderArtist = ({ item }: { item: LibraryArtist }) => {
        const selected = item.id === selectedArtistId;

        const albumCount = getAlbumCount(item);

        return (
            <Pressable
                style={[
                    styles.item,
                    selected && { backgroundColor: theme.highLighting },
                ]}
                onPress={() => handleSelectArtist(item.id)}
                accessibilityRole="button"
                accessibilityLabel={t('library.artist', {
                    name: item.name,
                })}
            >
                <View style={styles.titleContainer}>
                    <AppText
                        style={[
                            styles.title,
                            { color: theme.textPrimary },
                            selected && [
                                styles.selectedTitle,
                                { color: theme.onHighlight },
                            ],
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {item.name}
                    </AppText>
                </View>

                <Text style={[styles.count, { color: theme.textSecondary }]}>
                    {albumCount}
                </Text>
            </Pressable>
        );
    };

    /*
     * Список исполнителей: одинаков для портретной
     * и ландшафтной разметки.
     */
    const artistsList = (
        <>
            {renderAllArtists()}

            <FlatList
                data={artists}
                keyExtractor={item => item.id}
                renderItem={renderArtist}
                showsVerticalScrollIndicator={false}
            />
        </>
    );

    /*
     * Верхняя строка: выбранный жанр и кнопка настроек.
     */
    const topBar = (
        <View style={styles.topBar}>
            <View
                style={[
                    styles.selectedGenreNameContainer,
                    { backgroundColor: theme.backgroundTitle },
                ]}
            >
                <AppText
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                        typography.smallText2,
                        { color: theme.textSecondary },
                    ]}
                >
                    {selectedGenre
                        ? selectedGenre.name
                        : t('library.allGenres')}
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
                         * Левая часть: только список исполнителей.
                         */}
                        <View style={styles.artistsPane}>{artistsList}</View>

                        {/*
                         * Правая часть: жанр и настройки,
                         * плеер и navigation bar.
                         */}
                        <View style={styles.playerPane}>
                            {topBar}

                            <View style={styles.playerArea}>
                                <PlaybackControl layout="stacked" />
                            </View>

                            <NavigationBar active="artists" />
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
                 * Текущий жанр.
                 */}
                {topBar}

                <View style={styles.listContainer}>{artistsList}</View>
                <View style={styles.playbackContainer}>
                    <PlaybackControl />
                </View>

                <NavigationBar active="artists" />
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

    selectedGenreNameContainer: {
        flex: 1,
        height: 36,
        backgroundColor: colors.backgroundTitle,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },

    titleContainer: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
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
     * Левая колонка — только список исполнителей.
     */
    artistsPane: {
        width: '40%',
        paddingHorizontal: 16,
    },

    /*
     * Правая колонка — жанр, плеер
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

    title: {
        ...typography.smallText,
    },

    selectedTitle: {
        fontWeight: '700',
    },

    count: {
        ...typography.smallText2,
        marginLeft: 12,
    },

    playbackContainer: {
        marginTop: 20,
    },
});
