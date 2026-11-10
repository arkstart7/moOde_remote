/**
 * @file MenuItem.tsx
 * @description Компонент меню для SettingsScreen.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';

type Props = {
    title: string;
    active: boolean;
    onPress: () => void;
};

export default function MenuItem({ title, active, onPress }: Props) {
    return (
        <Pressable
            style={styles.container}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <AppText style={[typography.menu, active && styles.activeText]}>
                {title}
            </AppText>

            <View
                style={[styles.indicator, active && styles.indicatorActive]}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginRight: 12,
    },

    activeText: {
        color: colors.textPrimary,
    },

    indicator: {
        marginTop: 4,
        width: '100%',
        height: 3,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },

    indicatorActive: {
        backgroundColor: colors.highLighting,
    },
});
