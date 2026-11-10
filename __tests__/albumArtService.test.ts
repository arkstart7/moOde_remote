import {
    exists,
    mkdir,
    unlink,
    writeFile,
    CachesDirectoryPath,
} from 'react-native-fs';

import { albumArtService } from '../src/services/albumArtService';
import { AlbumArtService } from '../src/services/albumArtService';

import { loadSettings } from '../src/services/settingsService';

import { fetchBeefwebArtworkBase64 } from '../src/services/beefwebArtworkService';

import { readBeefwebCatalogPaths } from '../src/services/beefwebCatalogService';

import { libraryStore } from '../src/library/LibraryStore';
import { Library } from '../src/library/types';

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/cache',
    exists: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
}));

jest.mock('../src/services/settingsService', () => ({
    loadSettings: jest.fn(),
}));

jest.mock('../src/services/beefwebArtworkService', () => ({
    fetchBeefwebArtworkBase64: jest.fn(),
}));

jest.mock('../src/services/beefwebCatalogService', () => ({
    readBeefwebCatalogPaths: jest.fn(),
}));

const ALBUM_ID = 'Artist One|Album One';

const TRACK_PATH = '/music/artist-one/album-one/01.flac';

const IMAGE_NAME = 'Artist One_Album One.jpg';

const CACHE_PATH = `${CachesDirectoryPath}/album-art-v3/${IMAGE_NAME}`;

const LEGACY_CACHE_DIRS = [
    `${CachesDirectoryPath}/album-art`,
    `${CachesDirectoryPath}/album-art-v2`,
];

const CACHE_URI = `file://${CACHE_PATH}`;

const BEEFWEB_URL = 'http://192.168.1.100:8880';

function buildLibrary(): Library {
    return {
        tracks: {
            t1: {
                id: 't1',
                path: TRACK_PATH,
                title: 'Track One',
                artist: 'Artist One',
                albumArtist: 'Artist One',
                album: 'Album One',
                genre: 'Rock',
                trackNumber: 1,
                totalTracks: 1,
                discNumber: 1,
                totalDiscs: 1,
                duration: 100,
            },
        },
        albums: {
            [ALBUM_ID]: {
                id: ALBUM_ID,
                title: 'Album One',
                artist: 'Artist One',
                genre: 'Rock',
                totalDiscs: 1,
                trackIds: ['t1'],
                discs: {},
            },
        },
        artists: {
            'Artist One': {
                id: 'Artist One',
                name: 'Artist One',
                albumIds: [ALBUM_ID],
            },
        },
        genres: {
            Rock: {
                id: 'Rock',
                name: 'Rock',
                artistIds: ['Artist One'],
                albumIds: [ALBUM_ID],
            },
        },
    };
}

function mockServerCover(base64: string | null): void {
    /*
     * Путь первого трека альбома ищется среди путей каталога —
     * как это делает реальный сервис.
     */
    (readBeefwebCatalogPaths as jest.Mock).mockResolvedValue({
        playlistId: 'pl-art',
        paths: [TRACK_PATH],
    });

    (fetchBeefwebArtworkBase64 as jest.Mock).mockResolvedValue(base64);
}

