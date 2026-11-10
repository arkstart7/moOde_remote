jest.mock('../src/services/fetchWithTimeout', () => ({
    fetchWithTimeout: jest.fn(),
}));

/*
 * Файл не имеет верхнеуровневых import/export,
 * поэтому помечается как модуль явно: иначе tsc считает его
 * глобальным скриптом, и константы конфликтуют с другими
 * тестовыми файлами.
 */
export {};

type ArtworkServiceModule =
    typeof import('../src/services/beefwebArtworkService');

const BEEFWEB_URL = 'http://192.168.1.100:8880';

interface MockResponseInit {
    ok?: boolean;
    status?: number;
    bytes?: Uint8Array;
}

function makeResponse(init: MockResponseInit = {}): Response {
    const buffer = (init.bytes ?? new Uint8Array()).buffer as ArrayBuffer;

    return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        arrayBuffer: async () => buffer,
    } as unknown as Response;
}

describe('beefwebArtworkService', () => {
    let artwork: ArtworkServiceModule;

    let fetchWithTimeout: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.resetModules();

        artwork = require('../src/services/beefwebArtworkService');

        fetchWithTimeout = require('../src/services/fetchWithTimeout')
            .fetchWithTimeout as jest.Mock;
    });

    /**
     * Назначает обработчик запросов вместо статического маршрутизатора.
     */
    function onRequest(
        handler: (url: string) => Response | Promise<Response>,
    ): void {
        fetchWithTimeout.mockImplementation(async (url: string) =>
            handler(url),
        );
    }

    describe('fetchBeefwebArtworkBase64', () => {
        test('requests the artwork by playlist item index', async () => {
            onRequest(() =>
                makeResponse({ bytes: new Uint8Array([65, 66, 67]) }),
            );

            await expect(
                artwork.fetchBeefwebArtworkBase64(BEEFWEB_URL, 'p12', 7),
            ).resolves.toBe('QUJD');

            expect(fetchWithTimeout).toHaveBeenCalledWith(
                `${BEEFWEB_URL}/api/artwork/p12/7`,
                undefined,
                5000,
            );
        });

        test('returns null when there is no artwork', async () => {
            onRequest(() => makeResponse({ ok: false, status: 404 }));

            await expect(
                artwork.fetchBeefwebArtworkBase64(BEEFWEB_URL, 'p9', 0),
            ).resolves.toBeNull();
        });

        test('rejects on server errors', async () => {
            onRequest(() => makeResponse({ ok: false, status: 500 }));

            await expect(
                artwork.fetchBeefwebArtworkBase64(BEEFWEB_URL, 'p9', 0),
            ).rejects.toThrow('HTTP 500');
        });

        test('rejects on an empty response body', async () => {
            onRequest(() => makeResponse({ bytes: new Uint8Array() }));

            await expect(
                artwork.fetchBeefwebArtworkBase64(BEEFWEB_URL, 'p9', 0),
            ).rejects.toThrow('Empty artwork response.');
        });

        test('encodes large images in chunks without losing bytes', async () => {
            /*
             * Размер больше одного чанка кодирования (0x8000):
             * проверяет, что порции склеиваются без потерь.
             */
            const bytes = new Uint8Array(0x8000 + 3);

            for (let index = 0; index < bytes.length; index += 1) {
                bytes[index] = index % 251;
            }

            onRequest(() => makeResponse({ bytes }));

            const base64 = await artwork.fetchBeefwebArtworkBase64(
                BEEFWEB_URL,
                'p9',
                0,
            );

            const decode = (globalThis as { atob?: (data: string) => string })
                .atob;

            const decoded = decode!(base64 as string);

            expect(decoded.length).toBe(bytes.length);

            /*
             * Сравниваются числовые коды символов: элементы строки —
             * односимвольные подстроки, а не числа.
             */
            const decodedBytes = Array.from(decoded).map(char =>
                char.charCodeAt(0),
            );

            expect(decodedBytes).toEqual(Array.from(bytes));
        });
    });
});
