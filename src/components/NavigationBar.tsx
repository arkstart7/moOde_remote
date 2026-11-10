/**
 * @file NavigationBar.tsx
 * @description Нижняя навигационная панель в стиле Material Design 3
 * (Navigation Bar): пункты с иконкой и подписью, у активного пункта —
 * пилюля secondaryContainer 64x32 за иконкой.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppText } from './';

import {
    NavAlbumsIcon,
    NavArtistsIcon,
    NavGenresIcon,
    NavPlaylistsIcon,
    NavSettingsIcon,
    NavTracksIcon,
} from './Icons';

import { RootStackParamList } from '../types/navigation';

import { useTheme } from '../theme/useTheme';

import { useTranslation } from '../i18n';

type ActiveTab =
    | 'genres'
    | 'artists'
    | 'albums'
    | 'tracks'
    | 'playlists'
    | 'settings';

type Props = {
    active: ActiveTab;
};

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type NavItem = {
    key: ActiveTab;
    label: string;
    icon: React.ComponentType<{ size?: number; color?: string }>;
};

export default function NavigationBar({ active }: Props) {
    const navigation = useNavigation<Navigation>();

    const theme = useTheme();

    const { t } = useTranslation();

    const items: NavItem[] = [
        {
            key: 'genres',
            label: t('menu.genres'),
            icon: NavGenresIcon,
        },
        {
            key: 'artists',
            label: t('menu.artists'),
            icon: NavArtistsIcon,
        },
        {
            key: 'albums',
            label: t('menu.albums'),
            icon: NavAlbumsIcon,
        },
        {
            key: 'tracks',
            label: t('menu.tracks'),
            icon: NavTracksIcon,
        },
        {
            key: 'playlists',
            label: t('menu.playlists'),
            icon: NavPlaylistsIcon,
        },
        {
            key: 'settings',
            label: t('menu.settings'),
            icon: NavSettingsIcon,
        },
    ];

    const handlePress = (key: ActiveTab) => {
        if (key === 'genres') {
            navigation.navigate('Genres');
        } else if (key === 'artists') {
            navigation.navigate('Artists');
        } else if (key === 'albums') {
            navigation.navigate('Albums');
        } else if (key === 'tracks') {
            navigation.navigate('Tracks');
        } else if (key === 'playlists') {
            navigation.navigate('Playlist');
        } else {
            navigation.navigate('Settings', {});
        }
    };

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.navigationBarSurface },
            ]}
            accessibilityRole="tablist"
        >
            {items.map(item => {
                const isActive = item.key === active;

                const Icon = item.icon;

                return (
                    <Pressable
                        key={item.key}
                        style={styles.item}
                        onPress={() => handlePress(item.key)}
                        accessibilityRole="tab"
                        accessibilityLabel={item.label}
                        accessibilityState={{ selected: isActive }}
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                isActive && {
                                    backgroundColor: theme.secondaryContainer,
                                },
                            ]}
                        >
                            <Icon
                                size={24}
                                color={
                                    isActive
                                        ? theme.onSecondaryContainer
                                        : theme.onSurfaceVariant
                                }
                            />
                        </View>

                        <AppText
                            style={[
                                styles.label,
                                { color: theme.onSurfaceVariant },
                                isActive && [
                                    styles.labelActive,
                                    { color: theme.textPrimary },
                                ],
                            ]}
                            numberOfLines={1}
                        >
                            {item.label}
                        </AppText>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 80,
        flexDirection: 'row',
    },

    item: {
        flex: 1,
        paddingTop: 12,
        paddingBottom: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    iconContainer: {
        width: 64,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },

    label: {
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        lineHeight: 16,
    },

    labelActive: {
        fontFamily: 'Inter-Medium',
    },
});
