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

/**
 * Парные ключи для ошибок HTTP: у базового кода операции
 * с проверкой ответа существует вариант "...Http" с
 * плейсхолдерами {status} и {details}.
 */
const HTTP_ERROR_VARIANTS: Partial<Record<TranslationKey, TranslationKey>> = {
    'err.playlists.listFailed': 'err.playlists.listFailedHttp',

    'err.catalog.readFailed': 'err.catalog.readFailedHttp',

    'err.playlist.createFailed': 'err.playlist.createFailedHttp',

    'err.playlist.clearFailed': 'err.playlist.clearFailedHttp',

    'err.playlist.addItemsFailed': 'err.playlist.addItemsFailedHttp',

    'err.playlist.itemsFailed': 'err.playlist.itemsFailedHttp',
};

/**
 * Строит ошибку неудачного HTTP-ответа на основе базовой
 * операции: код заменяется на парный "...Http" вариант,
 * к параметрам добавляются статус и тело ответа сервера.
 */
export function toHttpLocalizedError(
    baseOperation: ErrorDescriptor,
    status: number,
    details: string,
): LocalizedError {
    const httpCode = HTTP_ERROR_VARIANTS[baseOperation.code];

    if (!httpCode) {
        throw new Error(
            `No HTTP error variant for error code: ${baseOperation.code}`,
        );
    }

    return new LocalizedError(httpCode, {
        ...baseOperation.params,

        status,

        details,
    });
}
