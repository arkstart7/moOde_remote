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

type CatalogServiceModule =
    typeof import('../src/services/beefwebCatalogService');

const BEEFWEB_URL = 'http://192.168.1.100:8880';

const PLAYLIST_ID = 'p12';

interface MockResponseInit {
    ok?: boolean;
    status?: number;
    json?: unknown;
}

function makeResponse(init: MockResponseInit = {}): Response {
    return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        json: async () => init.json,
        text: async () => '',
    } as unknown as Response;
}

/**
 * Одна строка каталога в порядке колонок beefwebCatalogService.
 *
 * Значения повторяют проверенный ответ реального сервера:
 * пустой album artist, ведущие нули у tracknumber,
 * duration строкой-числом.
 */
function catalogRow(overrides?: Partial<Record<number, string>>): string[] {
    const columns = [
        'F:\\Music\\Adele\\19\\CD 1\\01. Daydreamer.wav',
        'Daydreamer',
        'Adele',
        '',
        '19',
        'Pop',
        '2008',
        '01',
        '12',
        '1',
        '2',
        '221',
    ];

    if (overrides) {
        for (const [index, value] of Object.entries(overrides)) {
            if (value !== undefined) {
                columns[Number(index)] = value;
            }
        }
    }

    return columns;
}

function playlistsResponse(
    playlists: Array<{ id: string; title: string }>,
): Response {
    return makeResponse({ json: { playlists } });
}

function itemsResponse(totalCount: number, rows: string[][]): Response {
    return makeResponse({
        json: {
            playlistItems: {
                offset: 0,
                totalCount,
                items: rows.map(columns => ({ columns })),
            },
        },
    });
}

