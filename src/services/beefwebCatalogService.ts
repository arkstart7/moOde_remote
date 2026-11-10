/**
 * @file beefwebCatalogService.ts
 *
 * @description
 * Чтение медиатеки из служебного плейлиста-каталога Beefweb.
 *
 * Используется плейлист:
 *
 *     beefweb-catalog
 *
 * Пользователь один раз наполняет его в foobar2000 всей медиатекой
 * (Media Library → выделить всё → Send to playlist). Приложение
 * читает плейлист постранично и преобразует строки в структуру
 * FoobarTrack, которую принимает существующий LibraryImporter.
 *
 * Каталог также служит источником позиций элементов для обложек:
 * readBeefwebCatalogPaths возвращает пути строк, по которым
 * albumArtService строит соответствие "альбом → индекс элемента"
 * для запроса GET /api/artwork/{playlistId}/{itemIndex}.
 *
 * Контракт чтения проверен на реальном сервере:
 *
 * - колонки передаются одним параметром columns через запятую;
 *   повторные параметры columns= сервер игнорирует и возвращает
 *   только первую колонку;
 * - отсутствующий тег приходит пустой строкой;
 * - числа приходят строками, в том числе с ведущими нулями;
 * - %length_seconds% — длительность в секундах строкой-числом.
 *
 * Каталог только читается. Приложение никогда не создает, не
 * очищает и не пересобирает его: содержимым управляет пользователь
 * в foobar2000, поэтому несколько устройств, разделяющих один
 * сервер, не конкурируют за плейлист.
 */

import { fetchWithTimeout } from './fetchWithTimeout';

import { FoobarTrack } from '../library/LibraryImporter';

import { ErrorDescriptor, LocalizedError, toHttpLocalizedError } from '../i18n';

/**
 * Имя служебного плейлиста-каталога.
 */
export const BEEFWEB_CATALOG_PLAYLIST_NAME = 'beefweb-catalog';

/** Таймаут одного запроса к Beefweb. */
const REQUEST_TIMEOUT_MS = 5000;

/** Количество элементов в одном запросе чтения. */
const READ_CHUNK_SIZE = 1000;

/**
 * Защита от аномального totalCount: максимальный размер каталога.
 *
 * Без ограничения некорректный ответ сервера привел бы
 * к длинной серии бессмысленных запросов при запуске.
 */
const MAX_CATALOG_ITEMS = 100_000;

/**
 * Колонки одной строки каталога.
 *
 * Порядок массива определяет порядок значений columns в ответе
 * сервера и должен совпадать с индексами COLUMN_INDEX.
 *
 * $meta(...) используется вместо простых полей (%genre% и т.п.),
 * чтобы повторить семантику прежнего импорта: для мультизначных
 * тегов берется первое значение.
 */
const CATALOG_COLUMNS = [
    '%path%',
    '$meta(title)',
    '$meta(artist)',
    '$meta(album artist)',
    '$meta(album)',
    '$meta(genre)',
    '$meta(date)',
    '$meta(tracknumber)',
    '$meta(totaltracks)',
    '$meta(discnumber)',
    '$meta(totaldiscs)',
    '%length_seconds%',
];

/**
 * Колонка чтения путей для обложек.
 */
const PATH_COLUMNS = ['%path%'];

/**
 * Индексы значений в columns ответа сервера.
 */
const COLUMN_INDEX = {
    PATH: 0,
    TITLE: 1,
    ARTIST: 2,
    ALBUM_ARTIST: 3,
    ALBUM: 4,
    GENRE: 5,
    DATE: 6,
    TRACK_NUMBER: 7,
    TOTAL_TRACKS: 8,
    DISC_NUMBER: 9,
    TOTAL_DISCS: 10,
    LENGTH_SECONDS: 11,
} as const;

/**
 * Ответ GET /api/playlists.
 */
interface GetPlaylistsResponse {
    playlists?: Array<{
        id?: string | number;
        title?: string;
    }>;
}

/**
 * Ответ GET /api/playlists/{id}/items/{range}.
 */
interface GetPlaylistItemsResponse {
    playlistItems?: {
        totalCount?: number;
        items?: Array<{
            columns?: string[];
        }>;
    };
}

/**
 * Плейлист-каталог вместе с путями всех его строк.
 *
 * Позиция пути в массиве равна индексу элемента плейлиста
 * на сервере.
 */
export interface CatalogPaths {
    playlistId: string | number;
    paths: string[];
}

/**
 * Возвращает ID существующего плейлиста-каталога.
 *
 * Каталог создается пользователем вручную в foobar2000.
 * Если он отсутствует, выбрасывается ошибка с инструкцией.
 */
