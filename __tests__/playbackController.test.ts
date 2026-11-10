import { libraryStore } from '../src/library/LibraryStore';
import { Library, PlaylistTrackInfo } from '../src/library/types';

import { playbackController } from '../src/services/playbackController';

import { resolveBeefwebUrl } from '../src/services/beefwebUrl';

import {
    getPlayerSnapshot,
    pausePlayer,
    playCurrentTrack,
    setPlayerPosition,
    stopPlayer,
    percentageToVolume,
    volumeToPercentage,
} from '../src/services/beefwebPlayerService';

import {
    loadCurrentAlbumToBeefwebPlaylist,
    loadTrackPathsToBeefwebPlaylist,
} from '../src/services/beefwebPlaylistService';

import { readPlaylistTrackInfo } from '../src/services/tracklistService';

import { saveCurrentPlayback } from '../src/services/playbackService';

jest.mock('../src/services/beefwebUrl', () => ({
    resolveBeefwebUrl: jest.fn(),
}));

jest.mock('../src/services/beefwebPlayerService', () => ({
    getPlayerSnapshot: jest.fn(),
    playCurrentTrack: jest.fn(),
    pausePlayer: jest.fn(),
    stopPlayer: jest.fn(),
    setPlayerPosition: jest.fn(),
    setPlayerVolume: jest.fn(),
    setPlayerMuted: jest.fn(),
    volumeToPercentage: jest.fn(),
    percentageToVolume: jest.fn(),
}));

jest.mock('../src/services/beefwebPlaylistService', () => ({
    BEEFWEB_PLAYLIST_NAME: 'beefweb',
    findBeefwebPlaylistId: jest.fn(),
    loadCurrentAlbumToBeefwebPlaylist: jest.fn(),
    loadTrackPathsToBeefwebPlaylist: jest.fn(),
}));

jest.mock('../src/services/tracklistService', () => ({
    readPlaylistTrackInfo: jest.fn(),
    readPlaylistTrackPaths: jest.fn(),
}));

jest.mock('../src/services/playbackService', () => ({
    saveCurrentPlayback: jest.fn(),
}));

/*
 * Реальный playbackSyncService работает с libraryStore,
 * поэтому он не мокается — тесты проверяют интеграцию.
 */

const beefwebUrl = 'http://192.168.1.100:8880';

const ALBUM_ONE = 'Artist One|Album One';
const ALBUM_TWO = 'Artist Two|Album Two';

function buildLibrary(): Library {
    return {
        tracks: {
            t1: makeTrack('t1', '/a/one.flac', 'One', 'Album One'),
            t2: makeTrack('t2', '/a/two.flac', 'Two', 'Album One'),
            t3: makeTrack('t3', '/b/three.flac', 'Three', 'Album Two'),
            t4: makeTrack('t4', '/b/four.flac', 'Four', 'Album Two'),
        },
        albums: {
            [ALBUM_ONE]: {
                id: ALBUM_ONE,
                title: 'Album One',
                artist: 'Artist One',
                genre: 'Rock',
                totalDiscs: 1,
                trackIds: ['t1', 't2'],
                discs: { 1: { number: 1, trackIds: ['t1', 't2'] } },
            },
            [ALBUM_TWO]: {
                id: ALBUM_TWO,
                title: 'Album Two',
                artist: 'Artist Two',
                genre: 'Rock',
                totalDiscs: 1,
                trackIds: ['t3', 't4'],
                discs: { 1: { number: 1, trackIds: ['t3', 't4'] } },
            },
        },
        artists: {
            'Artist One': {
                id: 'Artist One',
                name: 'Artist One',
                albumIds: [ALBUM_ONE],
            },
            'Artist Two': {
                id: 'Artist Two',
                name: 'Artist Two',
                albumIds: [ALBUM_TWO],
            },
        },
        genres: {
            Rock: {
                id: 'Rock',
                name: 'Rock',
                artistIds: ['Artist One', 'Artist Two'],
                albumIds: [ALBUM_ONE, ALBUM_TWO],
            },
        },
    };
}

function makeTrack(
    id: string,
    path: string,
    title: string,
    album: string,
): Library['tracks'][string] {
    return {
        id,
        path,
        title,
        artist: 'Artist One',
        albumArtist: 'Artist One',
        album,
        genre: 'Rock',
        trackNumber: 1,
        discNumber: 1,
        duration: 300,
    };
}

const linearVolume = {
    type: 'linear' as const,
    min: 0,
    max: 1,
    value: 0.4,
    isMuted: false,
};

/**
 * Создает строку плейлиста для тестов.
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

/**
 * Дожидается завершения цепочек промисов контроллера.
 */
