/**
 * @file index.ts
 * @description Публичный API модуля i18n.
 *
 * Компоненты используют useTranslation(): хук подписан
 * на смену языка через useSyncExternalStore, поэтому все
 * экраны перерисовываются при переключении языка.
 */

import { useCallback } from 'react';

import { useSyncExternalStore } from 'react';

import { getLanguage, subscribe, translateWith } from './i18nService';

import { Language } from './language';

import { ErrorDescriptor } from './localizedError';

import { TranslationKey, TranslationParams } from './translations/en';

export {
    describeError,
    LocalizedError,
    toHttpLocalizedError,
} from './localizedError';

export type { ErrorDescriptor } from './localizedError';

export { loadLanguage, saveLanguage } from './i18nService';

export { LANGUAGES } from './language';

export type { Language } from './language';

export type { TranslationKey, TranslationParams } from './translations/en';

export interface Translation {
    (key: TranslationKey, params?: TranslationParams): string;
}

/**
 * Возвращает функцию перевода, согласованную с текущим языком.
 *
 * При смене языка компонент, вызвавший хук, перерисовывается
 * и получает новую функцию перевода.
 */
export function useTranslation(): { t: Translation; language: Language } {
    const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);

    const t = useCallback<Translation>(
        (key, params) => translateWith(language, key, params),
        [language],
    );

    return { t, language };
}

/**
 * Форматирует дескриптор ошибки на языке указанной
 * функции перевода. Используется для отображения ошибок,
 * полученных из сервисов.
 */
export function formatError(error: ErrorDescriptor, t: Translation): string {
    return t(error.code, error.params);
}
