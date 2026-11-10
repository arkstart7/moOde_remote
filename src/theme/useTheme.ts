/**
 * @file useTheme.ts
 * @description Хук доступа к теме приложения.
 *
 * Подписан на themeService через useSyncExternalStore:
 * при смене темы в настройках (и при смене системной темы
 * в режиме «Системная») компонент перерисовывается и
 * получает актуальную палитру.
 */

import { useSyncExternalStore } from 'react';

import { darkColors, lightColors, ThemeColors } from './colors';

import { getResolvedTheme, ResolvedTheme, subscribe } from './themeService';

/**
 * Возвращает палитру применяемой темы.
 */
export function useTheme(): ThemeColors {
    const resolvedTheme = useSyncExternalStore(
        subscribe,
        getResolvedTheme,
        getResolvedTheme,
    );

    return resolvedTheme === 'light' ? lightColors : darkColors;
}

/**
 * Возвращает применяемую тему ('light' | 'dark') —
 * без палитры, например для стиля статус-бара.
 */
export function useResolvedTheme(): ResolvedTheme {
    return useSyncExternalStore(subscribe, getResolvedTheme, getResolvedTheme);
}
