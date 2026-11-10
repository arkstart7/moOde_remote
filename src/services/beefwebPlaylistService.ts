/**
 * @file beefwebPlaylistService.ts
 *
 * @description
 * Работа со специальным playlist Beefweb.
 *
 * Используется playlist:
 *
 *     beefweb
 *
 * Алгоритм:
 *
 * 1. Получить список playlist.
 * 2. Найти playlist "beefweb".
 * 3. Если его нет — создать.
 * 4. Очистить playlist.
 * 5. Получить пути треков текущего альбома
 *    из LibraryStore.
 * 6. Добавить треки в playlist.
 */

import { libraryStore } from '../library/LibraryStore';

import { fetchWithTimeout } from './fetchWithTimeout';

import { ErrorDescriptor, LocalizedError, toHttpLocalizedError } from '../i18n';

export const BEEFWEB_PLAYLIST_NAME = 'beefweb';

/** Таймаут одного запроса к Beefweb. */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * Информация о playlist Beefweb.
 */
interface BeefwebPlaylist {
    id: string | number;
    title: string;
}

/**
 * Ответ GET /api/playlists.
 */
interface GetPlaylistsResponse {
    playlists?: BeefwebPlaylist[];
}

/**
 * Ответ POST /api/playlists/add.
 */
interface AddPlaylistResponse {
    id: string | number;
    title: string;
}

/**
 * Загружает текущий альбом в playlist "beefweb".
 *
 * Текущий альбом и его треки берутся непосредственно
 * из LibraryStore.
 *
 * @param beefwebUrl
 * Базовый URL Beefweb без завершающего "/".
 *
 * Например:
 *
 *     http://192.168.1.100:8880
 */
export async function loadCurrentAlbumToBeefwebPlaylist(
    beefwebUrl: string,
): Promise<void> {
    /*
     * --------------------------------------------------------
     * 1. Получаем пути треков текущего альбома.
     * --------------------------------------------------------
     */
    const paths = libraryStore.getCurrentAlbumTrackPaths();

    /*
     * Текущий альбом должен содержать хотя бы один трек.
     */
    if (paths.length === 0) {
        throw new LocalizedError('err.playlist.tracksUnavailable');
    }

    /*
     * --------------------------------------------------------
     * 2. Загружаем пути в playlist "beefweb".
     * --------------------------------------------------------
     */
    await loadTrackPathsToBeefwebPlaylist(beefwebUrl, paths);
}

/**
 * Заменяет содержимое playlist "beefweb" треками
 * по переданным путям.
 *
 * Треки берутся из уже выбранных источников:
 * как альбома, так и плейлиста.
 *
 * @param beefwebUrl
 * Базовый URL Beefweb без завершающего "/".
 *
 * @param paths
 * Пути треков в порядке следования.
 */
export async function loadTrackPathsToBeefwebPlaylist(
    beefwebUrl: string,
    paths: string[],
): Promise<void> {
    /*
     * --------------------------------------------------------
     * 1. Получаем или создаём playlist "beefweb".
     * --------------------------------------------------------
     */
    const playlistId = await getOrCreateBeefwebPlaylistId(beefwebUrl);

    /*
     * --------------------------------------------------------
     * 2. Очищаем playlist.
     * --------------------------------------------------------
     *
     * Это необходимо, чтобы в playlist находился
     * только выбранный источник.
     */
    await clearPlaylist(beefwebUrl, playlistId);

    /*
     * --------------------------------------------------------
     * 3. Добавляем треки по путям.
     * --------------------------------------------------------
     */
    await addPlaylistItems(beefwebUrl, playlistId, paths);
}

/**
 * Возвращает ID существующего playlist "beefweb".
 *
 * В отличие от getOrCreateBeefwebPlaylistId()
 * не создаёт playlist и падает, если его нет.
 */
export async function findBeefwebPlaylistId(
    beefwebUrl: string,
): Promise<string | number> {
    const playlists = await fetchPlaylists(beefwebUrl);

    const existing = playlists.find(
        playlist => playlist.title === BEEFWEB_PLAYLIST_NAME,
    );

    if (!existing) {
        throw new LocalizedError('err.playlist.beefwebMissing');
    }

    return existing.id;
}

