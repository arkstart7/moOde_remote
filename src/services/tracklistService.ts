/**
 * @file tracklistService.ts
 *
 * @description
 * Загрузка списка плейлистов для экрана "Плейлисты".
 *
 * Из списка исключаются:
 *
 * - служебные плейлисты: Default, beefweb, beefweb-catalog;
 * - плейлисты, в которых нет треков.
 *
 * Количество треков берется из поля itemCount ответа
 * GET /api/playlists, поэтому дополнительных запросов
 * к элементам каждого плейлиста не требуется.
 */

import { resolveBeefwebUrl } from './beefwebUrl';

import { fetchWithTimeout } from './fetchWithTimeout';

import { ErrorDescriptor, LocalizedError, toHttpLocalizedError } from '../i18n';

import { PlaylistTrackInfo } from '../library/types';

/** Таймаут одного запроса к Beefweb. */
const REQUEST_TIMEOUT_MS = 5000;

/** Размер страницы при чтении строк плейлиста. */
const PLAYLIST_ITEMS_PAGE_SIZE = 1000;

/** Защита от зацикливания при чтении строк плейлиста. */
const PLAYLIST_ITEMS_MAX_ROWS = 100000;

/**
 * Имена служебных плейлистов, которые не показываются
 * на экране "Плейлисты". Сравнение выполняется без учета регистра.
 */
const EXCLUDED_PLAYLIST_NAMES = new Set([
    'default',
    'default playlist',
    'beefweb',
    'beefweb-catalog',
]);

/**
 * Плейлист, доступный для отображения на экране "Плейлисты".
 */
export interface TracklistPlaylist {
    id: string | number;
    title: string;
    itemCount: number;
}

/**
 * Ответ GET /api/playlists.
 */
interface GetPlaylistsResponse {
    playlists?: Array<{
        id?: string | number;
        title?: string;
        itemCount?: number;
    }>;
}

/**
 * Ответ GET /api/playlists/{id}/items/{range}.
 */
interface GetPlaylistItemsResponse {
    playlistItems?: {
        offset?: number;
        totalItems?: number;
        items?: Array<{
            columns?: unknown[];
        }>;
    };
}

/**
 * Загружает список плейлистов для экрана "Плейлисты".
 *
 * Возвращает только пользовательские плейлисты,
 * в которых есть хотя бы один трек.
 */
export async function loadTracklistPlaylists(): Promise<TracklistPlaylist[]> {
    const beefwebUrl = await resolveBeefwebUrl();

    const operation: ErrorDescriptor = {
        code: 'err.playlists.listFailed',
    };

    let response: Response;

    try {
        response = await fetchWithTimeout(
            `${beefwebUrl}/api/playlists`,
            undefined,
            REQUEST_TIMEOUT_MS,
        );
    } catch (error) {
        throw new LocalizedError(operation.code, {
            details:
                error instanceof Error
                    ? ` ${error.message}`
                    : ' Network request failed',
        });
    }

    if (!response.ok) {
        let details = '';

        try {
            const text = await response.text();

            if (text) {
                details = ` ${text}`;
            }
        } catch {
            /*
             * Ошибку чтения тела ответа игнорируем.
             */
        }

        throw toHttpLocalizedError(operation, response.status, details);
    }

    let data: unknown;

    try {
        data = await response.json();
    } catch {
        throw new LocalizedError('err.response.invalid');
    }

    return extractTracklistPlaylists(data);
}

/**
 * Преобразует проверенный ответ сервера в список плейлистов.
 */
function extractTracklistPlaylists(data: unknown): TracklistPlaylist[] {
    if (typeof data !== 'object' || data === null) {
        throw new LocalizedError('err.response.invalid');
    }

    const playlists = (data as GetPlaylistsResponse).playlists;

    if (!Array.isArray(playlists)) {
        throw new LocalizedError('err.response.invalid');
    }

    const result: TracklistPlaylist[] = [];

    for (const playlist of playlists) {
        if (typeof playlist !== 'object' || playlist === null) {
            continue;
        }

        const { id, title, itemCount } = playlist;

        if (
            (typeof id !== 'string' && typeof id !== 'number') ||
            typeof title !== 'string' ||
            typeof itemCount !== 'number' ||
            !Number.isFinite(itemCount)
        ) {
            continue;
        }

        /*
         * Служебные плейлисты не показываются.
         */
        if (EXCLUDED_PLAYLIST_NAMES.has(title.trim().toLowerCase())) {
            continue;
        }

        /*
         * Пустые плейлисты не показываются.
         */
        if (itemCount <= 0) {
            continue;
        }

        result.push({ id, title, itemCount });
    }

    return result;
}

/*
 * ============================================================
 * Чтение строк плейлиста
 * ============================================================
 */

/**
 * Колонки строк плейлиста: путь и метаданные.
 *
 * Метаданные нужны, чтобы показывать треки, которых нет
 * в медиатеке (например, строки .cue-альбомов): по пути
 * такие строки с медиатекой не сопоставляются.
 */
const TRACK_INFO_COLUMNS = [
    '%path%',
    '$meta(title)',
    '$meta(artist)',
    '$meta(album)',
    '%length_seconds%',
];

/** Индексы значений в columns ответа для TRACK_INFO_COLUMNS. */
const TRACK_INFO_COLUMN_INDEX = {
    PATH: 0,
    TITLE: 1,
    ARTIST: 2,
    ALBUM: 3,
    LENGTH_SECONDS: 4,
} as const;

