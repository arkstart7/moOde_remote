/**
 * @file settingsValidator.ts
 * @description Валидатор настроек приложения.
 *
 * Возвращает ошибки как дескрипторы { code, params }:
 * пользовательский текст строится в UI на текущем языке.
 */

import { buildBeefwebUrl } from './beefwebUrl';

import { fetchWithTimeout } from './fetchWithTimeout';

import { AppSettings } from './settingsService';

import { ErrorDescriptor } from '../i18n';

export interface SettingsValidationResult {
    errors: ErrorDescriptor[];
}

/** Таймаут проверки связи с Beefweb. */
const CONNECTION_TIMEOUT_MS = 5000;

export async function validateSettings(
    settings: AppSettings,
): Promise<SettingsValidationResult> {
    const errors: ErrorDescriptor[] = [];

    /*
     * Проверка связи с Foobar2000 / Beefweb.
     */
    if (!settings.foobarUrl.trim()) {
        errors.push({ code: 'err.validation.noUrl' });
    } else {
        let url: string | null = null;

        try {
            url = buildBeefwebUrl(settings.foobarUrl, settings.foobarPort);

            const response = await fetchWithTimeout(
                `${url}/api/player`,
                undefined,
                CONNECTION_TIMEOUT_MS,
            );

            if (!response.ok) {
                errors.push({
                    code: 'err.validation.noConnectionHttp',

                    params: { status: response.status },
                });
            }
        } catch (error) {
            /*
             * Причину (таймаут, DNS, отказ в соединении)
             * показываем пользователю вместе с сообщением
             * и пишем в консоль для диагностики.
             */
            console.error(
                `Connection check failed for ${url ?? '(url not built)'}:`,
                error,
            );

            errors.push({
                code: 'err.validation.noConnection',

                params: {
                    details:
                        error instanceof Error ? ` ${error.message}` : '',
                },
            });
        }
    }

    return { errors };
}
