/**
 * @file mpdClient.ts
 *
 * @description
 * Единое командное TCP-соединение с MPD для всех сервисов.
 *
 * Команды управления (status, play, add, ...) выполняются на одном
 * соединении; события idle работают на отдельном соединении
 * (см. mpdIdleClient.ts), потому что idle блокирует свой канал.
 *
 * Соединение создается лениво по настройкам приложения и
 * автоматически пересоздается после закрытия транспорта или
 * смены настроек (host/port/пароль).
 */

import { loadSettings } from '../settingsService';

import { LocalizedError } from '../../i18n';

import {
    MpdConnection,
    MpdConnectionConfig,
    MpdSocketFactory,
    tcpSocketFactory,
} from './mpdConnection';

import { MpdFramedResponse } from './mpdParser';

import { MpdAckError } from './mpdTypes';

/** Порт MPD по умолчанию (moOde использует именно его). */
export const DEFAULT_MPD_PORT = 6600;

/** Результат разбора адреса из настроек. */
export interface MpdAddress {
    host: string;

    /** Порт, если он был указан в адресе. */
    portFromUrl: string;
}

/**
 * Выделяет имя хоста (и при необходимости порт) из адреса,
 * который пользователь ввел в настройках.
 *
 * Допускаются варианты:
 *
 *     raspberrypi.local
 *     http://raspberrypi.local
 *     https://192.168.1.100/
 *     [::1]
 */
export function extractMpdHost(value: string): MpdAddress {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        throw new LocalizedError('err.url.empty');
    }

    let address = trimmedValue.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');

    address = address.split('/', 1)[0];

    /*
     * Учетные данные вида user:pass@host не имеют смысла для TCP:
     * отбрасываем их.
     */
    const atIndex = address.lastIndexOf('@');

    if (atIndex !== -1) {
        address = address.slice(atIndex + 1);
    }

    let hostPart = address;

    let portFromUrl = '';

    if (address.startsWith('[')) {
        /*
         * IPv6-литерал: порт после закрывающей скобки.
         */
        const bracketEnd = address.indexOf(']');

        if (bracketEnd === -1) {
            throw new LocalizedError('err.url.invalid');
        }

        hostPart = address.slice(0, bracketEnd + 1);

        portFromUrl = address.slice(bracketEnd + 2);
    } else {
        const colonIndex = address.lastIndexOf(':');

        if (colonIndex !== -1) {
            hostPart = address.slice(0, colonIndex);

            portFromUrl = address.slice(colonIndex + 1);
        }
    }

    hostPart = hostPart.trim();

    if (!hostPart || hostPart.endsWith('@')) {
        throw new LocalizedError('err.url.invalid');
    }

    return { host: hostPart, portFromUrl: portFromUrl.trim() };
}

/**
 * Собирает конфигурацию MPD из полей настроек.
 *
 * Используется и клиентом, и валидатором настроек: проверка
 * связи должна работать с отредактированными, а не с
 * сохраненными значениями.
 */
export function buildMpdConfig(
    serverUrl: string,
    serverPort: string,
): MpdConnectionConfig {
    const { host, portFromUrl } = extractMpdHost(serverUrl);

    const settingsPort = serverPort.trim();

    let port = DEFAULT_MPD_PORT;

    if (settingsPort) {
        if (!/^\d+$/.test(settingsPort)) {
            throw new LocalizedError('err.port.notNumber');
        }

        port = Number(settingsPort);
    } else if (/^\d+$/.test(portFromUrl)) {
        port = Number(portFromUrl);
    }

    if (port < 1 || port > 65535) {
        throw new LocalizedError('err.port.outOfRange');
    }

    return { host, port };
}

/**
 * Собирает конфигурацию MPD из сохраненных настроек.
 *
 * Повторные вызовы читают кэш настроек и не обращаются
 * к AsyncStorage, поэтому функция безопасна в цикле опроса.
 */
export async function resolveMpdConfig(): Promise<MpdConnectionConfig> {
    const settings = await loadSettings();

    if (!settings || !settings.host.trim()) {
        throw new LocalizedError('err.settings.notFound');
    }

    return buildMpdConfig(settings.host, settings.port);
}

/**
 * Возвращает ключ конфигурации для отслеживания смены настроек.
 */
function toConfigKey(config: MpdConnectionConfig): string {
    return `${config.host}:${config.port}:${config.password ?? ''}`;
}

let connection: MpdConnection | null = null;

let connectionKey = '';

let connecting: Promise<MpdConnection> | null = null;

let socketFactory: MpdSocketFactory = tcpSocketFactory;

/** Подменяет фабрику сокетов (для тестов). */
export function setMpdSocketFactory(factory: MpdSocketFactory): void {
    socketFactory = factory;
}

/** Закрывает соединение (для тестов и явного сброса). */
export function resetMpdClient(): void {
    connecting = null;

    if (connection) {
        connection.close();

        connection = null;
    }

    connectionKey = '';
}

/**
 * Возвращает активное командное соединение,
 * при необходимости открывая новое.
 */
export async function getMpdCommandConnection(): Promise<MpdConnection> {
    if (connection?.connected) {
        return connection;
    }

    if (connecting) {
        return connecting;
    }

    const config = await resolveMpdConfig();

    const key = toConfigKey(config);

    if (connection && connectionKey !== key) {
        connection.close();

        connection = null;
    }

    const attempt = (async (): Promise<MpdConnection> => {
        const created = new MpdConnection();

        await created.connect(config, socketFactory);

        connection = created;

        connectionKey = key;

        created.onClose(() => {
            if (connection === created) {
                connection = null;
            }
        });

        return created;
    })();

    connecting = attempt;

    try {
        return await attempt;
    } finally {
        if (connecting === attempt) {
            connecting = null;
        }
    }
}

/**
 * Выполняет список команд MPD и возвращает кадр ответа.
 *
 * Ошибка ACK возвращается как MpdAckError (соединение сохраняется),
 * транспортный сброс закрывает соединение: следующая команда
 * установит его заново. Таймаут можно переопределить для
 * долгих команд (например, бинарных запросов обложек).
 */
export async function runMpdCommand(
    commands: string[],
    timeoutMs?: number,
): Promise<MpdFramedResponse> {
    let current: MpdConnection;

    try {
        current = await getMpdCommandConnection();
    } catch (error) {
        connection = null;

        throw error;
    }

    try {
        return await current.send(commands, timeoutMs);
    } catch (error) {
        if (!(error instanceof MpdAckError)) {
            /*
             * Диагностика первопричины: этот сбой закрывает соединение
             * и срывает все команды, поставленные в очередь на нем,
             * с обезличенным "MPD connection is closed". Логируем именно
             * исходную ошибку (warn, чтобы не поднимать LogBox).
             */
            console.warn(
                'MPD command failed, closing connection:',
                commands[0],
                error,
            );

            current.close();

            if (connection === current) {
                connection = null;
            }
        }

        throw error;
    }
}
