import {
    getPlayerState,
    getPlayerSnapshot,
    pausePlayer,
    percentageToVolume,
    playCurrentTrack,
    setPlayerMuted,
    setPlayerVolume,
    setPlayerPosition,
    stopPlayer,
    volumeToPercentage,
} from '../src/services/beefwebPlayerService';

const beefwebUrl = 'http://192.168.1.100:8880';

function response(body?: unknown): Response {
    return {
        ok: true,
        status: 200,
        json: async () => body,
    } as Response;
}

/*
 * Все запросы теперь идут через fetchWithTimeout,
 * который добавляет к init сигнал отмены.
 */
const GET_INIT = { signal: expect.anything() };

function postInit(body?: Record<string, unknown>) {
    return {
        ...body,
        signal: expect.anything(),
    };
}

describe('beefwebPlayerService', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        globalThis.fetch = fetchMock as typeof fetch;
    });

    test('reads the remote playback state', async () => {
        fetchMock.mockResolvedValue(
            response({ player: { playbackState: 'playing' } }),
        );

        await expect(getPlayerState(beefwebUrl)).resolves.toBe('playing');
        expect(fetchMock).toHaveBeenCalledWith(
            `${beefwebUrl}/api/player`,
            GET_INIT,
        );
    });

    test('reads the active item position', async () => {
        fetchMock.mockResolvedValue(
            response({
                player: {
                    playbackState: 'playing',
                    activeItem: {
                        playlistId: 'playlist-id',
                        playlistIndex: 0,
                        index: 2,
                        position: 37.5,
                        duration: 240,
                    },
                },
            }),
        );

        await expect(getPlayerSnapshot(beefwebUrl)).resolves.toEqual({
            playbackState: 'playing',
            activeItem: {
                playlistId: 'playlist-id',
                playlistIndex: 0,
                index: 2,
                position: 37.5,
                duration: 240,
            },
        });
    });

    test('reads and maps remote volume information', async () => {
        fetchMock.mockResolvedValue(
            response({
                player: {
                    playbackState: 'paused',
                    volume: {
                        type: 'linear',
                        min: 0,
                        max: 1,
                        value: 0.4,
                        isMuted: false,
                    },
                },
            }),
        );

        const snapshot = await getPlayerSnapshot(beefwebUrl);

        expect(snapshot.volume?.value).toBe(0.4);
        expect(volumeToPercentage(snapshot.volume ?? {})).toBe(40);
        expect(percentageToVolume(snapshot.volume ?? {}, 40)).toBeCloseTo(0.4);
    });

    test('maps dB volume using Beefweb logarithmic conversion', () => {
        const volume = {
            type: 'db' as const,
            min: -100,
            max: 0,
            value: -10,
        };

        expect(volumeToPercentage(volume)).toBeCloseTo(50);
        expect(percentageToVolume(volume, 25)).toBeCloseTo(-20);
        expect(percentageToVolume(volume, 50)).toBeCloseTo(-10);
        expect(percentageToVolume(volume, 75)).toBeCloseTo(
            10 * Math.log2(0.75),
        );
    });

    test('clamps dB volume at the reported endpoints', () => {
        const volume = {
            type: 'db' as const,
            min: -100,
            max: 0,
            value: -100,
        };

        expect(volumeToPercentage(volume)).toBe(0);
        expect(percentageToVolume(volume, 0)).toBe(-100);
        expect(percentageToVolume(volume, 100)).toBe(0);
    });

    test('sends an absolute playback position', async () => {
        fetchMock.mockResolvedValue(response());

        await setPlayerPosition(beefwebUrl, 42);

        expect(fetchMock).toHaveBeenCalledWith(`${beefwebUrl}/api/player`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            ...postInit({ body: JSON.stringify({ position: 42 }) }),
        });
    });

    test('sends absolute volume and mute commands', async () => {
        fetchMock.mockResolvedValue(response());

        await setPlayerVolume(beefwebUrl, 0.4);
        await setPlayerMuted(beefwebUrl, true);

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            `${beefwebUrl}/api/player`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                ...postInit({ body: JSON.stringify({ volume: 0.4 }) }),
            },
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `${beefwebUrl}/api/player`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                ...postInit({ body: JSON.stringify({ isMuted: true }) }),
            },
        );
    });

    test('rejects invalid playback positions without a request', async () => {
        await expect(setPlayerPosition(beefwebUrl, -1)).rejects.toThrow();
        await expect(
            setPlayerPosition(beefwebUrl, Number.NaN),
        ).rejects.toThrow();
        await expect(
            setPlayerPosition(beefwebUrl, Number.POSITIVE_INFINITY),
        ).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('pauses the current player item', async () => {
        fetchMock.mockResolvedValue(response());

        await pausePlayer(beefwebUrl);

        expect(fetchMock).toHaveBeenCalledWith(
            `${beefwebUrl}/api/player/pause`,
            postInit({ method: 'POST' }),
        );
    });

    test('stops the current player item', async () => {
        fetchMock.mockResolvedValue(response());

        await stopPlayer(beefwebUrl);

        expect(fetchMock).toHaveBeenCalledWith(
            `${beefwebUrl}/api/player/stop`,
            postInit({ method: 'POST' }),
        );
    });

    test('plays the selected track in the Beefweb playlist', async () => {
        fetchMock
            .mockResolvedValueOnce(
                response({
                    playlists: [{ id: 'playlist-id', title: 'beefweb' }],
                }),
            )
            .mockResolvedValueOnce(response());

        await playCurrentTrack(beefwebUrl, 2);

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            `${beefwebUrl}/api/playlists`,
            GET_INIT,
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `${beefwebUrl}/api/player/play/playlist-id/2`,
            postInit({ method: 'POST' }),
        );
    });

    test('resumes the selected track at the requested position', async () => {
        fetchMock
            .mockResolvedValueOnce(
                response({
                    playlists: [{ id: 'playlist-id', title: 'beefweb' }],
                }),
            )
            .mockResolvedValueOnce(response())
            .mockResolvedValueOnce(response());

        await playCurrentTrack(beefwebUrl, 2, 37);

        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            `${beefwebUrl}/api/player/play/playlist-id/2`,
            postInit({ method: 'POST' }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            `${beefwebUrl}/api/player`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                ...postInit({ body: JSON.stringify({ position: 37 }) }),
            },
        );
    });
});
