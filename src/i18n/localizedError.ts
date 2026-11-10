/**
 * @file localizedError.ts
 * @description Ошибка с кодом перевода вместо готового текста.
 *
 * Сервисы бросают LocalizedError с ключом словаря и параметрами;
 * пользовательский текст строится в UI на текущем языке.
 * Поле message заполняется английским шаблоном — оно нужно
 * только для dev-логов (console.error) и никогда не показывается
 * пользователю напрямую.
 */

import { formatTemplate } from './format';

import { en, TranslationKey, TranslationParams } from './translations/en';

export interface ErrorDescriptor {
    code: TranslationKey;

    params?: TranslationParams;
}

export class LocalizedError extends Error implements ErrorDescriptor {
    readonly code: TranslationKey;

    readonly params: TranslationParams;

    constructor(code: TranslationKey, params?: TranslationParams) {
        super(formatTemplate(en[code], { ...params }));

        this.name = 'LocalizedError';

        this.code = code;

        this.params = { ...params };
    }
}

/**
 * Приводит произвольную ошибку к дескриптору для перевода в UI.
 *
 * LocalizedError сохраняет свой код; обычная ошибка попадает
 * в параметры общего ключа err.generic (в message таких ошибок
 * уже может лежать любой текст — сетевой или системный).
 */
export function describeError(error: unknown): ErrorDescriptor {
    if (error instanceof LocalizedError) {
        return { code: error.code, params: error.params };
    }

    if (error instanceof Error && error.message) {
        return { code: 'err.generic', params: { details: error.message } };
    }

    if (typeof error === 'string' && error) {
        return { code: 'err.generic', params: { details: error } };
    }

    return { code: 'err.unknown' };
}
