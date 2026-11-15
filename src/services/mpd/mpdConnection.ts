/**
 * @file mpdConnection.ts
 * @description TCP-соединение с MPD: кадрирование ответов и очередь команд.
 *
 * Соединение посылает команды строго по одной (MPD обрабатывает
 * соединение последовательно) и возвращает на каждую команду один
 * кадр ответа. Бинарные ответы (albumart, readpicture) собираются
 * парсером на байтовом уровне, см. mpdParser.readFramedResponse.
 */

import TcpSocket from 'react-native-tcp-socket';

import {
    MpdFramedResponse,
    quoteMpdArg,
    readFramedResponse,
} from './mpdParser';

import { utf8Decode, utf8Encode } from './mpdText';

/** Настройки соединения с MPD на Raspberry Pi. */
export interface MpdConnectionConfig {
    host: string;

    port: number;

    /** Пароль, если на MPD настроена авторизация. */
    password?: string;
}

/** Минимальный интерфейс сокета, достаточный клиенту MPD. */
export interface MpdSocketLike {
    write(data: Uint8Array): void;

    onData(listener: (data: Uint8Array) => void): void;

    onClose(listener: () => void): void;

    onError(listener: (error: Error) => void): void;

    destroy(): void;
}

/** Фабрика сокетов: заменяется в тестах. */
export type MpdSocketFactory = (
    host: string,
    port: number,
) => Promise<MpdSocketLike>;

/** Таймаут ожидания ответа на обычную команду. */
export const COMMAND_TIMEOUT_MS = 10_000;

/**
 * Таймаут установления TCP-соединения.
 *
 * Отдельный от COMMAND_TIMEOUT_MS, потому что тот начинает действовать
 * только после открытия сокета. Без этого таймаута connect к
 * недоступному хосту (молчаливая потеря пакетов) висит на системном
 * TCP-ретрансмите до двух минут и дольше.
 */
export const CONNECT_TIMEOUT_MS = 5_000;

/** Приводит данные сокета к Uint8Array независимо от формы доставки. */
export function toSocketBytes(data: unknown): Uint8Array {
    if (typeof data === 'string') {
        return utf8Encode(data);
    }

    if (data instanceof Uint8Array) {
        return data;
    }

    if (typeof data === 'object' && data !== null && 'buffer' in data) {
        const view = data as ArrayBufferView;

        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }

    if (Array.isArray(data)) {
        return new Uint8Array(data);
    }

    throw new Error('Unsupported socket data type');
}

/** Фабрика по умолчанию: react-native-tcp-socket. */
export const tcpSocketFactory: MpdSocketFactory = (host, port) => {
    return new Promise((resolve, reject) => {
        let socket: ReturnType<typeof TcpSocket.connect> | null = null;

        let connectTimer: ReturnType<typeof setTimeout> | null = null;

        let settled = false;

        const fail = (error: unknown): void => {
            if (settled) {
                return;
            }

            settled = true;

            if (connectTimer !== null) {
                clearTimeout(connectTimer);

                connectTimer = null;
            }

            socket?.destroy();

            reject(error instanceof Error ? error : new Error(String(error)));
        };

        try {
            connectTimer = setTimeout(() => {
                fail(
                    new Error(
                        `Connection timeout (${CONNECT_TIMEOUT_MS} ms) to ${host}:${port}`,
                    ),
                );
            }, CONNECT_TIMEOUT_MS);

            socket = TcpSocket.connect({ host, port }, () => {
                if (settled) {
                    return;
                }

                settled = true;

                if (connectTimer !== null) {
                    clearTimeout(connectTimer);

                    connectTimer = null;
                }

                resolve({
                    write: data => socket?.write(data as never),

                    onData: listener =>
                        socket?.on('data', (data: unknown) =>
                            listener(toSocketBytes(data)),
                        ),

                    onClose: listener => socket?.on('close', listener),

                    onError: listener =>
                        socket?.on('error', (error: unknown) =>
                            listener(
                                error instanceof Error
                                    ? error
                                    : new Error(String(error)),
                            ),
                        ),

                    destroy: () => socket?.destroy(),
                });
            });
        } catch (error) {
            fail(error);

            return;
        }

        socket.on('error', fail);
    });
};

/**
 * Накапливает входящие байты с растущей емкостью.
 *
 * Повторное копирование всего буфера на каждый чанк недопустимо:
 * ответы listallinfo для большой библиотеки составляют мегабайты.
 */
class ByteBuffer {
    private data = new Uint8Array(4096);

    private length = 0;

