/**
 * @file beefwebArtworkService.ts
 *
 * @description
 * Загрузка байтов обложек через artwork API Beefweb.
 *
 * Beefweb умеет отдавать обложку только для элемента плейлиста:
 *
 *     GET /api/artwork/{playlistId}/{itemIndex}
 *
 * В качестве плейлиста используется общий каталог
 * "beefweb-catalog" (см. beefwebCatalogService): он содержит все
 * треки библиотеки, поэтому каждый альбом представлен в нем
 * многократно. Соответствие "альбом → индекс элемента" строится
 * в albumArtService по путям строк каталога; этот модуль отвечает
 * только за скачивание изображения и кодирование base64.
 *
 * Ответ /api/artwork — это байты изображения, найденного штатным
 * artwork reader foobar2000 (встроенная обложка, cover.jpg,
 * folder.jpg и так далее). 404 означает, что обложки нет, и является
 * нормальной ситуацией, а не ошибкой.
 */

import { fetchWithTimeout } from './fetchWithTimeout';

import { LocalizedError } from '../i18n';

/** Таймаут одного запроса к Beefweb. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Загружает обложку альбома как base64.
 *
 * Возвращает null, если у трека нет обложки (HTTP 404).
 * Метод не отклоняется из-за отсутствия картинки: это норма.
 */
export async function fetchBeefwebArtworkBase64(
    beefwebUrl: string,
    playlistId: string | number,
    itemIndex: number,
): Promise<string | null> {
    const url =
        `${beefwebUrl}/api/artwork/` +
        `${encodeURIComponent(String(playlistId))}/${itemIndex}`;

    const response = await fetchWithTimeout(url, undefined, REQUEST_TIMEOUT_MS);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new LocalizedError('err.artwork.fetchFailedHttp', {
            status: response.status,
        });
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0) {
        throw new LocalizedError('err.artwork.emptyResponse');
    }

    return arrayBufferToBase64(buffer);
}

/**
 * Преобразует байты ответа в base64 порциями,
 * чтобы не упереться в лимит аргументов функции.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);

    const chunkSize = 0x8000;

    let binary = '';

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(offset, offset + chunkSize),
        );
    }

    return encodeBinaryToBase64(binary);
}

/**
 * Кодирует бинарную строку в base64.
 *
 * В React Native функция btoa доступна во время выполнения,
 * но не объявлена в типах, поэтому читается из globalThis.
 */
function encodeBinaryToBase64(binary: string): string {
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
