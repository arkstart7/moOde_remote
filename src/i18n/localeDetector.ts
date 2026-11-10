/**
 * @file localeDetector.ts
 * @description Определение системного языка без внешних зависимостей.
 *
 * Используются нативные модули платформ:
 *
 * - iOS: SettingsManager.settings.AppleLocale либо первый элемент
 *   AppleLanguages;
 * - Android: I18nManager.localeIdentifier.
 *
 * Любая неудача (модуль недоступен, окружение без нативных
 * модулей) дает базовый язык 'en': детектор никогда не бросает.
 */

import { NativeModules, Platform } from 'react-native';

import { DEFAULT_LANGUAGE } from './language';

import { Language } from './language';

interface IosSettingsManager {
    settings?: {
        AppleLocale?: string;

        AppleLanguages?: string[];
    };
}

interface AndroidI18nManager {
    localeIdentifier?: string;
}

export function detectSystemLanguage(): Language {
    try {
        const identifier =
            Platform.OS === 'ios' ? readIosLocale() : readAndroidLocale();

        return toLanguage(identifier);
    } catch (error) {
        console.error('Failed to detect system language:', error);

        return DEFAULT_LANGUAGE;
    }
}

function readIosLocale(): string | undefined {
    const settingsManager = NativeModules.SettingsManager as
        | IosSettingsManager
        | undefined;

    const settings = settingsManager?.settings;

    return settings?.AppleLocale ?? settings?.AppleLanguages?.[0];
}

function readAndroidLocale(): string | undefined {
    const i18nManager = NativeModules.I18nManager as
        | AndroidI18nManager
        | undefined;

    return i18nManager?.localeIdentifier;
}

/**
 * Сопоставляет идентификатор локали ("ru_RU", "en-US", "de")
 * поддерживаемому языку. Все не-русские локали получают
 * английский: он же служит fallback-переводом.
 */
function toLanguage(identifier: string | undefined): Language {
    return identifier?.toLowerCase().startsWith('ru') ? 'ru' : DEFAULT_LANGUAGE;
}
