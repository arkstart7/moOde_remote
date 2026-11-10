/**
 * Тесты mpdClient: разбор адреса, ленивое соединение,
 * повторное использование и переподключение после сбоя.
 */

import { loadSettings } from '../src/services/settingsService';

import {
    DEFAULT_MPD_PORT,
    extractMpdHost,
    resetMpdClient,
    runMpdCommand,
    setMpdSocketFactory,
} from '../src/services/mpd/mpdClient';

import { MpdSocketLike } from '../src/services/mpd/mpdConnection';

import { utf8Decode, utf8Encode } from '../src/services/mpd/mpdText';

jest.mock('react-native-tcp-socket', () => ({
    connect: jest.fn(),
}));

jest.mock('../src/services/settingsService', () => ({
    loadSettings: jest.fn(),
}));

const loadSettingsMock = loadSettings as jest.Mock;

interface FakeSocket {
    socket: MpdSocketLike;

    dataListener: ((data: Uint8Array) => void) | null;

    closeListener: (() => void) | null;
}

let sockets: FakeSocket[] = [];

function createFakeSocket(host: string, port: number): FakeSocket {
    const fake: FakeSocket = {
        socket: null as unknown as MpdSocketLike,

        dataListener: null,

        closeListener: null,
    };

    fake.socket = {
        write: (data: Uint8Array) => {
            const command = utf8Decode(data);

            if (command === 'status\n') {
                fake.dataListener?.(
                    utf8Encode('volume: 30\nstate: play\nsong: 2\nOK\n'),
                );
            } else {
                fake.dataListener?.(utf8Encode('OK\n'));
            }
        },

        onData: listener => {
            fake.dataListener = listener;

            /*
             * Приветствие MPD после установки соединения:
             * доставляется асинхронно, как в реальном сокете.
             */
            setImmediate(() => {
                listener(utf8Encode('OK MPD 0.24.0\n'));
            });
        },

        onClose: listener => {
            fake.closeListener = listener;
        },

        onError: () => undefined,

        destroy: () => {
            fake.closeListener?.();
        },
    };

    expect(host).toBe('raspberrypi.local');
    expect(port).toBe(DEFAULT_MPD_PORT);

    return fake;
}

beforeEach(() => {
    sockets = [];

    jest.clearAllMocks();

    loadSettingsMock.mockResolvedValue({
        foobarUrl: 'raspberrypi.local',

        foobarPort: '',
    });

    setMpdSocketFactory(async (_host, _port) => {
        const fake = createFakeSocket(_host, _port);

        sockets.push(fake);

        return fake.socket;
    });

    resetMpdClient();
});

describe('extractMpdHost', () => {
    test('parses a bare host', () => {
        expect(extractMpdHost('raspberrypi.local')).toEqual({
            host: 'raspberrypi.local',

            portFromUrl: '',
        });
    });

    test('strips the protocol, path and credentials', () => {
        expect(extractMpdHost('http://user@rasp.lan/music')).toEqual({
            host: 'rasp.lan',

            portFromUrl: '',
        });
    });

    test('extracts the port from the URL', () => {
        expect(extractMpdHost('http://192.168.1.5:8880/')).toEqual({
            host: '192.168.1.5',

            portFromUrl: '8880',
        });
    });

    test('rejects an empty address', () => {
        expect(() => extractMpdHost('   ')).toThrow();
    });
});

describe('resolveMpdConfig', () => {
    test('defaults the port to 6600', async () => {
        const { resolveMpdConfig } = jest.requireActual(
            '../src/services/mpd/mpdClient',
        );

        expect(await resolveMpdConfig()).toEqual({
            host: 'raspberrypi.local',

            port: 6600,
        });
    });
});

describe('runMpdCommand', () => {
    test('lazily opens a connection and reuses it', async () => {
        await runMpdCommand(['status']);

        expect(sockets).toHaveLength(1);

        await runMpdCommand(['clear']);

        expect(sockets).toHaveLength(1);
    });

    test('reconnects after the transport closes', async () => {
        await runMpdCommand(['status']);

        sockets[0].socket.destroy();

        await runMpdCommand(['status']);

        expect(sockets).toHaveLength(2);
    });

    test('throws err.settings.notFound without settings', async () => {
        loadSettingsMock.mockResolvedValue(null);

        resetMpdClient();

        await expect(runMpdCommand(['status'])).rejects.toMatchObject({
            code: 'err.settings.notFound',
        });
    });
});
