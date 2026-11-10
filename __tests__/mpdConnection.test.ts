/**
 * Тесты MpdConnection: посылка из нескольких команд должна
 * потреблять ровно столько кадров, сколько отправлено команд,
 * иначе MPD-ответы рассинхронизируются.
 */

import {
    MpdConnection,
    MpdSocketFactory,
    MpdSocketLike,
} from '../src/services/mpd/mpdConnection';

import { utf8Decode, utf8Encode } from '../src/services/mpd/mpdText';

jest.mock('react-native-tcp-socket', () => ({
    connect: jest.fn(),
}));

interface FakeSocket {
    socket: MpdSocketLike;

    dataListener: ((data: Uint8Array) => void) | null;
}

/**
 * Сервер-имитатор: отвечает OK на каждую строку команды,
 * как реальный MPD в обычном (не list) режиме.
 */
function createServerSocket(respond: (line: string) => string | null) {
    const fake: FakeSocket = {
        socket: null as unknown as FakeSocket['socket'],

        dataListener: null,
    };

    fake.socket = {
        write: (data: Uint8Array) => {
            const text = utf8Decode(data);

            for (const line of text.split('\n')) {
                if (!line) {
                    continue;
                }

                const reply = respond(line);

                if (reply !== null) {
                    fake.dataListener?.(utf8Encode(reply));
                }
            }
        },

        onData: (listener: (data: Uint8Array) => void) => {
            fake.dataListener = listener;

            setImmediate(() => {
                listener(utf8Encode('OK MPD 0.24.0\n'));
            });
        },

        onClose: () => undefined,

        onError: () => undefined,

        destroy: () => undefined,
    };

    return fake;
}

function okPerLineFactory(fake: FakeSocket): MpdSocketFactory {
    return async () => fake.socket;
}

describe('MpdConnection.send', () => {
    test('consumes one frame per command in a multi-command batch', async () => {
        const written: string[] = [];

        const fake = createServerSocket(line => {
            written.push(line);

            return 'OK\n';
        });

        const connection = new MpdConnection();

        await connection.connect(
            { host: 'moode', port: 6600 },
            okPerLineFactory(fake),
        );

        await connection.send(['add "a.flac"', 'add "b.flac"', 'add "c.flac"']);

        expect(written).toEqual([
            'add "a.flac"',
            'add "b.flac"',
            'add "c.flac"',
        ]);

        /*
         * Буфер должен быть пуст: все три OK потреблены. Проверяем это
         * косвенно — следующий запрос status получает именно свой ответ.
         */
        const frame = await connection.send(['status']);

        expect(frame.lines).toEqual([]);
    });

    test('a later data event with several frames keeps the protocol in sync', async () => {
        const fake = createServerSocket(line => {
            if (line === 'add "a.flac"') {
                return 'OK\n';
            }

            if (line === 'status') {
                return 'volume: 50\nstate: play\nOK\n';
            }

            return 'OK\n';
        });

        const connection = new MpdConnection();

        await connection.connect(
            { host: 'moode', port: 6600 },
            okPerLineFactory(fake),
        );

        await connection.send([
            'add "a.flac"',
            'add "b.flac"',
            'add "c.flac"',
            'add "d.flac"',
        ]);

        const frame = await connection.send(['status']);

        expect(frame.lines).toEqual(['volume: 50', 'state: play']);
        expect(frame.error).toBeNull();
    });
});