/**
 * Возвращает ID playlist "beefweb".
 *
 * Если playlist не существует,
 * создаёт его.
 */
export async function getOrCreateBeefwebPlaylistId(
    beefwebUrl: string,
): Promise<string | number> {
    const playlists = await fetchPlaylists(beefwebUrl);

    /*
     * Ищем playlist по точному имени.
     */
    const existing = playlists.find(
        playlist => playlist.title === BEEFWEB_PLAYLIST_NAME,
    );

    if (existing) {
        return existing.id;
    }

    /*
     * --------------------------------------------------------
     * Playlist не найден.
     *
     * POST /api/playlists/add
     * --------------------------------------------------------
     */
    const createOperation: ErrorDescriptor = {
        code: 'err.playlist.createFailed',
    };

    const createResponse = await request(
        `${beefwebUrl}/api/playlists/add`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                title: BEEFWEB_PLAYLIST_NAME,
            }),
        },
        createOperation,
    );

    await ensureOk(createResponse, createOperation);

    const created = (await readJson(createResponse)) as AddPlaylistResponse;

    return created.id;
}

/**
 * Проверяет существование playlist с данным ID.
 *
 * Используется при восстановлении состояния после
 * рестарта: сохранённый playlist мог быть удалён
 * на сервере.
 */
export async function playlistExists(
    beefwebUrl: string,
    playlistId: string | number,
): Promise<boolean> {
    const playlists = await fetchPlaylists(beefwebUrl);

    return playlists.some(playlist => playlist.id === playlistId);
}

/**
 * Возвращает список playlist Beefweb.
 */
async function fetchPlaylists(beefwebUrl: string): Promise<BeefwebPlaylist[]> {
    const operation: ErrorDescriptor = { code: 'err.playlists.listFailed' };

    const response = await request(
        `${beefwebUrl}/api/playlists`,
        undefined,
        operation,
    );

    await ensureOk(response, operation);

    const data = (await readJson(response)) as GetPlaylistsResponse;

    return data.playlists ?? [];
}

/**
 * Очищает playlist.
 *
 * POST /api/playlists/{playlistId}/clear
 */
async function clearPlaylist(
    beefwebUrl: string,
    playlistId: string | number,
): Promise<void> {
    const operation: ErrorDescriptor = { code: 'err.playlist.clearFailed' };

    const response = await request(
        `${beefwebUrl}/api/playlists/${encodeURIComponent(
            String(playlistId),
        )}/clear`,
        {
            method: 'POST',
        },
        operation,
    );

    await ensureOk(response, operation);
}

/**
 * Приводит разделители пути к прямым слэшам.
 *
 * Beefweb проверяет путь добавляемого трека на попадание
 * в разрешённые директории, сравнивая нормализованный путь
 * с настроенной директорией посимвольно. В сборках Beefweb
 * (например, v0.10) UNC-путь с обратными слэшами может не
 * пройти эту проверку, в то время как эквивалентный путь
 * с прямыми слэшами принимается: сервер нормализует его
 * (lexically_normal + make_preferred) перед использованием.
 * Поэтому пути отправляются в едином forward-slash формате.
 */
function toForwardSlashes(path: string): string {
    return path.replace(/\\/g, '/');
}

/**
 * Добавляет файлы в playlist.
 *
 * POST /api/playlists/{playlistId}/items/add
 *
 * Beefweb допускает как 204, так и 202 Accepted.
 * Оба варианта считаются успешными через response.ok.
 */
async function addPlaylistItems(
    beefwebUrl: string,
    playlistId: string | number,
    paths: string[],
): Promise<void> {
    const operation: ErrorDescriptor = { code: 'err.playlist.addItemsFailed' };

    const response = await request(
        `${beefwebUrl}/api/playlists/${encodeURIComponent(
            String(playlistId),
        )}/items/add`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                items: paths.map(toForwardSlashes),
            }),
        },
        operation,
    );

    await ensureOk(response, operation);
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

            details:
                error instanceof Error
                    ? ` ${error.message}`
                    : ' Network request failed',
        });
    }
}

/**
 * Читает JSON-тело ответа с понятной ошибкой
 * вместо сырого SyntaxError.
 */
async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
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
