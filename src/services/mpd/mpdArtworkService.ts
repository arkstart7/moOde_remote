/**
 * @file mpdArtworkService.ts
 *
 * @description
 * Загрузка байтов обложек напрямую из MPD.
 *
 * MPD отдает обложки двумя командами бинарного протокола:
 *
 *     albumart <uri> <offset>      — обложка рядом с файлом (cover.jpg и т.п.);
 *     readpicture <uri> <offset>   — встроенная обложка внутри аудиофайла.
 *
 * Важно: MPD (0.24) отдает бинарные ответы потоково, чанками по
 * 8192 байта (или меньше в конце) и БЕЗ завершающего OK, пока
 * клиент не соберет весь объем, известный из поля size. Поэтому
 * обложка запрашивается циклом: каждый ответ содержит чанк, следующий
 * запрос — с offset += длина чанка, до offset >= size. Отсутствие
 * картинки — нормальная ситуация, а не ошибка: команда отвечает
 * ACK или пустым OK без поля binary.
 */

import { runMpdCommand } from './mpdClient';

import { quoteMpdArg } from './mpdParser';

import { MpdAckError } from './mpdTypes';

import { LocalizedError } from '../../i18n';

/**
 * Таймаут бинарных запросов обложек.
 *
 * readpicture сканирует аудиофайл целиком: на больших файлах
 * (сотни мегабайт, например длинный WAV) ответ может занимать
 * десятки секунд, поэтому стандартный COMMAND_TIMEOUT_MS (10 с)
 * не подходит: таймаут закрывает соединение и срывает команды
 * других воркеров, поставленные в очередь.
 */
export const ARTWORK_TIMEOUT_MS = 60_000;

/** Защита от бесконечного цикла чанков: разумный предел обложки. */
const MAX_ARTWORK_BYTES = 32 * 1024 * 1024;

/**
 * Загружает обложку для пути трека.
 *
 * Сначала используется albumart (файл-обложка в каталоге альбома),
 * затем readpicture (встроенная обложка).
 *
 * Возвращает null, если обложки нет.
 */
export async function fetchMpdArtwork(
    path: string,
): Promise<Uint8Array | null> {
    /*
     * Транспортный сбой одной команды (например, MPD закрыл
     * соединение) не отменяет вторую попытку: она выполняется
     * по заново открытому соединению. Ошибка выбрасывается,
     * только если не сработали обе команды.
     */
    let lastError: unknown = null;

    let bytes = await fetchChunkedBinary('albumart', path).catch(error => {
        lastError = error;

        return null;
    });

    if (bytes) {
        return bytes;
    }

    bytes = await fetchChunkedBinary('readpicture', path).catch(error => {
        lastError = error;

        return null;
    });

    if (bytes) {
        return bytes;
    }

    if (lastError) {
        throw lastError;
    }

    return null;
}

/**
 * Загружает бинарный ответ потоково, чанками.
 *
 * Каждый запрос возвращает один чанк: поле size — полный размер
 * изображения, поле binary — очередной кусок от offset. Чанки
 * накапливаются, пока offset не достигнет size; ответ без поля
 * binary означает конец данных.
 *
 * Ошибка ACK означает отсутствие обложки и приводит к null;
 * транспортные ошибки оборачиваются в LocalizedError.
 */
async function fetchChunkedBinary(
    command: 'albumart' | 'readpicture',
    path: string,
): Promise<Uint8Array | null> {
    const quotedPath = quoteMpdArg(path);

    const chunks: Uint8Array[] = [];

    let totalSize: number | null = null;

    let offset = 0;

    while (true) {
        let frame;

        try {
            frame = await runMpdCommand(
                [command, quotedPath, String(offset)],
                ARTWORK_TIMEOUT_MS,
            );
        } catch (error) {
            /*
             * MPD отвечает ACK, когда обложки нет: это нормальная
             * ситуация, а не ошибка — возвращаем null.
             */
            if (error instanceof MpdAckError) {
                return null;
            }

            throw new LocalizedError('err.artwork.fetchFailed', {
                details: ` (${path}: ${
                    error instanceof Error ? error.message : String(error)
                })`,
            });
        }

        if (totalSize === null) {
            const sizeLine = frame.lines.find(line =>
                /^size: (\d+)$/.test(line),
            );

            totalSize = sizeLine
                ? Number.parseInt(sizeLine.slice(6), 10)
                : null;
        }

        const chunk = frame.binaries.find(binary => binary.length > 0);

        if (!chunk) {
            break;
        }

        chunks.push(chunk);

        offset += chunk.length;

        if (totalSize !== null && offset >= totalSize) {
            break;
        }

        if (totalSize === null) {
            /*
             * Сервер без поля size: считаем ответ одночанковым,
             * иначе цикл не имел бы условия остановки.
             */
            break;
        }

        if (offset > MAX_ARTWORK_BYTES) {
            console.warn(
                'Album artwork exceeds size limit, discarding:',
                path,
                offset,
            );

            return null;
        }
    }

    if (chunks.length === 0) {
        return null;
    }

    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

    const result = new Uint8Array(total);

    let position = 0;

    for (const chunk of chunks) {
        result.set(chunk, position);

        position += chunk.length;
    }

    return result;
}

/**
 * Кодирует байты обложки в base64 порциями,
 * чтобы не упереться в лимит аргументов функции.
 *
 * В React Native функция btoa доступна во время выполнения,
 * но не объявлена в типах, поэтому читается из globalThis.
 */
export function bytesToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;

    let binary = '';

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(offset, offset + chunkSize),
        );
    }

    const encode = (
        globalThis as {
            btoa?: (data: string) => string;
        }
    ).btoa;

    if (!encode) {
        throw new LocalizedError('err.artwork.base64Unavailable');
    }

    return encode(binary);
}
