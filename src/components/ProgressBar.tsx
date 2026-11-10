import React, { useCallback, useMemo, useRef } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '../theme/colors';

import { useTheme } from '../theme/useTheme';

import { useTranslation } from '../i18n';

interface ProgressBarProps {
    progress: number;
    duration?: number;
    onSeek?: (targetSeconds: number) => void;
}

export default function ProgressBar({
    progress,
    duration = 0,
    onSeek,
}: ProgressBarProps) {
    const { t } = useTranslation();

    /*
     * Фон дорожки совпадает с фоном экрана: на светлой теме
     * темная статичная подложка выглядела как черта над плеером.
     */
    const theme = useTheme();

    const normalizedProgress = Math.min(
        1,
        Math.max(0, Number.isFinite(progress) ? progress : 0),
    );

    const containerWidth = useRef(0);

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        containerWidth.current = event.nativeEvent.layout.width;
    }, []);

    const gesture = useMemo(
        () =>
            Gesture.Tap()
                .runOnJS(true)
                .onEnd(event => {
                    if (
                        !onSeek ||
                        duration <= 0 ||
                        containerWidth.current <= 0
                    ) {
                        return;
                    }

                    const tappedProgress = Math.min(
                        1,
                        Math.max(0, event.x / containerWidth.current),
                    );

                    onSeek(Math.round(tappedProgress * duration));
                }),
        [duration, onSeek],
    );

    return (
        <GestureDetector gesture={gesture}>
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
                onLayout={handleLayout}
                accessibilityRole="none"
                accessibilityLabel={t('progress.position')}
            >
                <View
                    style={[
                        styles.progress,
                        {
                            backgroundColor: theme.textPrimary,
                            width: `${normalizedProgress * 100}%`,
                        },
                    ]}
                />
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 3,
        backgroundColor: colors.background,
        overflow: 'hidden',
    },

    progress: {
        height: '100%',
        backgroundColor: colors.textPrimary,
    },
});
