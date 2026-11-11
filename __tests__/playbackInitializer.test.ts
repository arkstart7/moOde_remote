/*
 * Простой in-memory мок AsyncStorage:
 * state хранится между вызовами внутри теста.
 */

const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,

    default: {
        getItem: jest.fn((key: string) =>
            Promise.resolve(
                mockStorage.has(key) ? (mockStorage.get(key) as string) : null,
            ),
        ),

        setItem: jest.fn((key: string, value: string) => {
            mockStorage.set(key, value);

            return Promise.resolve();
        }),

        removeItem: jest.fn((key: string) => {
            mockStorage.delete(key);

            return Promise.resolve();
        }),
    },
}));

import {
    createDefaultPlayback,
    initializeCurrentPlayback,
} from '../src/services/playbackInitializer';

import * as playbackService from '../src/services/playbackService';

import { Library, CurrentPlayback } from '../src/library/types';

export {};

function makeLibrary(): Library {
    return {
        tracks: {},
        albums: {
            'album-b': {
                id: 'album-b',
                title: '19',
                artist: 'Adele',
                genre: 'Pop',
                totalDiscs: 1,
                trackIds: ['track-b1', 'track-b2'],
                discs: {},
            },
            'album-a': {
                id: 'album-a',
                title: '25',
                artist: 'Adele',
                genre: 'Pop',
                totalDiscs: 1,
                trackIds: ['track-a1', 'track-a2'],
                discs: {},
            },
        },
        artists: {},
        genres: {},
    };
}

describe('createDefaultPlayback', () => {
    it('returns the first album by title → artist and its first track', () => {
        const playback = createDefaultPlayback(makeLibrary());

        expect(playback.playbackSource).toBe('album');
        expect(playback.currentAlbumId).toBe('album-b');
        expect(playback.currentTrackId).toBe('track-b1');
        expect(playback.currentTime).toBe(0);
        expect(playback.currentPlaylistId).toBeNull();
        expect(playback.currentPlaylistTrackId).toBeNull();
        expect(playback.currentPlaylistTrackTime).toBe(0);
    });

    it('prefers album title over artist', () => {
        const library = makeLibrary();

        library.albums['album-c'] = {
            id: 'album-c',
            title: '19',
            artist: 'ZZ Top',
            genre: 'Rock',
            totalDiscs: 1,
            trackIds: ['track-c1'],
            discs: {},
        };

        const playback = createDefaultPlayback(library);

        expect(playback.currentAlbumId).toBe('album-b');
    });

    it('throws when the library has no albums', () => {
        const library: Library = {
            tracks: {},
            albums: {},
            artists: {},
            genres: {},
        };

        expect(() => createDefaultPlayback(library)).toThrow();
    });

    it('throws when the first album has no tracks', () => {
        const library = makeLibrary();

        library.albums['album-b'].trackIds = [];

        expect(() => createDefaultPlayback(library)).toThrow(
            'First album has no tracks: album-b',
        );
    });
});

describe('initializeCurrentPlayback', () => {
    beforeEach(() => {
        mockStorage.clear();
        jest.clearAllMocks();
    });

    it('falls back to the default playback when saved state is invalid', async () => {
        const savedPlayback: CurrentPlayback = {
            playbackSource: 'playlist',

            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,

            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistEntryIndex: 0,
            currentPlaylistTrackTime: 0,
        };

        await playbackService.saveCurrentPlayback(savedPlayback);

        const playback = await initializeCurrentPlayback(makeLibrary());

        expect(playback.playbackSource).toBe('album');
        expect(playback.currentAlbumId).toBe('album-b');
        expect(playback.currentTrackId).toBe('track-b1');

        /*
         * Недействительное состояние заменяется
         * и перезаписывается в AsyncStorage.
         */
        const saved = JSON.parse(
            mockStorage.get('@moode_remote/currentPlayback') ?? 'null',
        );

        expect(saved.currentAlbumId).toBe('album-b');
        expect(saved.playbackSource).toBe('album');
    });
});
