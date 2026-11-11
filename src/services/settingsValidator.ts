/**
 * @file settingsValidator.ts
 * @description Валидатор настроек приложения.
 *
 * Возвращает ошибки как дескрипторы { code, params }:
 * пользовательский текст строится в UI на текущем языке.
 */

import { describeError, ErrorDescriptor } from '../i18n';

import { buildMpdConfig } from './mpd/mpdClient';

import { MpdConnection, tcpSocketFactory } from './mpd/mpdConnection';

import { AppSettings } from './settingsService';

export interface SettingsValidationResult {
    errors: ErrorDescriptor[];
}

/** Таймаут проверки связи с MPD. */
const CONNECTION_TIMEOUT_MS = 5000;

export async function validateSettings(
    settings: AppSettings,
): Promise<SettingsValidationResult> {
    const errors: ErrorDescriptor[] = [];

    /*
     * Проверка адреса и порта.
     */
    if (!settings.host.trim()) {
        errors.push({ code: 'err.validation.noUrl' });

        return { errors };
    }

    let config;

    try {
        config = buildMpdConfig(settings.host, settings.port);
    } catch (error) {
        errors.push(describeError(error));

        return { errors };
    }

    /*
     * Проверка связи: отдельное короткоживущее TCP-соединение.
     *
     * Важно: не через runMpdCommand(), потому что общий клиент
     * читает сохраненные, а не отредактированные настройки.
     */
    const connection = new MpdConnection();

    try {
        await connection.connect(config, tcpSocketFactory);

        await connection.send(['ping'], CONNECTION_TIMEOUT_MS);
    } catch (error) {
        /*
         * Причину (таймаут, DNS, отказ в соединении)
         * показываем пользователю вместе с сообщением
         * и пишем в консоль для диагностики.
         */
        console.error(`Connection check failed for ${config.host}:`, error);

        errors.push({
            code: 'err.validation.noConnection',

            params: {
                details: error instanceof Error ? ` ${error.message}` : '',
            },
        });
    } finally {
        connection.close();
    }

    return { errors };
}