function flush(): Promise<void> {
    return new Promise<void>(resolve => setImmediate(resolve));
}

describe('playbackController', () => {
    const resolveUrlMock = resolveBeefwebUrl as jest.Mock;
    const getSnapshotMock = getPlayerSnapshot as jest.Mock;
    const pauseMock = pausePlayer as jest.Mock;
    const playMock = playCurrentTrack as jest.Mock;
    const stopMock = stopPlayer as jest.Mock;
    const setPositionMock = setPlayerPosition as jest.Mock;
    const loadPlaylistMock = loadCurrentAlbumToBeefwebPlaylist as jest.Mock;
    const loadTrackPathsMock = loadTrackPathsToBeefwebPlaylist as jest.Mock;
    const readTrackInfoMock = readPlaylistTrackInfo as jest.Mock;
    const saveMock = saveCurrentPlayback as jest.Mock;
    const volumeToPercentageMock = volumeToPercentage as jest.Mock;
    const percentageToVolumeMock = percentageToVolume as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        resolveUrlMock.mockResolvedValue(beefwebUrl);
        saveMock.mockResolvedValue(undefined);
        loadTrackPathsMock.mockResolvedValue(undefined);
        volumeToPercentageMock.mockReturnValue(40);
        percentageToVolumeMock.mockReturnValue(0.4);

        libraryStore.clear();
        libraryStore.setLibrary(buildLibrary());
    });

    test('applies the server snapshot on poll', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
            activeItem: { index: 0, position: 12 },
            volume: linearVolume,
        });

        const release = playbackController.acquirePolling();

        await flush();

        expect(playbackController.getPlaybackState()).toBe('playing');
        expect(playbackController.isVolumeReady()).toBe(true);
        expect(playbackController.getVolumeLevel()).toBe(40);
        expect(libraryStore.getCurrentPlayback()?.currentTime).toBe(12);

        release();
    });

    test('reports errors from the poll without throwing', async () => {
        console.error = jest.fn();

        getSnapshotMock.mockRejectedValue(new Error('HTTP 500.'));

        const release = playbackController.acquirePolling();

        await flush();

        /*
         * Ошибки сервисов приходят как дескрипторы { code, params }:
         * исходное сообщение сети попадает в параметр details.
         */
        expect(playbackController.getError()?.params?.details).toContain(
            'HTTP 500',
        );

        expect(playbackController.isVolumeReady()).toBe(true);

        release();
    });

    test('pauses when pressing play/pause during playback', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 5,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
            volume: linearVolume,
        });

        const release = playbackController.acquirePolling();

        await flush();

        getSnapshotMock.mockResolvedValue({
            playbackState: 'paused',
            volume: linearVolume,
        });

        await playbackController.playPause();

        expect(pauseMock).toHaveBeenCalledWith(beefwebUrl);
        expect(playbackController.getPlaybackState()).toBe('paused');

        release();
    });

    test('plays the next track through the playlist index', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        getSnapshotMock.mockResolvedValue({
            playbackState: 'paused',
        });

        await playbackController.selectTrack('next');

        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 1);
        expect(libraryStore.getCurrentPlayback()?.currentTrackId).toBe('t2');
    });

    test('ignores previous beyond the first track', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        await playbackController.selectTrack('previous');

        expect(playMock).not.toHaveBeenCalled();
    });

    test('plays the next playlist entry outside the media library', async () => {
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
            makeInfo('/a/one.flac', 'One'),
            makeInfo('/unknown/file.flac'),
            makeInfo('/a/two.flac', 'Two'),
        ]);

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
        });

        await playbackController.selectTrack('next');

        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 1);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBeNull();
        expect(playback?.currentPlaylistEntryIndex).toBe(1);
        expect(libraryStore.getCurrentTrackIndex()).toBe(1);
    });

    test('plays the previous playlist entry from a library track', async () => {
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
            makeInfo('/unknown/file.flac'),
            makeInfo('/a/one.flac', 'One'),
        ]);

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
        });

        await playbackController.selectTrack('previous');

        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 0);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBeNull();
        expect(playback?.currentPlaylistEntryIndex).toBe(0);
    });

    test('playPlaylistEntry plays an entry outside the media library by index', async () => {
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
            makeInfo('/a/one.flac', 'One'),
            makeInfo('/unknown/file.flac'),
        ]);

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
        });

        await playbackController.playPlaylistEntry(1);

        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 1);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBeNull();
        expect(playback?.currentPlaylistEntryIndex).toBe(1);
        expect(saveMock).toHaveBeenCalled();
    });

    test('playPlaylistEntry plays a library entry and stores its track', async () => {
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
            makeInfo('/a/one.flac', 'One'),
            makeInfo('/a/two.flac', 'Two'),
        ]);

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
        });

        await playbackController.playPlaylistEntry(1);

        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 1);

        const playback = libraryStore.getCurrentPlayback();

        expect(playback?.currentPlaylistTrackId).toBe('t2');
        expect(libraryStore.getCurrentTrackIndex()).toBe(1);
    });

    test('playPlaylistEntry ignores an out-of-range entry and a foreign source', async () => {
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
            makeInfo('/a/one.flac', 'One'),
        ]);

        await playbackController.playPlaylistEntry(5);

        expect(playMock).not.toHaveBeenCalled();

        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        await playbackController.playPlaylistEntry(0);

        expect(playMock).not.toHaveBeenCalled();
    });

    test('ignores next beyond the last playlist entry', async () => {
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
            makeInfo('/a/one.flac', 'One'),
        ]);

        await playbackController.selectTrack('next');

        expect(playMock).not.toHaveBeenCalled();
    });

    test('seeks and stores the confirmed position', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        await playbackController.seek(120);

        expect(setPositionMock).toHaveBeenCalledWith(beefwebUrl, 120);
        expect(libraryStore.getCurrentPlayback()?.currentTime).toBe(120);
    });

    test('restores playback mode when selecting another album', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 30,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
        });

        await playbackController.selectAlbum(ALBUM_TWO);

        expect(stopMock).toHaveBeenCalledWith(beefwebUrl);
        expect(loadPlaylistMock).toHaveBeenCalledWith(beefwebUrl);
        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 0);
        expect(libraryStore.getCurrentPlayback()?.currentAlbumId).toBe(
            ALBUM_TWO,
        );
        expect(saveMock).toHaveBeenCalled();
    });

    test('rolls back to the previous album on failure', async () => {
        console.error = jest.fn();

        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        loadPlaylistMock.mockRejectedValue(new Error('HTTP 503.'));

        await playbackController.selectAlbum(ALBUM_TWO);

        expect(libraryStore.getCurrentPlayback()?.currentAlbumId).toBe(
            ALBUM_ONE,
        );
        expect(playbackController.getError()?.params?.details).toContain(
            'HTTP 503',
        );
    });

    test('selects a playlist and restores the playing state', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        getSnapshotMock.mockResolvedValue({
            playbackState: 'playing',
            volume: linearVolume,
        });

        readTrackInfoMock.mockResolvedValue([
            {
                path: '/a/one.flac',
                title: 'One',
                artist: 'Artist One',
                album: 'Album One',
            },
            {
                path: '/a/two.flac',
                title: 'Two',
                artist: 'Artist One',
                album: 'Album One',
            },
        ]);

        await playbackController.selectPlaylist('pl1');

        expect(libraryStore.getPlaybackSource()).toBe('playlist');
        expect(libraryStore.getCurrentPlayback()?.currentPlaylistId).toBe(
            'pl1',
        );
        expect(libraryStore.getPlaylistEntries()).toHaveLength(2);
        expect(libraryStore.getCurrentPlayback()?.currentPlaylistTrackId).toBe(
            't1',
        );
        expect(loadTrackPathsMock).toHaveBeenCalledWith(beefwebUrl, [
            '/a/one.flac',
            '/a/two.flac',
        ]);
        expect(playMock).toHaveBeenCalledWith(beefwebUrl, 0);
        expect(saveMock).toHaveBeenCalled();
    });

    test('selectPlaylist is a no-op for the same playlist', async () => {
        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        readTrackInfoMock.mockResolvedValue([
            {
                path: '/a/one.flac',
                title: 'One',
                artist: 'Artist One',
                album: 'Album One',
            },
        ]);

        await playbackController.selectPlaylist('pl1');

        expect(libraryStore.getPlaybackSource()).toBe('playlist');

        await playbackController.selectPlaylist('pl1');

        expect(readTrackInfoMock).toHaveBeenCalledTimes(1);
    });

    test('rolls back to the previous state when playlist selection fails', async () => {
        console.error = jest.fn();

        libraryStore.setCurrentPlayback({
            playbackSource: 'album',
            currentAlbumId: ALBUM_ONE,
            currentTrackId: 't1',
            currentTime: 0,
            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        });

        loadTrackPathsMock.mockRejectedValue(new Error('HTTP 503.'));

        await playbackController.selectPlaylist('pl1');

        expect(libraryStore.getPlaybackSource()).toBe('album');
        expect(libraryStore.getCurrentPlayback()?.currentAlbumId).toBe(
            ALBUM_ONE,
        );
        expect(playbackController.getError()?.params?.details).toContain(
            'HTTP 503',
        );
    });
});
