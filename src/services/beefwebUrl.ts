/**
 * @file beefwebUrl.ts
 * @description URL normalization for the Beefweb HTTP API.
 */

import { loadSettings } from './settingsService';

import { LocalizedError } from '../i18n';

const MIN_PORT = 1;
const MAX_PORT = 65535;

/**
 * Возвращает базовый URL Beefweb из сохраненных настроек.
 *
 * Благодаря кэшу настроек повторные вызовы не обращаются
 * к AsyncStorage, поэтому метод безопасно использовать
 * в цикле опроса состояния проигрывателя.
 */
export async function resolveBeefwebUrl(): Promise<string> {
    const settings = await loadSettings();

    if (!settings || !settings.foobarUrl.trim()) {
        throw new LocalizedError('err.settings.notFound');
    }

    return buildBeefwebUrl(settings.foobarUrl, settings.foobarPort);
}

/**
 * Builds a valid Beefweb base URL from the settings fields.
 */
export function buildBeefwebUrl(value: string, port: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        throw new LocalizedError('err.url.empty');
    }

    const valueWithProtocol = /^(https?):\/\//i.test(trimmedValue)
        ? trimmedValue
        : `http://${trimmedValue}`;

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(valueWithProtocol);
    } catch {
        throw new LocalizedError('err.url.invalid');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new LocalizedError('err.url.protocol');
    }

    const trimmedPort = port.trim();

    if (trimmedPort) {
        if (!/^\d+$/.test(trimmedPort)) {
            throw new LocalizedError('err.port.notNumber');
        }

        const numericPort = Number(trimmedPort);

        if (numericPort < MIN_PORT || numericPort > MAX_PORT) {
            throw new LocalizedError('err.port.outOfRange');
        }
    }

    const hostname =
        parsedUrl.hostname.includes(':') && !parsedUrl.hostname.startsWith('[')
            ? `[${parsedUrl.hostname}]`
            : parsedUrl.hostname;

    const effectivePort = trimmedPort || parsedUrl.port;
    const pathname = parsedUrl.pathname.replace(/\/+$/, '');

    return `${parsedUrl.protocol}//${hostname}${
        effectivePort ? `:${effectivePort}` : ''
    }${pathname}`;
}
