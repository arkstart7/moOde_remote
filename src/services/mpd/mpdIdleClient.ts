/**
 * @file mpdIdleClient.ts
 * @description Отдельное соединение для подписки на события MPD через idle.
 *
 * Команда idle блокирует соединение до изменения подсистемы, поэтому
 * событийное соединение не используется для обычных команд: команды
 * и события живут на разных TCP-подключениях (так же устроены
 * MPDroid и другие клиенты).
 *
 * Клиент автоматически переподключается с экспоненциальной задержкой,
 * пока не будет остановлен через stop().
 */

import {
    MpdConnection,
    MpdConnectionConfig,
    MpdSocketFactory,
} from './mpdConnection';

import { MpdSubsystem } from './mpdTypes';

/** Задержки переподключения, мс, по числу неудачных попыток. */
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export type MpdIdleListener = (subsystems: MpdSubsystem[]) => void;

export interface MpdIdleClientOptions {
    /** Задержка переподключения; заменяется в тестах. */
    reconnectDelayMs?: (attempt: number) => number;

    /** Фабрика сокетов; заменяется в тестах. */
    socketFactory?: MpdSocketFactory;
}

/**
 * Подписчик на изменения подсистем MPD.
 */
export class MpdIdleClient {
    private running = false;

    private connection: MpdConnection | null = null;

    private config: MpdConnectionConfig | null = null;

    private subsystems: MpdSubsystem[] = [];

    private eventListener: MpdIdleListener | null = null;

    private errorListener: ((error: Error) => void) | null = null;

    private options: MpdIdleClientOptions = {};

    private loop: Promise<void> = Promise.resolve();

    /**
     * Запускает цикл idle-подписки.
     *
     * Повторный вызов stop()/start() безопасен: предыдущий цикл
     * завершается после закрытия текущего соединения.
     */
    start(
        config: MpdConnectionConfig,
        subsystems: MpdSubsystem[],
        onEvent: MpdIdleListener,
        onError: (error: Error) => void,
        options: MpdIdleClientOptions = {},
    ): void {
        if (this.running) {
            return;
        }

        this.running = true;

        this.config = config;

        this.subsystems = subsystems;

        this.eventListener = onEvent;

        this.errorListener = onError;

        this.options = options;

        this.loop = this.runLoop();
    }

    /** Останавливает цикл и закрывает соединение. */
    stop(): void {
        if (!this.running) {
            return;
        }

        this.running = false;

        this.connection?.close();

        this.connection = null;
    }

    /** Завершается, когда фоновый цикл действительно остановлен. */
    async waitStopped(): Promise<void> {
        await this.loop;
    }

    private async runLoop(): Promise<void> {
        let attempt = 0;

        while (this.running) {
            const connection = new MpdConnection();

            this.connection = connection;

            try {
                await connection.connect(
                    this.config!,
                    this.options.socketFactory,
                );

                attempt = 0;

                while (this.running) {
                    const response = await connection.send(
                        ['idle ' + this.subsystems.join(' ')],
                        /*
                         * idle блокирует соединение до события:
                         * таймаут отключается явно через null.
                         */
                        null,
                    );

                    if (!this.running) {
                        break;
                    }

                    const changed = extractChangedSubsystems(response.lines);

                    if (changed.length > 0) {
                        this.eventListener?.(changed);
                    }
                }
            } catch (error) {
                if (!this.running) {
                    break;
                }

                console.error(
                    'MPD idle connection failed, will reconnect:',
                    error instanceof Error ? error.message : error,
                );

                this.errorListener?.(
                    error instanceof Error ? error : new Error(String(error)),
                );

                connection.close();

                await this.waitReconnect(attempt);

                attempt = Math.min(attempt + 1, RECONNECT_DELAYS_MS.length - 1);
            } finally {
                if (this.connection === connection) {
                    this.connection = null;
                }
            }
        }
    }

    private async waitReconnect(attempt: number): Promise<void> {
        const delayMs =
            this.options.reconnectDelayMs?.(attempt) ??
            RECONNECT_DELAYS_MS[attempt] ??
            RECONNECT_DELAYS_MS[RECONNECT_DELAYS_MS.length - 1];

        await new Promise<void>(resolve =>
            setTimeout(() => resolve(), delayMs),
        );
    }
}

/**
 * Извлекает подсистемы из строк ответа idle ("changed: player").
 */
export function extractChangedSubsystems(lines: string[]): MpdSubsystem[] {
    const changed: MpdSubsystem[] = [];

    for (const line of lines) {
        const match = /^changed: (.+)$/.exec(line);

        if (match) {
            changed.push(match[1] as MpdSubsystem);
        }
    }

    return changed;
}
