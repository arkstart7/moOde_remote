/**
 * @file SettingsBackButton.tsx
 * @description Компонент кнопки "Back" для SettingsScreen.
 */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { useTranslation } from '../i18n';

import AppText from './AppText';

import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/typography';

interface SettingsBackButtonProps {
    onPress: () => void;
    disabled?: boolean;
}

export default function SettingsBackButton({
    onPress,
    disabled = false,
}: SettingsBackButtonProps) {
    const theme = useTheme();

    const { t } = useTranslation();

    return (
        <Pressable
            style={styles.button}
            onPress={onPress}
            disabled={disabled}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
        >
            <ChevronLeft size={28} color={theme.textPrimary} />

            <AppText style={[styles.label, { color: theme.textPrimary }]}>
                {t('common.back')}
            </AppText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginLeft: -8,
        padding: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },

    label: {
        ...typography.regularText,
    },
});
