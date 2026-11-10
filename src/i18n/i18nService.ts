/**
 * @file i18nService.ts
 * @description Сервис интернационализации: выбор языка,
 * кэширование в AsyncStorage и перевод по ключу.
 *
 * Повторяет паттерн settingsService: значение читается
 * из хранилища один раз и кэшируется в модуле; кэш
 * инвалидируется при сохранении.
 *
 * Язык — глобальное состояние приложения, поэтому сервис
 * реализует контракт подписки subscribe()/getLanguage()
 * для useSyncExternalStore(): смена языка перерисовывает
 * все подключенные экраны без Context-провайдеров.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { formatTemplate } from './format';

import { DEFAULT_LANGUAGE, isLanguage, Language } from './language';

import { detectSystemLanguage } from './localeDetector';

import {
    en,
    TranslationDictionary,
    TranslationKey,
    TranslationParams,
} from './translations/en';

import { ru } from './translations/ru';

import { de } from './translations/de';

import { fr } from './translations/fr';

import { es } from './translations/es';

import { zh } from './translations/zh';

export { LANGUAGES } from './language';

export type { Language } from './language';

const LANGUAGE_KEY = '@foobar_remote/language';

const DICTIONARIES: Record<Language, TranslationDictionary> = {
    en,
    ru,
    de,
    fr,
    es,
    zh,
};

/*
 * undefined означает «еще не читали»,
 * null — «в хранилище нет корректного языка».
 */
let cachedLanguage: Language | null | undefined;

/**
 * Текущий язык интерфейса. Отдельное поле нужно потому,
 * что cachedLanguage === null означает «использовать
 * системную локаль», а не «нет языка».
 */
let currentLanguage: Language = DEFAULT_LANGUAGE;

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Загружает сохраненный язык. При отсутствии сохраненного
 * значения используется системная локаль.
 */
export async function loadLanguage(): Promise<Language> {
    if (cachedLanguage !== undefined) {
        return currentLanguage;
    }

    try {
        const value = await AsyncStorage.getItem(LANGUAGE_KEY);

        cachedLanguage = parseLanguage(value);
    } catch (error) {
        console.error('Failed to load language:', error);

        cachedLanguage = null;
    }

    applyLanguage(cachedLanguage ?? detectSystemLanguage());

    return currentLanguage;
}

/**
 * Сохраняет язык, обновляет кэш и уведомляет подписчиков.
 */
export async function saveLanguage(language: Language): Promise<void> {
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
        console.error('Failed to save language:', error);

        throw error;
    }

    applyLanguage(language);

    /*
     * Сохраненное значение считается прочитанным:
     * последующие loadLanguage() не обращаются к хранилищу.
     */
    cachedLanguage = language;
}

/**
 * Синхронно возвращает текущий язык.
 *
 * До завершения loadLanguage() возвращается базовый язык;
 * после загрузки подписчики будут уведомлены об изменении.
 */
export function getLanguage(): Language {
    return currentLanguage;
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Переводит ключ на текущий язык с подстановкой параметров.
 *
 * Отсутствующий в словаре язык-перевод (защита на время
 * разработки) или неизвестный ключ заменяются английским
 * значением; его отсутствие означает ошибку типизации.
 */
export function translate(
    key: TranslationKey,
    params?: TranslationParams,
): string {
    const template = resolveTemplate(currentLanguage, key);

    return formatTemplate(template, params);
}

/**
 * Переводит ключ на указанном языке; используется хуком
 * useTranslation(), чтобы перевод был согласован со снимком
 * языка из useSyncExternalStore.
 */
export function translateWith(
    language: Language,
    key: TranslationKey,
    params?: TranslationParams,
): string {
    return formatTemplate(resolveTemplate(language, key), params);
}

function resolveTemplate(language: Language, key: TranslationKey): string {
    return (
        DICTIONARIES[language]?.[key] ??
        en[key] ??
        `Missing translation: ${key}`
    );
}

function applyLanguage(language: Language): void {
    if (currentLanguage === language) {
        return;
    }

    currentLanguage = language;

    listeners.forEach(listener => listener());
}

/**
 * Разбирает сохраненное значение. Внешние данные
 * обрабатываются как unknown: некорректная структура
 * считается отсутствием сохраненного языка.
 */
function parseLanguage(value: string | null): Language | null {
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

    return typeof parsed === 'string' && isLanguage(parsed) ? parsed : null;
}