    append(chunk: Uint8Array): void {
        if (this.length + chunk.length > this.data.length) {
            let capacity = this.data.length * 2;

            while (capacity < this.length + chunk.length) {
                capacity *= 2;
            }

            const grown = new Uint8Array(capacity);

            grown.set(this.data.subarray(0, this.length));

            this.data = grown;
        }

        this.data.set(chunk, this.length);

        this.length += chunk.length;
    }

    /** Возвращает активную часть буфера без копирования. */
    view(): Uint8Array {
        return this.data.subarray(0, this.length);
    }

    consume(count: number): void {
        this.data.copyWithin(0, count, this.length);

        this.length -= count;
    }
}

/**
 * Управляемое соединение с MPD.
 */
export class MpdConnection {
    private socket: MpdSocketLike | null = null;

    private buffer = new ByteBuffer();

    private queue: Promise<unknown> = Promise.resolve();

    /** Сколько команд отправлено за жизнь соединения (диагностика). */
    private commandsSent = 0;

    /** Сколько байт получено за жизнь соединения (диагностика). */
    private bytesReceived = 0;

    private pending: {
        resolve: (response: MpdFramedResponse) => void;

        reject: (error: Error) => void;

        timer: ReturnType<typeof setTimeout> | null;

        /**
         * Сколько кадров-терминаторов (OK/list_OK/ACK) еще ожидается:
         * MPD отвечает по одному кадру на каждую команду посылки.
         */
        remainingFrames: number;

        /** Последний разобранный промежуточный кадр посылки. */
        lastResponse: MpdFramedResponse | null;

        /** Короткая метка посылки для диагностики обрывов. */
        command: string;

        /** Момент отправки посылки (Date.now()), для диагностики. */
        sentAt: number;
    } | null = null;

    private closedByRemote = false;

    /**
     * Ожидание строки приветствия.
     *
     * Приветствие "OK MPD версия" считается терминатором кадра
     * в readFramedResponse() и не попадает в lines, поэтому оно
     * читается напрямую из буфера до первой строки.
     */
    private greetingWaiter: {
        resolve: (line: string) => void;

        reject: (error: Error) => void;

        timer: ReturnType<typeof setTimeout>;
    } | null = null;

    private closeListeners = new Set<() => void>();

    /** Возвращает true, пока соединение открыто. */
    get connected(): boolean {
        return this.socket !== null;
    }

    /**
     * Подписка на закрытие соединения удаленной стороной или ошибку
     * транспорта: используется idle-клиентом для переподключения.
     */
    onClose(listener: () => void): () => void {
        this.closeListeners.add(listener);

        return () => {
            this.closeListeners.delete(listener);
        };
    }

    /**
     * Открывает соединение, читает приветствие "OK MPD версия"
     * и при необходимости выполняет авторизацию паролем.
     */
    async connect(
        config: MpdConnectionConfig,
        socketFactory: MpdSocketFactory = tcpSocketFactory,
    ): Promise<void> {
        if (this.socket) {
            throw new Error('MPD connection is already open');
        }

        this.closedByRemote = false;

        this.buffer = new ByteBuffer();

        const socket = await socketFactory(config.host, config.port);

        socket.onData(data => this.handleData(data));

        socket.onClose(() => this.handleClose());

        socket.onError(error => {
            console.warn('MPD socket error:', error.message);

            this.handleClose();
        });

        this.socket = socket;

        try {
            const greeting = await this.readGreeting(COMMAND_TIMEOUT_MS);

            if (!/^OK MPD \d/.test(greeting)) {
                throw new Error(`Unexpected MPD greeting: ${greeting}`);
            }

            if (config.password) {
                await this.send(['password ' + quoteMpdArg(config.password)]);
            }
        } catch (error) {
            this.destroy();

            throw error;
        }
    }

