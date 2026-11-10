/**
 * @file fetchWithTimeout.test.ts
 * @description Проверка таймаута и понятной ошибки о недоступности сервера.
 */

import { fetchWithTimeout } from '../src/services/fetchWithTimeout';

import { LocalizedError } from '../src/i18n';

describe('fetchWithTimeout', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;

        jest.useRealTimers();
    });

    test('resolves with the response when the server answers in time', async () => {
        const response = new Response('{}', { status: 200 });

        globalThis.fetch = jest.fn().mockResolvedValue(response);

        await expect(fetchWithTimeout('http://test/api')).resolves.toBe(
            response,
        );
    });

    test('rejects with err.server.timeout when the request hangs', async () => {
        jest.useFakeTimers();

        globalThis.fetch = jest.fn(
            (_input: RequestInfo, init?: RequestInit) =>
                new Promise<Response>((_resolve, reject) => {
                    const abortError = new Error('Aborted');
                    abortError.name = 'AbortError';
                    init?.signal?.addEventListener('abort', () => {
                        reject(abortError);
                    });
                }),
        );

        const promise = fetchWithTimeout('http://test/api', undefined, 50);

        let caught: unknown;

        const handled = promise.catch(error => {
            caught = error;
        });

        await jest.advanceTimersByTimeAsync(60);

        await handled;

        if (!(caught instanceof LocalizedError)) {
            throw new Error(
                'Expected a LocalizedError from the timed-out fetch',
            );
        }

        expect(caught.code).toBe('err.server.timeout');
    });

    test('rethrows non-abort transport errors as-is', async () => {
        const transportError = new Error('Network failure');

        globalThis.fetch = jest.fn().mockRejectedValue(transportError);

        await expect(fetchWithTimeout('http://test/api')).rejects.toBe(
            transportError,
        );
    });
});