describe('albumArtService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (loadSettings as jest.Mock).mockResolvedValue({
            foobarUrl: '192.168.1.100',
            foobarPort: '8880',
        });

        (exists as jest.Mock).mockResolvedValue(false);

        (mkdir as jest.Mock).mockResolvedValue(undefined);

        (unlink as jest.Mock).mockResolvedValue(undefined);

        (writeFile as jest.Mock).mockResolvedValue(undefined);

        libraryStore.clear();
        libraryStore.setLibrary(buildLibrary());
    });

    test('loads an image from Beefweb into the native cache', async () => {
        mockServerCover('QUJD');

        const first = await albumArtService.getAlbumImage(ALBUM_ID);

        expect(first).toBe(CACHE_URI);

        expect(readBeefwebCatalogPaths).toHaveBeenCalledWith(BEEFWEB_URL);

        expect(fetchBeefwebArtworkBase64).toHaveBeenCalledWith(
            BEEFWEB_URL,
            'pl-art',
            0,
        );

        expect(writeFile).toHaveBeenCalledWith(CACHE_PATH, 'QUJD', 'base64');

        const second = await albumArtService.getCached(ALBUM_ID);

        expect(second).toBe(first);
    });

    test('reuses the cached file without touching the server', async () => {
        mockServerCover('QUJD');

        (exists as jest.Mock).mockResolvedValue(true);

        const service = new AlbumArtService();

        await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBe(CACHE_URI);

        expect(readBeefwebCatalogPaths).not.toHaveBeenCalled();

        expect(fetchBeefwebArtworkBase64).not.toHaveBeenCalled();

        expect(writeFile).not.toHaveBeenCalled();
    });

    test('returns null when Beefweb has no cover', async () => {
        mockServerCover(null);

        /*
         * Отдельный экземпляр без общего кэша синглтона:
         * предыдущий тест уже закэшировал обложку.
         */
        const service = new AlbumArtService();

        await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBeNull();
    });

    test('falls back to a data URI when writing to the cache fails', async () => {
        mockServerCover('QUJD');

        (writeFile as jest.Mock).mockRejectedValue(new Error('disk full'));

        const service = new AlbumArtService();

        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        try {
            await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBe(
                'data:image/jpeg;base64,QUJD',
            );

            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to write cached album image:',
                IMAGE_NAME,
                expect.any(Error),
            );
        } finally {
            errorSpy.mockRestore();
        }
    });

    test('returns null when the server is unreachable', async () => {
        mockServerCover(null);

        (readBeefwebCatalogPaths as jest.Mock).mockRejectedValue(
            new Error('Нет связи с сервером.'),
        );

        const service = new AlbumArtService();

        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        try {
            await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBeNull();

            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to load album image:',
                ALBUM_ID,
                expect.any(Error),
            );
        } finally {
            errorSpy.mockRestore();
        }
    });

    test('sanitizes characters that are invalid in file names', async () => {
        const colonAlbumId = 'Janine Jansen|Vivaldi: The Four Seasons';

        libraryStore.setLibrary({
            ...buildLibrary(),
            albums: {
                ...buildLibrary().albums,
                [colonAlbumId]: {
                    id: colonAlbumId,
                    title: 'Vivaldi: The Four Seasons',
                    artist: 'Janine Jansen',
                    genre: 'Rock',
                    totalDiscs: 1,
                    trackIds: ['t1'],
                    discs: {},
                },
            },
        });

        mockServerCover('QUJD');

        const service = new AlbumArtService();

        await service.getAlbumImage(colonAlbumId);

        expect(writeFile).toHaveBeenCalledWith(
            `${CachesDirectoryPath}/album-art-v3/` +
                'Janine Jansen_Vivaldi_ The Four Seasons.jpg',
            'QUJD',
            'base64',
        );
    });

    test('removes the poisoned legacy cache directories once', async () => {
        mockServerCover('QUJD');

        (exists as jest.Mock).mockImplementation(async path => {
            return LEGACY_CACHE_DIRS.includes(path as string);
        });

        const service = new AlbumArtService();

        await service.getAlbumImage(ALBUM_ID);

        LEGACY_CACHE_DIRS.forEach(dir => {
            expect(unlink).toHaveBeenCalledWith(dir);
        });

        /*
         * Каталоги удалены: повторные обращения ничего не удаляют.
         */
        (unlink as jest.Mock).mockClear();

        (exists as jest.Mock).mockResolvedValue(false);

        const secondService = new AlbumArtService();

        await secondService.getAlbumImage(ALBUM_ID);

        expect(unlink).not.toHaveBeenCalled();
    });

    test('warms up missing covers and reports each result', async () => {
        mockServerCover('QUJD');

        const service = new AlbumArtService();

        const loaded: Array<[string, string]> = [];

        await service.warmup([ALBUM_ID], (albumId, imageUri) => {
            loaded.push([albumId, imageUri]);
        });

        expect(loaded).toEqual([[ALBUM_ID, CACHE_URI]]);

        /*
         * Повторный прогрев ничего не перечитывает:
         * все обложки уже в памяти.
         */
        (fetchBeefwebArtworkBase64 as jest.Mock).mockClear();

        await service.warmup([ALBUM_ID]);

        expect(fetchBeefwebArtworkBase64).not.toHaveBeenCalled();
    });

    test('uses the catalog position of the first track path', async () => {
        /*
         * Альбом представлен не первым элементом каталога,
         * кроме того, путь встречается в каталоге дважды:
         * должно использоваться первое вхождение.
         */
        (readBeefwebCatalogPaths as jest.Mock).mockResolvedValue({
            playlistId: 'pl-art',
            paths: ['/music/other/01.flac', TRACK_PATH, TRACK_PATH],
        });

        (fetchBeefwebArtworkBase64 as jest.Mock).mockResolvedValue('QUJD');

        const service = new AlbumArtService();

        await service.getAlbumImage(ALBUM_ID);

        expect(fetchBeefwebArtworkBase64).toHaveBeenCalledWith(
            BEEFWEB_URL,
            'pl-art',
            1,
        );
    });

    test('reports a mismatch when no album matches the catalog', async () => {
        /*
         * Содержимое каталога разошлось с Library: все альбомы
         * должны получить обложку-заглушку, а ошибка контекста —
         * попасть в диагностику.
         */
        (readBeefwebCatalogPaths as jest.Mock).mockResolvedValue({
            playlistId: 'pl-art',
            paths: ['/music/somebody-else/01.flac'],
        });

        const service = new AlbumArtService();

        const errorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {});

        try {
            await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBeNull();

            expect(fetchBeefwebArtworkBase64).not.toHaveBeenCalled();

            expect(errorSpy).toHaveBeenCalledWith(
                'Failed to load album image:',
                ALBUM_ID,
                expect.objectContaining({
                    message: expect.stringContaining('beefweb-catalog'),
                }),
            );
        } finally {
            errorSpy.mockRestore();
        }
    });
});