export async function findBeefwebCatalogPlaylistId(
    beefwebUrl: string,
): Promise<string | number> {
    const operation: ErrorDescriptor = { code: 'err.playlists.listFailed' };

    const response = await request(
        `${beefwebUrl}/api/playlists`,
        undefined,
        operation,
    );

    await ensureOk(response, operation);

    const data = (await readJson(response)) as GetPlaylistsResponse;

    const existing = (data.playlists ?? []).find(
        playlist => playlist.title === BEEFWEB_CATALOG_PLAYLIST_NAME,
    );

    if (!existing || existing.id === undefined) {
        throw new LocalizedError('err.catalog.missing', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,
        });
    }

    return existing.id;
}

/**
 * Читает весь плейлист-каталог и преобразует его
 * в массив FoobarTrack для LibraryImporter.
 */
export async function loadBeefwebCatalogTracks(
    beefwebUrl: string,
): Promise<FoobarTrack[]> {
    const playlistId = await findBeefwebCatalogPlaylistId(beefwebUrl);

    const { totalCount, results } = await readAllPages(
        beefwebUrl,
        playlistId,
        CATALOG_COLUMNS,
        mapColumnsToTrack,
    );

    if (totalCount === 0) {
        throw new LocalizedError('err.catalog.empty', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,
        });
    }

    return results;
}

/**
 * Читает пути всех строк каталога.
 *
 * Используется для построения соответствия "альбом → индекс
 * элемента" при загрузке обложек (см. albumArtService).
 */
export async function readBeefwebCatalogPaths(
    beefwebUrl: string,
): Promise<CatalogPaths> {
    const playlistId = await findBeefwebCatalogPlaylistId(beefwebUrl);

    const { results } = await readAllPages(
        beefwebUrl,
        playlistId,
        PATH_COLUMNS,
        columns => columns[0],
    );

    return { playlistId, paths: results };
}

/**
 * Читает каталог целиком постранично, преобразуя каждую строку
 * через mapRow; строки, для которых mapRow вернул null,
 * пропускаются.
 *
 * Нарушение формата ответа — неверное число колонок,
 * расхождение с totalCount, превышение предела размера —
 * считается ошибкой и прерывает чтение.
 */
async function readAllPages<T>(
    beefwebUrl: string,
    playlistId: string | number,
    columns: readonly string[],
    mapRow: (columns: string[]) => T | null,
): Promise<{ totalCount: number; results: T[] }> {
    const operation: ErrorDescriptor = {
        code: 'err.catalog.readFailed',

        params: { playlist: BEEFWEB_CATALOG_PLAYLIST_NAME },
    };

    const firstPage = await fetchPage(
        beefwebUrl,
        playlistId,
        0,
        columns,
        operation,
    );

    const totalCount = firstPage.totalCount;

    if (totalCount > MAX_CATALOG_ITEMS) {
        throw new LocalizedError('err.catalog.tooLarge', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,

            total: totalCount,

            limit: MAX_CATALOG_ITEMS,
        });
    }

    const results: T[] = [];

    let readCount = collectRows(results, firstPage.items, mapRow);

    for (
        let offset = READ_CHUNK_SIZE;
        offset < totalCount;
        offset += READ_CHUNK_SIZE
    ) {
        const page = await fetchPage(
            beefwebUrl,
            playlistId,
            offset,
            columns,
            operation,
        );

        readCount += collectRows(results, page.items, mapRow);
    }

    if (readCount !== totalCount) {
        throw new LocalizedError('err.catalog.rowsMismatch', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,

            count: readCount,

            total: totalCount,
        });
    }

    return { totalCount, results };
}

/**
 * Читает один фрагмент каталога с фиксированным смещением.
 *
 * Запрашивается ровно READ_CHUNK_SIZE строк; последний фрагмент
 * может вернуть меньше — полнота чтения проверяется сравнением
 * суммарного числа строк с totalCount в readAllPages.
 */
async function fetchPage(
    beefwebUrl: string,
    playlistId: string | number,
    offset: number,
    columns: readonly string[],
    operation: ErrorDescriptor,
): Promise<{ totalCount: number; items: string[][] }> {
    const range = `${offset}:${READ_CHUNK_SIZE}`;

    const data = await requestJson<GetPlaylistItemsResponse>(
        `${beefwebUrl}/api/playlists/${encodeURIComponent(
            String(playlistId),
        )}/items/${range}?columns=${encodeURIComponent(columns.join(','))}`,
        undefined,
        operation,
    );

    const playlistItems = data.playlistItems;

    if (
        !playlistItems ||
        typeof playlistItems.totalCount !== 'number' ||
        !Number.isFinite(playlistItems.totalCount)
    ) {
        throw new LocalizedError('err.catalog.invalidResponse', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,
        });
    }

    const rawItems = playlistItems.items ?? [];

    if (rawItems.length > READ_CHUNK_SIZE) {
        throw new LocalizedError('err.catalog.chunkTooLarge', {
            playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,

            count: rawItems.length,

            expected: READ_CHUNK_SIZE,
        });
    }

    const items: string[][] = [];

    for (const rawItem of rawItems) {
        const row = rawItem.columns;

        if (!row || row.length !== columns.length) {
            throw new LocalizedError('err.catalog.columnsMismatch', {
                playlist: BEEFWEB_CATALOG_PLAYLIST_NAME,

                count: row?.length ?? 0,

                expected: columns.length,
            });
        }

        items.push(row);
    }

    return { totalCount: playlistItems.totalCount, items };
}

