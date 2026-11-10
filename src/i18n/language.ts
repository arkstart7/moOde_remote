/**
 * @file language.ts
 * @description Поддерживаемые языки приложения.
 *
 * Отдельный модуль без зависимостей: и i18nService,
 * и localeDetector импортируют отсюда, не создавая
 * циклических ссылок.
 */

export type Language = 'en' | 'ru' | 'de' | 'fr' | 'es' | 'zh';

export const LANGUAGES: readonly Language[] = [
    'en',
    'ru',
    'de',
    'fr',
    'es',
    'zh',
];

/** Базовый язык: используется до инициализации и как fallback. */
export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
    return (
        value === 'en' ||
        value === 'ru' ||
        value === 'de' ||
        value === 'fr' ||
        value === 'es' ||
        value === 'zh'
    );
}
