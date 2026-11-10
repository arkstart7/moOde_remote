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

type PlaylistServiceModule =
    typeof import('../src/services/beefwebPlaylistService');

const BEEFWEB_URL = 'http://192.168.1.100:8880';

const PLAYLIST_ID = '2';

function makeResponse(
    init: { ok?: boolean; status?: number; json?: unknown } = {},
): Response {
    return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => init.json,
        text: async () => '',
    } as unknown as Response;
}

describe('beefwebPlaylistService', () => {
    let service: PlaylistServiceModule;

    let fetchWithTimeout: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.resetModules();

        service = require('../src/services/beefwebPlaylistService');

        fetchWithTimeout = require('../src/services/fetchWithTimeout')
            .fetchWithTimeout as jest.Mock;
    });

    test('sends track paths with forward slashes to items/add', async () => {
        const bodies: unknown[] = [];

        fetchWithTimeout.mockImplementation(
            async (
                url: string,
                init?: { method?: string; body?: string },
            ) => {
                if (url.endsWith('/api/playlists')) {
                    return makeResponse({
                        json: {
                            playlists: [
                                { id: PLAYLIST_ID, title: 'beefweb' },
                            ],
                        },
                    });
                }

                if (url.endsWith('/clear')) {
                    return makeResponse({ status: 204 });
                }

                if (url.endsWith('/items/add')) {
                    bodies.push(JSON.parse(init?.body ?? '{}'));
                    return makeResponse({ status: 202 });
                }

                throw new Error(`unexpected url: ${url}`);
            },
        );

        await service.loadTrackPathsToBeefwebPlaylist(BEEFWEB_URL, [
            '\\\\router\\trancend 500\\music\\Adele\\19\\CD 1\\01. Daydreamer.wav',
            'D:\\Music\\Adele\\19\\CD 1\\02. Best for Last.wav',
        ]);

        expect(bodies).toEqual([
            {
                items: [
                    '//router/trancend 500/music/Adele/19/CD 1/01. Daydreamer.wav',
                    'D:/Music/Adele/19/CD 1/02. Best for Last.wav',
                ],
            },
        ]);
    });
});
