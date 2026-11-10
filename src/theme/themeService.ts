/**
 * @file themeService.ts
 * @description Сервис темы: выбор режима (Системная / Светлая /
 * Тёмная), кэширование в AsyncStorage и разрешение в конкретную
 * палитру.
 *
 * Повторяет паттерн i18nService: значение читается
 * из хранилища один раз и кэшируется в модуле; кэш
 * инвалидируется при сохранении.
 *
 * Тема — глобальное состояние приложения, поэтому сервис
 * реализует контракт подписки subscribe()/getThemeMode()/
 * getResolvedTheme() для useSyncExternalStore(): смена темы
 * (и смена системной темы в режиме «Системная») перерисовывает
 * все подключенные экраны без Context-провайдеров.
 */

import { Appearance } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    DEFAULT_THEME_MODE,
    isThemeMode,
    ResolvedTheme,
    ThemeMode,
} from './themeMode';

export { THEME_MODES, DEFAULT_THEME_MODE } from './themeMode';

export type { ThemeMode, ResolvedTheme } from './themeMode';

const THEME_KEY = '@foobar_remote/theme';

/*
 * undefined означает «еще не читали»,
 * null — «в хранилище нет корректного режима».
 */
let cachedThemeMode: ThemeMode | null | undefined;

/** Текущий выбранный режим (без разрешения системной темы). */
let currentThemeMode: ThemeMode = DEFAULT_THEME_MODE;

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Загружает сохраненный режим темы. При отсутствии
 * сохраненного значения используется системная тема.
 */
export async function loadTheme(): Promise<ThemeMode> {
    if (cachedThemeMode !== undefined) {
        return currentThemeMode;
    }

    try {
        const value = await AsyncStorage.getItem(THEME_KEY);

        cachedThemeMode = parseThemeMode(value);
    } catch (error) {
        console.error('Failed to load theme:', error);

        cachedThemeMode = null;
    }

    applyThemeMode(cachedThemeMode ?? DEFAULT_THEME_MODE);

    return currentThemeMode;
}

/**
 * Сохраняет режим темы, обновляет кэш и уведомляет подписчиков.
 */
export async function saveTheme(mode: ThemeMode): Promise<void> {
    try {
        await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (error) {
        console.error('Failed to save theme:', error);

        throw error;
    }

    applyThemeMode(mode);

    /*
     * Сохраненное значение считается прочитанным:
     * последующие loadTheme() не обращаются к хранилищу.
     */
    cachedThemeMode = mode;
}

/**
 * Синхронно возвращает текущий выбранный режим темы.
 */
export function getThemeMode(): ThemeMode {
    return currentThemeMode;
}

/**
 * Синхронно возвращает применяемую тему ('light' | 'dark'),
 * разрешая режим «Системная» через Appearance.
 */
export function getResolvedTheme(): ResolvedTheme {
    if (currentThemeMode === 'system') {
        return resolveSystemTheme();
    }

    return currentThemeMode;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Подписка на смену системной темы.
 *
 * Вызывается один раз при первом подключении модуля:
 * в режиме «Системная» уведомляет подписчиков, в остальных
 * режимах смены системной темы ни на что не влияют.
 */
const appearanceSubscription = Appearance.addChangeListener(() => {
    if (currentThemeMode !== 'system') {
        return;
    }

    listeners.forEach(listener => listener());
});

/*
 * Подписка живет весь жизненный цикл приложения;
 * явная отписка только в тестах.
 */
export function unsubscribeFromSystemTheme(): void {
    appearanceSubscription.remove();
}

/**
 * Разбирает сохраненное значение. Внешние данные
 * обрабатываются как unknown: некорректная структура
 * считается отсутствием сохраненного режима.
 */
function parseThemeMode(value: string | null): ThemeMode | null {
    if (!value) {
        return null;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(value);
    } catch {
        /*
         * Значение могло быть сохранено без JSON-обертки:
         * допускаем и сырую строку.
         */
        parsed = value;
    }

    return typeof parsed === 'string' && isThemeMode(parsed) ? parsed : null;
}

function resolveSystemTheme(): ResolvedTheme {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

function applyThemeMode(mode: ThemeMode): void {
    if (currentThemeMode === mode) {
        return;
    }

    currentThemeMode = mode;

    listeners.forEach(listener => listener());
}
