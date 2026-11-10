/**
 * @file VolumeSlider.tsx
 * @description Компонент слайдера громкости. Содержит кнопку mute и сам слайдер.
 */
import React from 'react';

import { View, StyleSheet, Pressable } from 'react-native';

import { VolumeIcon, VolumeIconPale } from '../Icons';

import { colors } from '../../theme/colors';

import { useVolumeSlider } from './useVolumeSlider';

import { useTranslation } from '../../i18n';

const THUMB_RADIUS = 8;
const TRACK_HEIGHT = 6;
const SLIDER_HEIGHT = 30;

interface VolumeSliderProps {
    volumeLevel: number;
    isMuted: boolean;
    ready?: boolean;
    onVolumeChange: (newVolume: number) => void;
    onVolumeCommit?: () => void;
    onMuteToggle: () => void;
}

export default function VolumeSlider({
    volumeLevel,
    isMuted,
    ready = true,
    onVolumeChange,
    onVolumeCommit,
    onMuteToggle,
}: VolumeSliderProps) {
    const { t } = useTranslation();

    /*
    Получаем всю механику слайдера
    из хука.
  */
    const {
        sliderRef,
        handleLayout,
        panHandlers,
        fillWidth,
        thumbPosition,
        visibleVolume,
    } = useVolumeSlider({
        volumeLevel,
        isMuted,
        onVolumeChange,
        onVolumeCommit,
    });

    return (
        <View
            style={[styles.mainContainer, !ready && styles.loading]}
            pointerEvents={ready ? 'auto' : 'none'}
        >
            {/* Кнопка mute */}
            <Pressable
                style={styles.icon}
                accessibilityRole="button"
                accessibilityLabel={
                    isMuted ? t('volume.unmute') : t('volume.mute')
                }
                onPress={onMuteToggle}
                hitSlop={10}
            >
                {isMuted ? <VolumeIconPale /> : <VolumeIcon />}
            </Pressable>

            {/* Сам слайдер */}
            <View
                ref={sliderRef}
                style={styles.sliderContainer}
                {...panHandlers}
                onLayout={handleLayout}
                accessibilityRole="adjustable"
                accessibilityLabel={t('volume.label')}
                accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: visibleVolume,
                }}
            >
                {/* Фоновая линия */}
                <View style={styles.trackBackground}>
                    {/* Заполненная часть */}
                    <View
                        style={[
                            styles.trackFill,
                            {
                                width: fillWidth,
                                backgroundColor: isMuted
                                    ? colors.volumePassive
                                    : colors.volumeActive,
                            },
                        ]}
                    />

                    {/* Бегунок */}
                    <View
                        style={[
                            styles.thumb,
                            {
                                left: thumbPosition,
                            },
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        width: '50%',
        paddingHorizontal: 10,
        marginVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },

    loading: {
        opacity: 0,
    },

    icon: {
        marginLeft: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    sliderContainer: {
        flex: 1,
        height: SLIDER_HEIGHT,
        justifyContent: 'center',
    },

    trackBackground: {
        width: '100%',
        height: TRACK_HEIGHT,
        backgroundColor: colors.volumePassive,
        borderRadius: TRACK_HEIGHT / 2,
        position: 'relative',
    },

    trackFill: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
    },

    thumb: {
        position: 'absolute',
        width: THUMB_RADIUS * 2,
        height: THUMB_RADIUS * 2,
        borderRadius: THUMB_RADIUS,
        backgroundColor: colors.volumeActive,
        top: -(THUMB_RADIUS - TRACK_HEIGHT / 2),
        transform: [
            {
                translateX: -THUMB_RADIUS,
            },
        ],
    },
});