describe('beefwebCatalogService', () => {
    let catalog: CatalogServiceModule;

    let fetchWithTimeout: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.resetModules();

        catalog = require('../src/services/beefwebCatalogService');

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

    test('reads the whole catalog across pages', async () => {
        const pages = new Map<number, string[][]>();

        const totalRows = 2500;

        for (let index = 0; index < totalRows; index += 1) {
            const row = catalogRow({
                0: `F:\\Music\\track-${index}.flac`,
                7: String((index % 12) + 1).padStart(2, '0'),
            });

            const pageOffset = Math.floor(index / 1000) * 1000;

            const pageRows = pages.get(pageOffset) ?? [];

            pageRows.push(row);

            pages.set(pageOffset, pageRows);
        }

        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            const match = url.match(/\/items\/(\d+):/);

            if (match) {
                const offset = Number(match[1]);

                return itemsResponse(totalRows, pages.get(offset) ?? []);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        const tracks = await catalog.loadBeefwebCatalogTracks(BEEFWEB_URL);

        expect(tracks).toHaveLength(totalRows);

        expect(tracks[0]).toEqual({
            path: 'F:\\Music\\track-0.flac',

            subsong_index: 0,

            length: 221,

            meta: expect.objectContaining({
                title: ['Daydreamer'],
                artist: ['Adele'],
                'album artist': [''],
                album: ['19'],
                genre: ['Pop'],
                date: ['2008'],
                tracknumber: ['01'],
                discnumber: ['1'],
                totaldiscs: ['2'],
            }),
        });

        /*
         * 2500 строк при чанке в 1000 — три запроса.
         * Состав query проверяется отдельным тестом.
         */
        const itemsCalls = fetchWithTimeout.mock.calls.filter(([url]) =>
            (url as string).includes('/items/'),
        );

        expect(
            itemsCalls.map(([url]) => (url as string).split('?')[0]),
        ).toEqual([
            `${BEEFWEB_URL}/api/playlists/${PLAYLIST_ID}/items/0:1000`,
            `${BEEFWEB_URL}/api/playlists/${PLAYLIST_ID}/items/1000:1000`,
            `${BEEFWEB_URL}/api/playlists/${PLAYLIST_ID}/items/2000:1000`,
        ]);
    });

    test('requests all columns with a single columns parameter', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            if ((url as string).includes('/items/0:')) {
                return itemsResponse(1, [catalogRow()]);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await catalog.loadBeefwebCatalogTracks(BEEFWEB_URL);

        const itemsUrl = fetchWithTimeout.mock.calls.find(([url]) =>
            (url as string).includes('/items/'),
        )![0] as string;

        const query = new URL(itemsUrl).search;

        /*
         * Повторные параметры columns= сервер игнорирует,
         * поэтому параметр должен быть строго один.
         */
        expect(query.match(/columns=/g)).toHaveLength(1);

        const columns = query.split('columns=')[1];

        const decodedColumns = decodeURIComponent(columns).split(',');

        expect(decodedColumns).toEqual([
            '%path%',
            '$meta(title)',
            '$meta(artist)',
            '$meta(album artist)',
            '$meta(album)',
            '$meta(genre)',
            '$meta(date)',
            '$meta(tracknumber)',
            '$meta(totaltracks)',
            '$meta(discnumber)',
            '$meta(totaldiscs)',
            '%length_seconds%',
        ]);
    });

    test('reads only paths across pages for artwork', async () => {
        const totalRows = 1500;

        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            const match = url.match(/\/items\/(\d+):/);

            if (match) {
                const offset = Number(match[1]);

                const size = Math.min(1000, totalRows - offset);

                const rows = Array.from({ length: size }, (_, index) => [
                    `F:\\Music\\track-${offset + index}.flac`,
                ]);

                return itemsResponse(totalRows, rows);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        const { playlistId, paths } = await catalog.readBeefwebCatalogPaths(
            BEEFWEB_URL,
        );

        expect(playlistId).toBe(PLAYLIST_ID);

        expect(paths).toHaveLength(totalRows);

        expect(paths[0]).toBe('F:\\Music\\track-0.flac');

        expect(paths[totalRows - 1]).toBe(
            `F:\\Music\\track-${totalRows - 1}.flac`,
        );

        /*
         * Для обложек читается только колонка пути.
         */
        const itemsUrl = fetchWithTimeout.mock.calls.find(([url]) =>
            (url as string).includes('/items/'),
        )![0] as string;

        expect(new URL(itemsUrl).search).toBe('?columns=%25path%25');
    });

    test('returns an empty path list when the playlist is empty', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            if ((url as string).includes('/items/0:')) {
                return itemsResponse(0, []);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.readBeefwebCatalogPaths(BEEFWEB_URL),
        ).resolves.toEqual({ playlistId: PLAYLIST_ID, paths: [] });
    });

    test('fails with instructions when the playlist is missing', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([{ id: 'p3', title: 'beefweb' }]);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.loadBeefwebCatalogTracks(BEEFWEB_URL),
        ).rejects.toThrow(
            /Playlist "beefweb-catalog" was not found.*foobar2000/s,
        );
    });

    test('fails when the playlist is empty', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            if ((url as string).includes('/items/0:')) {
                return itemsResponse(0, []);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.loadBeefwebCatalogTracks(BEEFWEB_URL),
        ).rejects.toThrow(/is empty.*Send your entire media/s);
    });

    test('skips rows without path or duration', async () => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation();

        try {
            onRequest(url => {
                if (url === `${BEEFWEB_URL}/api/playlists`) {
                    return playlistsResponse([
                        { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                    ]);
                }

                if ((url as string).includes('/items/0:')) {
                    return itemsResponse(4, [
                        catalogRow(),
                        catalogRow({ 0: '' }),
                        catalogRow({ 11: '' }),
                        catalogRow({ 11: 'abc' }),
                    ]);
                }

                throw new Error(`Unexpected url: ${url}`);
            });

            const tracks = await catalog.loadBeefwebCatalogTracks(BEEFWEB_URL);

            expect(tracks).toHaveLength(1);

            expect(tracks[0].path).toContain('Daydreamer');

            expect(consoleError).toHaveBeenCalledTimes(3);
        } finally {
            consoleError.mockRestore();
        }
    });

    test('fails on HTTP error from the server', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return makeResponse({ ok: false, status: 500 });
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.loadBeefwebCatalogTracks(BEEFWEB_URL),
        ).rejects.toThrow(/HTTP 500/s);
    });

    test('fails when the server returns an unexpected column count', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            if ((url as string).includes('/items/0:')) {
                /*
                 * Регрессия: повторные параметры columns=
                 * игнорируются сервером, и возвращается одна
                 * колонка вместо двенадцати.
                 */
                return itemsResponse(1, [
                    ['F:\\Music\\Adele\\19\\01. Daydreamer.wav'],
                ]);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.loadBeefwebCatalogTracks(BEEFWEB_URL),
        ).rejects.toThrow(/server returned 1 columns instead of 12/s);
    });

    test('fails when the read is incomplete', async () => {
        onRequest(url => {
            if (url === `${BEEFWEB_URL}/api/playlists`) {
                return playlistsResponse([
                    { id: PLAYLIST_ID, title: 'beefweb-catalog' },
                ]);
            }

            const match = (url as string).match(/\/items\/(\d+):/);

            if (match) {
                const offset = Number(match[1]);

                /*
                 * Сервер заявляет totalCount больше,
                 * чем фактически отдает.
                 */
                return itemsResponse(2500, offset === 0 ? [catalogRow()] : []);
            }

            throw new Error(`Unexpected url: ${url}`);
        });

        await expect(
            catalog.loadBeefwebCatalogTracks(BEEFWEB_URL),
        ).rejects.toThrow(/rows read: 1 of 2500/);
    });
});
