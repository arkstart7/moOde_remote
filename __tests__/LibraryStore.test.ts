import { libraryStore } from '../src/library/LibraryStore';
import { Library, PlaylistTrackInfo } from '../src/library/types';

const library: Library = {
    tracks: {
        t1: {
            id: 't1',
            path: '/a/track1.flac',
            title: 'Alpha',
            artist: 'Artist One',
            albumArtist: 'Artist One',
            album: 'Album One',
            genre: 'Rock',
            trackNumber: 1,
            discNumber: 1,
            duration: 100,
        },
        t2: {
            id: 't2',
            path: '/a/track2.flac',
            title: 'Bravo',
            artist: 'Artist One',
            albumArtist: 'Artist One',
            album: 'Album One',
            genre: 'Rock',
            trackNumber: 2,
            discNumber: 1,
            duration: 200,
        },
        t3: {
            id: 't3',
            path: '/b/orphan.flac',
            title: 'Orphan',
            artist: 'Artist One',
            albumArtist: 'Artist One',
            album: 'Another Album',
            genre: 'Rock',
            trackNumber: 1,
            discNumber: 1,
            duration: 30,
        },
    },
    albums: {
        'Artist One|Album One': {
            id: 'Artist One|Album One',
            title: 'Album One',
            artist: 'Artist One',
            genre: 'Rock',
            totalDiscs: 1,
            trackIds: ['t1', 't2'],
            discs: {
                1: { number: 1, trackIds: ['t1', 't2'] },
            },
        },
    },
    artists: {
        'Artist One': {
            id: 'Artist One',
            name: 'Artist One',
            albumIds: ['Artist One|Album One'],
        },
    },
    genres: {
        Rock: {
            id: 'Rock',
            name: 'Rock',
            artistIds: ['Artist One'],
            albumIds: ['Artist One|Album One'],
        },
    },
};

/**
 * Создает элемент плейлиста для тестов.
 */
function makeInfo(path: string, title?: string): PlaylistTrackInfo {
    return {
        path,
        title: title ?? null,
        artist: null,
        album: null,
        durationSeconds: null,
    };
}

