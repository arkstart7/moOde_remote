/**
 * @file RootNavigator.tsx
 * @description
 * Главный навигатор приложения.
 *
 * При запуске сразу открывает StartScreen.
 *
 * StartScreen выполняет первоначальную инициализацию:
 *
 * Start
 *   ↓
 * Settings validation
 *   ↓
 * Library loading
 *   ↓
 * Playlist loading
 *   ↓
 * Main
 */

import React from 'react';

import { NavigationContainer } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
    StartScreen,
    MainScreen,
    GenresScreen,
    ArtistsScreen,
    AlbumsScreen,
    TracksScreen,
    PlaylistScreen,
    SettingsScreen,
} from '../screens';

import { RootStackParamList } from '../types/navigation';

import { lightColors, darkColors } from '../theme/colors';

import { typography } from '../theme/typography';

import { useResolvedTheme } from '../theme/useTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    const resolvedTheme = useResolvedTheme();

    const palette = resolvedTheme === 'light' ? lightColors : darkColors;

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    initialRouteName="Start"
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    {/*
                     * ==================================================
                     * Start
                     * ==================================================
                     *
                     * Стартовый экран всегда показывается
                     * первым.
                     */}

                    <Stack.Screen name="Start" component={StartScreen} />

                    {/*
                     * ==================================================
                     * Main
                     * ==================================================
                     */}

                    <Stack.Screen name="Main" component={MainScreen} />

                    {/*
                     * ==================================================
                     * Library screens
                     * ==================================================
                     */}

                    <Stack.Screen name="Genres" component={GenresScreen} />

                    <Stack.Screen name="Artists" component={ArtistsScreen} />

                    <Stack.Screen name="Albums" component={AlbumsScreen} />

                    <Stack.Screen name="Tracks" component={TracksScreen} />

                    <Stack.Screen name="Playlist" component={PlaylistScreen} />

                    {/*
                     * ==================================================
                     * Settings
                     * ==================================================
                     *
                     * Может быть открыт:
                     * 1. StartScreen:
                     *    fromStart = true
                     *    Back → Start
                     * 2. Обычным способом из приложения:
                     *    fromStart отсутствует
                     *    Back → предыдущий экран
                     */}

                    <Stack.Screen
                        name="Settings"
                        component={SettingsScreen}
                        options={{
                            headerStyle: {
                                backgroundColor: palette.background,
                            },

                            headerTintColor: palette.textPrimary,
                            headerTitleStyle: typography.navigationTitle,
                            headerShadowVisible: false,
                            headerShown: true,
                            title: '',
                        }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}
