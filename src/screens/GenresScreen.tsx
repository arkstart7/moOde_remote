/**
 * @file GenresScreen.tsx
 * @description Экран жанров.
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

import { SafeAreaView } from 'react-native-safe-area-context';import {
    NavigationBar,
    PlaybackControl,
    AppText,
} from '../components';
import { libraryStore } from '../library/LibraryStore';

import { LibraryGenre } from '../library/types';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { typography } from '../theme/typography';

import { useTranslation } from '../i18n';

export default function GenresScreen() {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    /*
     * Подписываемся на изменения LibraryStore.
     *
     * При изменении жанра, артиста, Library
     * или CurrentPlayback React повторно
     * отрендерит экран.
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

    const selectedGenreId = libraryStore.getSelectedGenreId();

    const genres = libraryStore.getGenres();

    const handleSelectGenre = useCallback((genreId: string | null) => {
        libraryStore.setSelectedGenreId(genreId);
    }, []);

    const renderGenre = ({ item }: { item: LibraryGenre }) => {
        const selected = item.id === selectedGenreId;

        return (
            <Pressable
                style={[
                    styles.item,
                    selected && { backgroundColor: theme.highLighting },
                ]}
                onPress={() => handleSelectGenre(item.id)}
                accessibilityRole="button"
                accessibilityLabel={t('library.genre', {
                    name: item.name,
                })}
            >
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
                    {item.name}
                </AppText>

                <Text style={[styles.count, { color: theme.textSecondary }]}>
                    {item.albumIds.length}
                </Text>
            </Pressable>
        );
    };

    const allGenresSelected = selectedGenreId === null;

    const allAlbumsCount = libraryStore.getAllAlbums().length;

    /*
     * Список жанров: одинаков для портретной
     * и ландшафтной разметки.
     */
    const genresList = (
        <>
            <Pressable
                style={[
                    styles.item,
                    allGenresSelected && {
                        backgroundColor: theme.highLighting,
                    },
                ]}
                onPress={() => handleSelectGenre(null)}
                accessibilityRole="button"
                accessibilityLabel={t('library.allGenres')}
            >
                <AppText
                    style={[
                        styles.title,
                        { color: theme.textPrimary },
                        allGenresSelected && [
                            styles.selectedTitle,
                            { color: theme.onHighlight },
                        ],
                    ]}
                >
                    {t('library.allGenres')}
                </AppText>

                <Text style={[styles.count, { color: theme.textSecondary }]}>
                    {allAlbumsCount}
                </Text>
            </Pressable>

            <FlatList
                data={genres}
                keyExtractor={item => item.id}
                renderItem={renderGenre}
                showsVerticalScrollIndicator={false}
            />
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
                         * Левая часть: только список жанров.
                         */}
                        <View style={styles.genresPane}>{genresList}</View>

                        {/*
                         * Правая часть: настройки, плеер
                         * и navigation bar.
                         */}
                        <View style={styles.playerPane}>
                            <View style={styles.playerArea}>
                                <PlaybackControl layout="stacked" />
                            </View>

                            <NavigationBar active="genres" />
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
                <View style={styles.listContainer}>{genresList}</View>
                <View style={styles.playbackContainer}>
                    <PlaybackControl />
                </View>

                <NavigationBar active="genres" />
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
     * Левая колонка — только список жанров.
     */
    genresPane: {
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
        justifyContent: 'space-between',
        minHeight: 48,
        paddingHorizontal: 16,
        borderRadius: 8,
    },

    title: {
        ...typography.smallText,
    },

    selectedTitle: {
        fontWeight: '600',
    },

    count: {
        fontSize: 14,
    },

    playbackContainer: {
        marginTop: 20,
    },
});