describe('LibraryStore', () => {
    beforeEach(() => {
        libraryStore.clear();
        libraryStore.setLibrary(library);
    });

    test('returns genres sorted by name', () => {
        expect(libraryStore.getGenres().map(genre => genre.id)).toEqual([
            'Rock',
        ]);
    });

    test('resets the artist selection when the genre changes', () => {
        libraryStore.setSelectedGenreId('Rock');
        libraryStore.setSelectedArtistId('Artist One');

        expect(libraryStore.getSelectedArtistId()).toBe('Artist One');

        libraryStore.setSelectedGenreId(null);

        expect(libraryStore.getSelectedArtistId()).toBeNull();
    });

    test('filters albums by selected artist within a genre', () => {
        libraryStore.setSelectedGenreId('Rock');
        libraryStore.setSelectedArtistId('Unknown Artist');

        expect(libraryStore.getSelectedAlbums()).toEqual([]);
    });

    test('clamps playback time to the current track duration', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: 'Artist One|Album One',
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        libraryStore.setCurrentTime(500);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentTime).toBe(100);
    });

    test('rejects negative playback time', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: 'Artist One|Album One',
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        expect(() => libraryStore.setCurrentTime(-5)).toThrow();
    });

    test('computes the current track index inside the album', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: 'Artist One|Album One',
            currentTrackId: 't2',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        expect(libraryStore.getCurrentTrackIndex()).toBe(1);
    });

    test('refuses to select a track from another album', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: 'Artist One|Album One',
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        expect(() => libraryStore.setCurrentTrack('t3')).toThrow(
            /does not belong/,
        );
    });

    test('restores playlist entries preserving the saved track and time', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: 't2',
            currentPlaylistTrackTime: 42,
        });

        libraryStore.restorePlaylistEntries('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
            makeInfo('/a/track2.flac', 'Track 2'),
            makeInfo('/b/orphan.flac'),
        ]);

        expect(libraryStore.getPlaybackSource()).toBe('playlist');
        expect(libraryStore.getCurrentPlayback()?.currentPlaylistTrackId).toBe(
            't2',
        );
        expect(
            libraryStore.getCurrentPlayback()?.currentPlaylistTrackTime,
        ).toBe(42);
        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(1);
        expect(libraryStore.getPlaylistEntries()).toHaveLength(3);
    });

    test('falls back to the first known track on restore', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 10,
        });

        libraryStore.restorePlaylistEntries('pl1', [
            makeInfo('/unknown/file.flac'),
            makeInfo('/a/track2.flac', 'Track 2'),
        ]);

        expect(libraryStore.getCurrentPlayback()?.currentPlaylistTrackId).toBe(
            't2',
        );
        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(1);
    });

    test('restores a non-library entry by the saved index', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
            currentPlaylistEntryIndex: 1,
        });

        libraryStore.restorePlaylistEntries('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
            makeInfo('/unknown/file.flac', 'Orphan'),
            makeInfo('/a/track2.flac', 'Track 2'),
        ]);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBeNull();
        expect(playback?.currentPlaylistEntryIndex).toBe(1);
        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(1);
        expect(libraryStore.getCurrentPlaylistEntry()?.path).toBe(
            '/unknown/file.flac',
        );
    });

    test('falls back to the saved index when the saved track is missing', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: 'missing-track',
            currentPlaylistTrackTime: 0,
            currentPlaylistEntryIndex: 2,
        });

        libraryStore.restorePlaylistEntries('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
            makeInfo('/a/track2.flac', 'Track 2'),
            makeInfo('/a/track3.flac', 'Track 3'),
        ]);

        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(2);
    });

    test('refuses to restore entries for a foreign playlist', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        expect(() =>
            libraryStore.restorePlaylistEntries('pl2', [
                makeInfo('/a/track1.flac'),
            ]),
        ).toThrow(/does not belong/);
    });

    test('selects a playlist entry outside the media library by index', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        libraryStore.setCurrentPlaylist('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
            makeInfo('/unknown/file.flac'),
            makeInfo('/a/track2.flac', 'Track 2'),
        ]);

        libraryStore.setCurrentPlaylistEntryByIndex(1);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBeNull();
        expect(playback?.currentPlaylistEntryIndex).toBe(1);

        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(1);
        expect(libraryStore.getCurrentPlaylistEntry()?.path).toBe(
            '/unknown/file.flac',
        );
    });

    test('selects a library playlist entry and resets the time', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        libraryStore.setCurrentPlaylist('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
            makeInfo('/a/track2.flac', 'Track 2'),
        ]);

        libraryStore.setCurrentPlaylistTime(30);
        libraryStore.setCurrentPlaylistEntryByIndex(1);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBe('t2');
        expect(playback?.currentPlaylistTrackTime).toBe(0);
        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(1);
    });

    test('selects the first entry when the playlist has no library tracks', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        libraryStore.setCurrentPlaylist('pl1', [
            makeInfo('/unknown/one.flac', 'One'),
            makeInfo('/unknown/two.flac', 'Two'),
        ]);

        expect(
            libraryStore.getCurrentPlayback()?.currentPlaylistTrackId,
        ).toBeNull();
        expect(libraryStore.getCurrentPlaylistTrackIndex()).toBe(0);
        expect(libraryStore.getCurrentPlaylistEntry()?.path).toBe(
            '/unknown/one.flac',
        );
    });

    test('rejects an out-of-range playlist entry index', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'playlist',
            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,
            currentPlaylistId: 'pl1',
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        libraryStore.setCurrentPlaylist('pl1', [
            makeInfo('/a/track1.flac', 'Track 1'),
        ]);

        expect(() => libraryStore.setCurrentPlaylistEntryByIndex(1)).toThrow(
            /Invalid playlist entry index/,
        );
        expect(() => libraryStore.setCurrentPlaylistEntryByIndex(-1)).toThrow(
            /Invalid playlist entry index/,
        );
    });

    test('refuses an entry index outside the playlist source', () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: 'Artist One|Album One',
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        expect(() => libraryStore.setCurrentPlaylistEntryByIndex(0)).toThrow(
            /not a playlist/,
        );
    });
});