    /**
     * Читает строку приветствия напрямую из буфера.
     *
     * Приветствие не является ответом на команду, поэтому
     * очередь команд и кадры readFramedResponse не затрагиваются.
     */
    private readGreeting(timeoutMs: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.greetingWaiter = {
                resolve,

                reject,

                timer: setTimeout(() => {
                    this.greetingWaiter = null;

                    reject(new Error('MPD response timeout'));
                }, timeoutMs),
            };

            this.extractGreeting();
        });
    }

    /**
     * Ищет в буфере первую завершенную строку
     * и возвращает ее ожидающему приветствие.
     */
    private extractGreeting(): void {
        const waiter = this.greetingWaiter;

        if (!waiter) {
            return;
        }

        const view = this.buffer.view();

        const newlineIndex = view.indexOf(0x0a);

        if (newlineIndex === -1) {
            return;
        }

        const line = utf8Decode(view.subarray(0, newlineIndex));

        this.buffer.consume(newlineIndex + 1);

        clearTimeout(waiter.timer);

        this.greetingWaiter = null;

        waiter.resolve(line);
    }

    /**
     * Отправляет команды и возвращает кадр ответа.
     *
     * Команды с параметрами должны быть собраны через
     * buildMpdCommand(). Ошибка ACK выбрасывается как MpdAckError.
     *
     * Для блокирующих команд (idle) таймаут отключается передачей
     * timeoutMs = null: значение undefined подставило бы дефолт.
     */
    async send(
        commands: string[],
        timeoutMs: number | null = COMMAND_TIMEOUT_MS,
    ): Promise<MpdFramedResponse> {
        if (!this.socket) {
            throw new Error('MPD connection is closed');
        }

        const run = (): Promise<MpdFramedResponse> =>
            new Promise((resolve, reject) => {
                if (!this.socket) {
                    reject(new Error('MPD connection is closed'));

                    return;
                }

                const timer =
                    timeoutMs === null
                        ? null
                        : setTimeout(() => {
                              this.failPending(
                                  new Error('MPD response timeout'),
                              );
                          }, timeoutMs);

                this.pending = {
                    resolve,
                    reject,
                    timer,

                    /*
                     * MPD отвечает одним кадром на каждую команду посылки
                     * (в обычном режиме — OK на каждую строку). Ждем все
                     * кадры, иначе они останутся в буфере и рассинхронизируют
                     * последующие команды.
                     */
                    remainingFrames: commands.length,

                    lastResponse: null,

                    command: commands.join('; ').slice(0, 120),

                    sentAt: Date.now(),
                };

                this.commandsSent += commands.length;

                this.socket.write(utf8Encode(commands.join('\n') + '\n'));
            });

        /*
         * Команды выполняются строго последовательно, чтобы ответ
         * каждой команды соответствовал именно её запросу.
         */
        const result = this.queue.then(run, run);

        this.queue = result.catch(() => undefined);

        const response = await result;

        if (response.error) {
            throw response.error;
        }

        return response;
    }

    /** Закрывает соединение; ожидающие команды получают ошибку. */
    close(): void {
        this.destroy();
    }

    private handleData(data: Uint8Array): void {
        this.buffer.append(data);

        this.bytesReceived += data.length;

        this.extractGreeting();

        /*
         * Разбираем все полные кадры, доступные в буфере: на посылку из
         * N команд MPD отвечает N кадрами, которые могут прийти одним
         * пакетом TCP. Ждем последний кадр посылки; ACK прерывает ее
         * досрочно. Промежуточные кадры запоминаются, а возвращается
         * последний (для мутаций вроде add все кадры пустые).
         */
        while (this.pending) {
            const { response, consumed } = readFramedResponse(
                this.buffer.view(),
            );

            if (!response) {
                return;
            }

            this.buffer.consume(consumed);

            const pending = this.pending;

            pending.lastResponse = response;

            pending.remainingFrames -= 1;

            if (pending.remainingFrames <= 0 || response.error) {
                this.pending = null;

                if (pending.timer !== null) {
                    clearTimeout(pending.timer);
                }

                pending.resolve(response);
            }
        }
    }

    private destroy(): void {
        if (this.socket) {
            const socket = this.socket;

            this.socket = null;

            socket.destroy();
        }

        this.failPending(new Error('MPD connection is closed'));

        this.failGreeting(new Error('MPD connection is closed'));

        if (this.closedByRemote) {
            this.closedByRemote = false;

            this.closeListeners.forEach(listener => listener());
        }
    }

    private handleClose(): void {
        if (!this.socket) {
            return;
        }

        /*
         * Диагностика закрытия удаленной стороной: метрики жизни
         * соединения помогают отличить серверный разрыв от
         * остановки потока данных (дамп буфера убран после
         * подтверждения корневой причины).
         */
        const pending = this.pending;

        console.warn(
            'MPD connection closed by remote:',
            `pending=${pending ? 'yes' : 'no'}`,
            pending ? `pendingCommand=${pending.command}` : '',
            pending ? `pendingForMs=${Date.now() - pending.sentAt}` : '',
            `sent=${this.commandsSent}`,
            `received=${this.bytesReceived}`,
        );

        this.closedByRemote = true;

        this.destroy();
    }

    private failGreeting(error: Error): void {
        const waiter = this.greetingWaiter;

        if (!waiter) {
            return;
        }

        this.greetingWaiter = null;

        clearTimeout(waiter.timer);

        waiter.reject(error);
    }

    private failPending(error: Error): void {
        const pending = this.pending;

        if (!pending) {
            return;
        }

        this.pending = null;

        if (pending.timer !== null) {
            clearTimeout(pending.timer);
        }

        pending.reject(error);
    }
}
