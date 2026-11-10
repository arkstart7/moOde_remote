/**
 * @file useVolumeSlider.ts
 * @description Хук для управления слайдером громкости.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

import { GestureResponderEvent, PanResponder, View } from 'react-native';

interface UseVolumeSliderProps {
    // Текущий уровень громкости 0...100
    volumeLevel: number;

    // Состояние mute
    isMuted: boolean;

    // Функция изменения громкости,
    // приходит из родительского компонента
    onVolumeChange: (volume: number) => void;

    onVolumeCommit?: () => void;
}

// Радиус бегунка.
// Используется для правильного ограничения его позиции.
const THUMB_RADIUS = 8;

export function useVolumeSlider({
    volumeLevel,
    isMuted,
    onVolumeChange,
    onVolumeCommit,
}: UseVolumeSliderProps) {
    /*
    Реальная ширина области слайдера.
    Например:  sliderWidth = 200 px
    Если громкость 50%: fillWidth = 100 px
  */
    const [sliderWidth, setSliderWidth] = useState(0);

    /*
    Ссылка на View слайдера.
    Нужна для measure(),  чтобы узнать абсолютное положение 
    элемента на экране.
  */
    const sliderRef = useRef<View>(null);

    /*
    Координата X левого края слайдера
    относительно экрана.
    Используется потому, что:  
    event.nativeEvent.pageX даёт координату относительно всего экрана,
    а нам нужна координата внутри слайдера.
  */
    const sliderX = useRef(0);

    /**
     * Обработчик события размещения View.
     *  Вызывается после размещения View.
     *  measure() возвращает:
     *  x       - локальная координата
     *  y       - локальная координата
     *  width   - ширина
     *  height  - высота
     *  pageX   - абсолютная координата X
     */
    const handleLayout = useCallback(() => {
        sliderRef.current?.measure((_x, _y, width, _height, pageX) => {
            // Запоминаем левую границу слайдера
            sliderX.current = pageX;

            // Запоминаем ширину
            setSliderWidth(width);
        });
    }, []);

    /*
    Основная функция обработки движения.

    Вызывается:
    - при начале касания;
    - при движении пальца.
  */
    /**
     * Обработчик жестов.
     *  Вызывается при движении пальца по слайдеру:
     *  - при начале касания;
     *  - при движении пальца.
     */
    const handleGesture = useCallback(
        (event: GestureResponderEvent) => {
            // Если ширина ещё неизвестна,
            // ничего не делаем.
            if (sliderWidth === 0) {
                return;
            }

            /*
             * Координата пальца внутри слайдера.
             * pageX: координата относительно экрана.
             * sliderX:  начало нашего View.
             * Результат: 0 ... sliderWidth
             */
            const touchX = event.nativeEvent.pageX - sliderX.current;

            /*
             * Ограничиваем значение.
             * Например, палец левее:
             * -10 -> 0
             * палец правее:
             * 220 -> 200
             */
            const clampedX = Math.max(0, Math.min(touchX, sliderWidth));

            /*
             * Переводим пиксели в проценты.
             * 100px из 200px:
             * 100 / 200 = 0.5
             * 0.5 * 100 = 50%
             */
            const newVolume = Math.round((clampedX / sliderWidth) * 100);

            // Передаём новое значение наружу
            onVolumeChange(newVolume);
        },
        [sliderWidth, onVolumeChange],
    );

    /*
     * Создаём PanResponder.
     * useMemo нужен, чтобы объект
     * не создавался заново при каждом render.
     */
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                // Разрешаем захват касания
                onStartShouldSetPanResponder: () => true,

                // Разрешаем движение пальцем
                onMoveShouldSetPanResponder: () => true,

                // Первое касание
                onPanResponderGrant: handleGesture,

                // Движение пальца
                onPanResponderMove: handleGesture,

                // Фиксируем итоговое значение после перетаскивания или тапа
                onPanResponderRelease: onVolumeCommit,
                onPanResponderTerminate: onVolumeCommit,
            }),

        [handleGesture, onVolumeCommit],
    );

    /*
     * Если включен mute,
     * визуально показываем ноль.
     */
    const visibleVolume = isMuted ? 0 : volumeLevel;

    /*
     * Ширина заполненной части.
     * Например:
     * sliderWidth = 200
     * volume = 40
     * fillWidth = 80px
     */
    const fillWidth = (visibleVolume / 100) * sliderWidth;

    /*
     * Положение центра бегунка.
     * Ограничиваем, чтобы бегунок не выходил за границы.
     */
    const thumbPosition = Math.max(
        THUMB_RADIUS,
        Math.min(fillWidth, sliderWidth - THUMB_RADIUS),
    );

    return {
        // ref для View слайдера
        sliderRef,

        // обработчик измерения
        handleLayout,

        // обработчики жестов
        panHandlers: panResponder.panHandlers,

        // ширина заполнения
        fillWidth,

        // позиция бегунка
        thumbPosition,

        // видимый уровень (при mute — ноль)
        visibleVolume,
    };
}
