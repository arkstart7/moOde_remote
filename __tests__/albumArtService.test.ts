import {
    exists,
    mkdir,
    unlink,
    writeFile,
    CachesDirectoryPath,
} from 'react-native-fs';

import { albumArtService } from '../src/services/albumArtService';
import { AlbumArtService } from '../src/services/albumArtService';

import { fetchMpdArtwork } from '../src/services/mpd/mpdArtworkService';

import { libraryStore } from '../src/library/LibraryStore';
import { Library } from '../src/library/types';

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/cache',
    exists: jest.fn(),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
}));

jest.mock('../src/services/mpd/mpdArtworkService', () => ({
    fetchMpdArtwork: jest.fn(),
    bytesToBase64: jest.fn(() => 'QUJD'),
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

function mockServerCover(bytes: Uint8Array | null): void {
    (fetchMpdArtwork as jest.Mock).mockResolvedValue(bytes);
}

beforeEach(() => {
    jest.clearAllMocks();

    libraryStore.setLibrary(buildLibrary());

    (exists as jest.Mock).mockResolvedValue(false);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (unlink as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);
});

describe('albumArtService', () => {
    test('loads and caches the cover of the first track of the album', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

        const first = await albumArtService.getAlbumImage(ALBUM_ID);

        expect(first).toBe(CACHE_URI);

        expect(fetchMpdArtwork).toHaveBeenCalledWith(TRACK_PATH);

        expect(writeFile).toHaveBeenCalledWith(CACHE_PATH, 'QUJD', 'base64');

        const second = await albumArtService.getCached(ALBUM_ID);

        expect(second).toBe(first);
    });

    test('reuses the cached file without touching the server', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

        (exists as jest.Mock).mockResolvedValue(true);

        const service = new AlbumArtService();

        await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBe(CACHE_URI);

        expect(fetchMpdArtwork).not.toHaveBeenCalled();

        expect(writeFile).not.toHaveBeenCalled();
    });

    test('returns null when MPD has no cover', async () => {
        mockServerCover(null);

        /*
         * Отдельный экземпляр без общего кэша синглтона:
         * предыдущий тест уже закэшировал обложку.
         */
        const service = new AlbumArtService();

        await expect(service.getAlbumImage(ALBUM_ID)).resolves.toBeNull();
    });

    test('falls back to a data URI when writing to the cache fails', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

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
        (fetchMpdArtwork as jest.Mock).mockRejectedValue(
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

        mockServerCover(new Uint8Array([1, 2, 3]));

        const service = new AlbumArtService();

        await service.getAlbumImage(colonAlbumId);

        expect(writeFile).toHaveBeenCalledWith(
            `${CachesDirectoryPath}/album-art-v3/` +
                'Janine Jansen_Vivaldi_ The Four Seasons.jpg',
            'QUJD',
            'base64',
        );
    });
});

describe('albumArtService legacy cache', () => {
    test('removes the poisoned legacy cache directories once', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

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
});

describe('albumArtService warmup', () => {
    test('warms up missing covers and reports each result', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

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
        (fetchMpdArtwork as jest.Mock).mockClear();

        await service.warmup([ALBUM_ID]);

        expect(fetchMpdArtwork).not.toHaveBeenCalled();
    });

    test('uses the path of the first track of the album', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

        const service = new AlbumArtService();

        await service.getAlbumImage(ALBUM_ID);

        expect(fetchMpdArtwork).toHaveBeenCalledWith(TRACK_PATH);
    });

    test('returns null when the album is unknown', async () => {
        mockServerCover(new Uint8Array([1, 2, 3]));

        const service = new AlbumArtService();

        await expect(
            service.getAlbumImage('Unknown|Album'),
        ).resolves.toBeNull();

        expect(fetchMpdArtwork).not.toHaveBeenCalled();
    });
});