/**
 * Преобразует прочитанные строки через mapRow, добавляя только
 * непустые результаты, и возвращает количество обработанных строк
 * (включая пропущенные).
 */
function collectRows<T>(
    target: T[],
    items: string[][],
    mapRow: (columns: string[]) => T | null,
): number {
    for (const columns of items) {
        const mapped = mapRow(columns);

        if (mapped !== null) {
            target.push(mapped);
        }
    }

    return items.length;
}

/**
 * Преобразует одну строку каталога в FoobarTrack.
 *
 * Отсутствующие теги приходят пустыми строками и передаются
 * в meta как есть: getFirstMetaValue в LibraryImporter трактует
 * пустое значение как отсутствие тега, как и прежде.
 *
 * Возвращает null, если строку невозможно использовать.
 */
function mapColumnsToTrack(columns: string[]): FoobarTrack | null {
    const path = columns[COLUMN_INDEX.PATH].trim();

    if (!path) {
        logSkippedRow(columns, 'отсутствует путь');

        return null;
    }

    const lengthSeconds = parseTagNumber(columns[COLUMN_INDEX.LENGTH_SECONDS]);

    if (lengthSeconds === undefined) {
        logSkippedRow(columns, 'некорректная длительность');

        return null;
    }

    return {
        path,

        subsong_index: 0,

        length: lengthSeconds,

        meta: {
            title: [columns[COLUMN_INDEX.TITLE]],

            artist: [columns[COLUMN_INDEX.ARTIST]],

            'album artist': [columns[COLUMN_INDEX.ALBUM_ARTIST]],

            album: [columns[COLUMN_INDEX.ALBUM]],

            genre: [columns[COLUMN_INDEX.GENRE]],

            date: [columns[COLUMN_INDEX.DATE]],

            tracknumber: [columns[COLUMN_INDEX.TRACK_NUMBER]],

            totaltracks: [columns[COLUMN_INDEX.TOTAL_TRACKS]],

            discnumber: [columns[COLUMN_INDEX.DISC_NUMBER]],

            totaldiscs: [columns[COLUMN_INDEX.TOTAL_DISCS]],
        },
    };
}

/**
 * Разбирает строковое число тега.
 *
 * Например "01" → 1. Если значение отсутствует
 * или не является целым числом, возвращается undefined.
 */
function parseTagNumber(value: string): number | undefined {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return undefined;
    }

    const number = Number.parseInt(trimmedValue, 10);

    if (Number.isNaN(number)) {
        return undefined;
    }

    return number;
}

/**
 * Диагностика пропущенной строки каталога.
 */
function logSkippedRow(columns: string[], reason: string): void {
    console.error(
        `Пропущена строка плейлиса "${BEEFWEB_CATALOG_PLAYLIST_NAME}" ` +
            `(${reason}):`,
        columns[COLUMN_INDEX.PATH] ?? '(нет пути)',
    );
}

/**
 * Выполняет запрос к Beefweb с таймаутом
 * и добавляет контекст к транспортной ошибке.
 */
async function request(
    url: string,
    init: RequestInit | undefined,
    operation: ErrorDescriptor,
): Promise<Response> {
    try {
        return await fetchWithTimeout(url, init, REQUEST_TIMEOUT_MS);
    } catch (error) {
        throw new LocalizedError(operation.code, {
            ...operation.params,

            details: error instanceof Error ? ` ${error.message}` : '',
        });
    }
}

/**
 * Выполняет запрос и читает JSON-тело ответа.
 */
async function requestJson<T>(
    url: string,
    init: RequestInit | undefined,
    operation: ErrorDescriptor,
): Promise<T> {
    const response = await request(url, init, operation);

    await ensureOk(response, operation);

    return readJson<T>(response);
}

/**
 * Читает JSON-тело ответа с понятной ошибкой
 * вместо сырого SyntaxError.
 */
async function readJson<T>(response: Response): Promise<T> {
    try {
        return (await response.json()) as T;
    } catch {
        throw new LocalizedError('err.response.invalid');
    }
}

/**
 * Проверяет HTTP-ответ Beefweb.
 *
 * При ошибке добавляет тело ответа к параметрам,
 * если сервер его вернул.
 */
async function ensureOk(
    response: Response,
    baseOperation: ErrorDescriptor,
): Promise<void> {
    if (response.ok) {
        return;
    }

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

    throw toHttpLocalizedError(baseOperation, response.status, details);
}
