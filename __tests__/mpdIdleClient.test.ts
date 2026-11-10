/**
 * Тесты idle-клиента MPD на подменном соединении.
 */

jest.mock('../src/services/mpd/mpdConnection', () => {
    class MockMpdConnection {
        static script: Array<() => Promise<{ lines: string[] }>> = [];

        static closedCount = 0;

        private rejectPending: ((error: Error) => void) | null = null;

        async connect(): Promise<void> {
            return Promise.resolve();
        }

        async send(): Promise<{ lines: string[] }> {
            const next = MockMpdConnection.script.shift();

            if (!next) {
                /* Без сценария соединение «зависает», как реальный idle. */
                return new Promise((_, reject) => {
                    this.rejectPending = reject;
                });
            }

            return next();
        }

        close(): void {
            MockMpdConnection.closedCount += 1;

            /* Как в реальном соединении: close отклоняет ожидающую команду. */
            this.rejectPending?.(new Error('MPD connection is closed'));

            this.rejectPending = null;
        }
    }

    return { MpdConnection: MockMpdConnection };
});

import { MpdConnection } from '../src/services/mpd/mpdConnection';

import { MpdIdleClient } from '../src/services/mpd/mpdIdleClient';

const MockConnection = MpdConnection as unknown as {
    script: Array<() => Promise<{ lines: string[] }>>;

    closedCount: number;
};

beforeEach(() => {
    MockConnection.script = [];

    MockConnection.closedCount = 0;
});

test('extracts changed subsystems and keeps listening', async () => {
    MockConnection.script = [
        () => Promise.resolve({ lines: ['changed: player'] }),

        () => Promise.resolve({ lines: ['changed: mixer'] }),
    ];

    const client = new MpdIdleClient();

    const events: string[][] = [];

    client.start(
        { host: 'raspberrypi.local', port: 6600 },
        ['player', 'mixer'],
        subsystems => events.push(subsystems),
        () => undefined,
        { reconnectDelayMs: () => 1 },
    );

    while (events.length < 2) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1));
    }

    expect(events).toEqual([['player'], ['mixer']]);

    client.stop();

    await client.waitStopped();
});

test('reconnects after a failed idle request', async () => {
    MockConnection.script = [
        () => Promise.reject(new Error('connection dropped')),

        () => Promise.resolve({ lines: ['changed: playlist'] }),
    ];

    const client = new MpdIdleClient();

    const errors: Error[] = [];

    const events: string[][] = [];

    client.start(
        { host: 'raspberrypi.local', port: 6600 },
        ['playlist'],
        subsystems => events.push(subsystems),
        error => errors.push(error),
        { reconnectDelayMs: () => 1 },
    );

    while (events.length < 1) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1));
    }

    expect(errors).toEqual([new Error('connection dropped')]);

    expect(events).toEqual([['playlist']]);

    client.stop();

    await client.waitStopped();
});

test('stop closes the current idle connection and exits the loop', async () => {
    /* Пустой сценарий: send «зависает», как реальный idle. */
    MockConnection.script = [];

    const client = new MpdIdleClient();

    client.start(
        { host: 'raspberrypi.local', port: 6600 },
        ['player'],
        () => undefined,
        () => undefined,
        { reconnectDelayMs: () => 1 },
    );

    await new Promise<void>(resolve => setTimeout(() => resolve(), 5));

    client.stop();

    await client.waitStopped();

    expect(MockConnection.closedCount).toBeGreaterThan(0);

    expect((client as unknown as { running: boolean }).running).toBe(false);
});
