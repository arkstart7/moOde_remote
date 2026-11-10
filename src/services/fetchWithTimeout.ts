/**
 * @file fetchWithTimeout.ts
 * @description Общий fetch с таймаутом.
 *
 * Используется всеми сервисами, которые обращаются к Beefweb,
 * чтобы зависший запрос не блокировал цикл опроса состояния.
 */

import { LocalizedError } from '../i18n';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Выполняет fetch и прерывает запрос по таймауту.
 *
 * При превышении таймаута запрос отменяется, а вызывающему
 * коду сообщается понятная ошибка о недоступности сервера:
 * сырой AbortError ничего не говорит пользователю.
 */
export async function fetchWithTimeout(
    link: string,
    init?: RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    try {
        return await fetch(link, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new LocalizedError('err.server.timeout');
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