/**
 * Читает все треки плейлиста вместе с метаданными строк.
 *
 * GET /api/playlists/{id}/items/{range}?columns=...
 *
 * Чтение выполняется постранично: 1000 строк за запрос.
 * Защита от зацикливания: не более 100000 строк.
 */
export async function readPlaylistTrackInfo(
    playlistId: string | number,
): Promise<PlaylistTrackInfo[]> {
    const rows = await readPlaylistItemRows(playlistId, TRACK_INFO_COLUMNS);

    return rows.map(row => {
        const path = row[TRACK_INFO_COLUMN_INDEX.PATH] ?? '';

        const lengthText = row[TRACK_INFO_COLUMN_INDEX.LENGTH_SECONDS];

        const lengthSeconds =
            lengthText !== undefined && lengthText.trim() !== ''
                ? Number.parseFloat(lengthText)
                : Number.NaN;

        return {
            path,
            title: nonEmptyOrNull(row[TRACK_INFO_COLUMN_INDEX.TITLE]),
            artist: nonEmptyOrNull(row[TRACK_INFO_COLUMN_INDEX.ARTIST]),
            album: nonEmptyOrNull(row[TRACK_INFO_COLUMN_INDEX.ALBUM]),
            durationSeconds: Number.isFinite(lengthSeconds)
                ? lengthSeconds
                : null,
        };
    });
}

/**
 * Возвращает значение колонки или null для пустых строк.
 */
function nonEmptyOrNull(value: string | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed === '' ? null : (value ?? null);
}

/**
 * Читает пути всех треков плейлиста.
 *
 * GET /api/playlists/{id}/items/{range}?columns=%path%
 *
 * Чтение выполняется постранично: 1000 строк за запрос.
 * Защита от зацикливания: не более 100000 строк.
 */
export async function readPlaylistTrackPaths(
    playlistId: string | number,
): Promise<string[]> {
    const rows = await readPlaylistItemRows(playlistId, ['%path%']);

    return rows.map(row => row[0] ?? '');
}

/**
 * Читает заданные колонки всех строк плейлиста постранично.
 *
 * @param playlistId ID плейлиста Beefweb.
 * @param columns Выражения колонок Beefweb (%path%, $meta(...) и т.п.).
 */
async function readPlaylistItemRows(
    playlistId: string | number,
    columns: readonly string[],
): Promise<string[][]> {
    const beefwebUrl = await resolveBeefwebUrl();

    const operation: ErrorDescriptor = {
        code: 'err.playlist.itemsFailed',
    };

    const rows: string[][] = [];

    let offset = 0;
    let totalItems = Number.POSITIVE_INFINITY;

    while (offset < totalItems && offset < PLAYLIST_ITEMS_MAX_ROWS) {
        const rangeEnd = offset + PLAYLIST_ITEMS_PAGE_SIZE - 1;

        const url =
            `${beefwebUrl}/api/playlists/` +
            `${encodeURIComponent(String(playlistId))}/` +
            `items/${offset}:${rangeEnd}?columns=` +
            encodeURIComponent(columns.join(','));

        let response: Response;

        try {
            response = await fetchWithTimeout(
                url,
                undefined,
                REQUEST_TIMEOUT_MS,
            );
        } catch (error) {
            throw new LocalizedError(operation.code, {
                details:
                    error instanceof Error
                        ? ` ${error.message}`
                        : ' Network request failed',
            });
        }

        if (!response.ok) {
            let details = '';

            try {
                const text = await response.text();

                if (text) {
                    details = ` ${text}`;
                }
            } catch {
                /*
                 * Ошибку чтения тела ответа игнорируем.
                 */
            }

            throw toHttpLocalizedError(operation, response.status, details);
        }

        let data: unknown;

        try {
            data = await response.json();
        } catch {
            throw new LocalizedError('err.response.invalid');
        }

        const page = extractPlaylistItems(data);

        for (const row of page.rows) {
            rows.push(row);
        }

        totalItems = page.totalItems;
        offset += PLAYLIST_ITEMS_PAGE_SIZE;
    }

    return rows;
}

/**
 * Преобразует проверенный ответ сервера
 * в строки (columns) элементов плейлиста.
 */
function extractPlaylistItems(
    data: unknown,
): { rows: string[][]; totalItems: number } {
    if (typeof data !== 'object' || data === null) {
        throw new LocalizedError('err.response.invalid');
    }

    const playlistItems = (data as GetPlaylistItemsResponse).playlistItems;

    if (typeof playlistItems !== 'object' || playlistItems === null) {
        throw new LocalizedError('err.response.invalid');
    }

    const items = playlistItems.items;

    if (!Array.isArray(items)) {
        throw new LocalizedError('err.response.invalid');
    }

    const totalItems =
        typeof playlistItems.totalItems === 'number' &&
        Number.isFinite(playlistItems.totalItems)
            ? playlistItems.totalItems
            : items.length;

    const rows: string[][] = [];

    for (const item of items) {
        if (typeof item !== 'object' || item === null) {
            continue;
        }

        const columns = (item as { columns?: unknown[] }).columns;

        if (
            Array.isArray(columns) &&
            columns.every(value => typeof value === 'string')
        ) {
            rows.push(columns);
        } else {
            console.error(
                'Playlist item does not contain string columns:',
                item,
            );
        }
    }

    return { rows, totalItems };
}
