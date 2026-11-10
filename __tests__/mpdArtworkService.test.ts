import { MpdAckError } from '../src/services/mpd/mpdTypes';

jest.mock('../src/services/mpd/mpdClient', () => ({
    runMpdCommand: jest.fn(),
}));

import { runMpdCommand } from '../src/services/mpd/mpdClient';
import {
    ARTWORK_TIMEOUT_MS,
    bytesToBase64,
    fetchMpdArtwork,
} from '../src/services/mpd/mpdArtworkService';

const runMpdCommandMock = jest.mocked(runMpdCommand);

describe('fetchMpdArtwork', () => {
    beforeEach(() => {
        runMpdCommandMock.mockReset();
    });

    it('returns null when MPD answers ACK because no cover exists', async () => {
        runMpdCommandMock.mockRejectedValue(
            new MpdAckError(50, 0, 'albumart', 'No such file'),
        );

        await expect(fetchMpdArtwork('music/track.mp3')).resolves.toBeNull();
        expect(runMpdCommandMock).toHaveBeenCalledTimes(2);
    });

    it('tries readpicture when albumart has no binary', async () => {
        runMpdCommandMock
            .mockResolvedValueOnce({
                lines: [],
                binaries: [],
                error: null,
            })
            .mockResolvedValueOnce({
                lines: [],
                binaries: [new Uint8Array([1, 2, 3])],
                error: null,
            });

        await expect(fetchMpdArtwork('music/track.mp3')).resolves.toEqual(
            new Uint8Array([1, 2, 3]),
        );
        expect(runMpdCommandMock).toHaveBeenNthCalledWith(
            2,
            ['readpicture', 'music/track.mp3', '0'],
            ARTWORK_TIMEOUT_MS,
        );
    });

    it('tries readpicture after a transport failure of albumart', async () => {
        runMpdCommandMock
            .mockRejectedValueOnce(new Error('MPD connection is closed'))
            .mockResolvedValueOnce({
                lines: [],
                binaries: [new Uint8Array([4, 5])],
                error: null,
            });

        await expect(fetchMpdArtwork('music/track.mp3')).resolves.toEqual(
            new Uint8Array([4, 5]),
        );
        expect(runMpdCommandMock).toHaveBeenCalledTimes(2);
    });

    it('wraps transport errors into LocalizedError when both commands fail', async () => {
        runMpdCommandMock.mockRejectedValue(new Error('connection reset'));

        await expect(fetchMpdArtwork('music/track.mp3')).rejects.toThrow(
            'Failed to fetch the album artwork',
        );
        expect(runMpdCommandMock).toHaveBeenCalledTimes(2);
    });
    it('assembles a streamed cover from binary chunks', async () => {
        runMpdCommandMock
            .mockResolvedValueOnce({
                lines: ['size: 5'],
                binaries: [new Uint8Array([1, 2, 3])],
                error: null,
            })
            .mockResolvedValueOnce({
                lines: ['size: 5'],
                binaries: [new Uint8Array([4, 5])],
                error: null,
            });

        await expect(fetchMpdArtwork('music/track.mp3')).resolves.toEqual(
            new Uint8Array([1, 2, 3, 4, 5]),
        );
        expect(runMpdCommandMock).toHaveBeenNthCalledWith(
            2,
            ['albumart', 'music/track.mp3', '3'],
            ARTWORK_TIMEOUT_MS,
        );
        expect(runMpdCommandMock).toHaveBeenCalledTimes(2);
    });
});

describe('bytesToBase64', () => {
    it('encodes bytes into base64', () => {
        expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=');
    });
});
