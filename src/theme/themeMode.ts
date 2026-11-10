/**
 * @file themeMode.ts
 * @description Поддерживаемые режимы темы приложения.
 *
 * Отдельный модуль без зависимостей: themeService и
 * экран настроек импортируют отсюда, не создавая
 * циклических ссылок.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Тема, реально применяемая к интерфейсу:
 * результат разрешения ThemeMode.
 */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Базовый режим: используется до инициализации и как fallback. */
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export function isThemeMode(value: unknown): value is ThemeMode {
    return value === 'system' || value === 'light' || value === 'dark';
}
