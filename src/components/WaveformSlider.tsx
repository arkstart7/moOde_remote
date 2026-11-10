/**
 * @file WaveformSlider.tsx
 * @description Интерактивная полоса прогресса воспроизведения
 * в виде волновой формы аудио трека.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '../theme/colors';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import { useTranslation } from '../i18n';

interface WaveformSliderProps {
    trackId: string;
    currentTime: number;
    duration: number;
    trackIndex: number;
    totalTracks: number;
    onSeek: (targetSeconds: number) => void;
}

const BARS_COUNT = 300;
const BAR_MAX_HEIGHT = 45;
const BAR_GAP = 1;
const BAR_RADIUS = 1;

interface WaveformBarProps {
    heightMultiplier: number;
    barWidth: number;
    active: boolean;
}

/**
 * Одна полоска волновой формы.
 *
 * Мемоизация важна: позиция воспроизведения обновляется
 * каждую секунду, и без React.memo ре-рендерился бы
 * каждый из BARS_COUNT View, хотя меняется только
 * граница активной области.
 */
const WaveformBar = React.memo(function WaveformBarInner({
    heightMultiplier,
    barWidth,
    active,
}: WaveformBarProps) {
    return (
        <View
            style={[
                styles.bar,
                {
                    width: barWidth,
                    height: BAR_MAX_HEIGHT * heightMultiplier,
                    backgroundColor: active
                        ? colors.highLighting
                        : colors.lowLighting,
                },
            ]}
        />
    );
});

/**
 * Форматирует время в строку:
 * m:ss
 * или
 * h:mm:ss
 */
function formatTime(secs: number): string {
    if (!Number.isFinite(secs) || secs < 0) {
        return '0:00';
    }

    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);

    const paddedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${minutes
            .toString()
            .padStart(2, '0')}:${paddedSeconds}`;
    }

    return `${minutes}:${paddedSeconds}`;
}

/**
 * Генерирует хеш для строки.
 */
function hashString(text: string): number {
    let hash = 2166136261;

    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

/**
 * Генератор псевдослучайных чисел.
 */
function mulberry32(seed: number) {
    let t = seed;

    return () => {
        t += 0x6d2b79f5;

        let r = Math.imul(t ^ (t >>> 15), t | 1);

        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);

        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export default function WaveformSlider({
    trackId,
    currentTime,
    duration,
    trackIndex,
    totalTracks,
    onSeek,
}: WaveformSliderProps) {
    const theme = useTheme();

    const resolvedTheme = useResolvedTheme();

    const { t } = useTranslation();

    /*
     * На светлой теме цифры времени и счётчика трека
     * должны быть чуть темнее, чем второстепенный
     * серый textTertiary.
     */
    const timeColor =
        resolvedTheme === 'light' ? theme.textSecondary : colors.textTertiary;

    /**
     * Реальная ширина области волновой формы.
     */
    const containerWidth = useRef(0);

    /**
     * Генерируем форму только при изменении trackId.
     */
    const waveform = useMemo(() => {
        const random = mulberry32(hashString(trackId || 'unknown'));

        return Array.from({ length: BARS_COUNT }, () => {
            return 0.2 + random() * 0.8;
        });
    }, [trackId]);

    /**
     * Прогресс от 0 до 1.
     */
    const currentProgress =
        duration > 0 && Number.isFinite(duration)
            ? Math.min(1, Math.max(0, currentTime / duration))
            : 0;

    /**
     * Вычисляет позицию воспроизведения по координате касания.
     *
     * Важно:
     * gesture работает в JS через runOnJS(true), поэтому здесь
     * можно напрямую вызывать callbacks, связанных с React.
     */
    const getSeekPosition = useCallback(
        (touchX: number) => {
            const width = containerWidth.current;

            if (width <= 0 || duration <= 0) {
                return null;
            }

            const progress = Math.min(1, Math.max(0, touchX / width));

            return Math.round(progress * duration);
        },
        [duration],
    );

    /**
     * Обрабатываем только одиночное касание.
     *
     * runOnJS(true) особенно важен здесь:
     * callbacks являются обычными JS-функциями.
     */
    const gesture = useMemo(
        () =>
            Gesture.Tap()
                .runOnJS(true)
                .onEnd(event => {
                    const position = getSeekPosition(event.x);

                    if (position !== null) {
                        onSeek(position);
                    }
                }),
        [getSeekPosition, onSeek],
    );

    /**
     * Сохраняем ширину контейнера.
     */
    const handleLayout = (event: LayoutChangeEvent) => {
        containerWidth.current = event.nativeEvent.layout.width;
    };

    /**
     * Ширина одной полоски.
     */
    const barWidth =
        containerWidth.current > 0
            ? Math.max(
                  1,
                  (containerWidth.current - BAR_GAP * (BARS_COUNT - 1)) /
                      BARS_COUNT,
              )
            : 1;

    return (
        <View style={styles.mainContainer}>
            <GestureDetector gesture={gesture}>
                <View
                    style={styles.waveContainer}
                    onLayout={handleLayout}
                    accessibilityRole="none"
                    accessibilityLabel={t('progress.position')}
                >
                    <View style={styles.waveWrapper}>
                        {waveform.map((heightMultiplier, index) => (
                            <WaveformBar
                                key={index}
                                heightMultiplier={heightMultiplier}
                                barWidth={barWidth}
                                active={currentProgress >= index / BARS_COUNT}
                            />
                        ))}
                    </View>
                </View>
            </GestureDetector>

            <View style={styles.infoRow}>
                <Text
                    style={[styles.text, styles.timeText, { color: timeColor }]}
                >
                    {formatTime(currentTime)}
                </Text>

                <Text
                    style={[
                        styles.text,
                        styles.counterText,
                        { color: timeColor },
                    ]}
                >
                    {totalTracks > 0
                        ? `${trackIndex + 1} / ${totalTracks}`
                        : '- / -'}
                </Text>

                <Text
                    style={[
                        styles.text,
                        styles.timeText,
                        styles.rightAlign,
                        { color: timeColor },
                    ]}
                >
                    {formatTime(duration)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        width: '100%',
        paddingHorizontal: 15,
        paddingBottom: 20,
        marginVertical: 10,
    },

    waveContainer: {
        width: '100%',
        height: 50,
        justifyContent: 'center',
    },

    waveWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',
    },

    bar: {
        borderRadius: BAR_RADIUS,
    },

    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },

    text: {
        fontSize: 13,
        color: colors.textTertiary,
    },

    timeText: {
        flex: 1,
        fontVariant: ['tabular-nums'],
    },

    counterText: {
        flex: 2,
        textAlign: 'center',
        fontWeight: '600',
        color: colors.textTertiary,
    },

    rightAlign: {
        textAlign: 'right',
    },
});
