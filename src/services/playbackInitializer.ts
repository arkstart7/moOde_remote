/**
 * @file src/services/playbackInitializer.ts
 *
 * @description
 * Инициализация текущего состояния воспроизведения
 * после загрузки Library.
 *
 * Алгоритм:
 *
 * 1. Загружаем сохранённый CurrentPlayback из AsyncStorage.
 * 2. Проверяем существование альбома.
 * 3. Проверяем существование трека внутри этого альбома.
 * 4. Если состояние корректно — восстанавливаем его.
 * 5. Если состояния нет или оно некорректно —
 *    выбираем первый альбом и первый трек.
 * 6. Первоначально созданное состояние сохраняем
 *    в AsyncStorage.
 */

import { CurrentPlayback, Library } from '../library/types';

import { loadCurrentPlayback, saveCurrentPlayback } from './playbackService';

/**
 * Инициализирует CurrentPlayback для загруженной Library.
 *
 * Возвращает либо восстановленное состояние,
 * либо новое состояние по умолчанию.
 */
export async function initializeCurrentPlayback(
    library: Library,
): Promise<CurrentPlayback> {
    /*
     * --------------------------------------------------------
     * 1. Пытаемся восстановить сохранённое состояние.
     * --------------------------------------------------------
     */

    const savedPlayback = await loadCurrentPlayback();

    /*
     * --------------------------------------------------------
     * 2. Проверяем сохранённое состояние.
     * --------------------------------------------------------
     */

    if (savedPlayback && isValidCurrentPlayback(library, savedPlayback)) {
        return savedPlayback;
    }

    /*
     * --------------------------------------------------------
     * 3. Сохранённого корректного состояния нет.
     *
     * Создаём состояние по умолчанию:
     * первый альбом и первый трек.
     *
     * createDefaultPlayback() использует тот же порядок,
     * что и отображение альбомов:
     * название → artist.
     * --------------------------------------------------------
     */

    const playback = createDefaultPlayback(library);

    /*
     * --------------------------------------------------------
     * 4. Сохраняем первоначальное состояние.
     *
     * Это важно: после первого запуска состояние уже
     * существует в AsyncStorage.
     * --------------------------------------------------------
     */

    await saveCurrentPlayback(playback);

    return playback;
}

/**
 * Создаёт состояние по умолчанию:
 * первый альбом библиотеки и его первый трек.
 *
 * Используется при первом запуске и как резерв
 * при восстановлении, когда сохранённое состояние
 * недействительно (например, плейлист удалён
 * на сервере).
 *
 * Возвращает первый альбом библиотеки.
 *
 * Порядок соответствует сортировке альбомов
 * в LibraryStore:
 *
 *   title → artist
 */
export function createDefaultPlayback(library: Library): CurrentPlayback {
    const firstAlbum = getFirstAlbum(library);

    if (!firstAlbum) {
        throw new Error('Library does not contain any albums.');
    }

    const firstTrackId = firstAlbum.trackIds[0];

    if (!firstTrackId) {
        throw new Error(`First album has no tracks: ${firstAlbum.id}`);
    }

    return {
        playbackSource: 'album',

        currentAlbumId: firstAlbum.id,

        currentTrackId: firstTrackId,

        currentTime: 0,

        currentPlaylistId: null,
        currentPlaylistTrackId: null,
        currentPlaylistTrackTime: 0,
    };
}

/**
 * Проверяет сохранённый CurrentPlayback
 * относительно загруженной Library.
 */
function isValidCurrentPlayback(
    library: Library,
    playback: CurrentPlayback,
): boolean {
    /*
     * Проверяем источник воспроизведения.
     *
     * Легаси-состояния (без playbackSource)
     * считаются album-состояниями.
     */
    if (
        playback.playbackSource !== 'album' &&
        playback.playbackSource !== 'playlist'
    ) {
        if (playback.playbackSource !== undefined) {
            return false;
        }
    }

    if (playback.playbackSource === 'playlist') {
        return isValidPlaylistPlayback(playback);
    }

    return isValidAlbumPlayback(library, playback);
}

/**
 * Проверяет album-состояние относительно Library.
 */
function isValidAlbumPlayback(
    library: Library,
    playback: CurrentPlayback,
): boolean {
    const albumId = playback.currentAlbumId;

    if (typeof albumId !== 'string') {
        return false;
    }

    /*
     * Проверяем albumId.
     */
    const album = library.albums[albumId];

    if (!album) {
        return false;
    }

    /*
     * Проверяем trackId.
     *
     * Важно: недостаточно проверить наличие трека
     * в library.tracks.
     *
     * Трек должен принадлежать именно этому альбому.
     */
    const trackId = playback.currentTrackId;

    if (trackId === null || !album.trackIds.includes(trackId)) {
        return false;
    }

    /*
     * Проверяем сам трек.
     */
    const track = library.tracks[trackId];

    if (!track) {
        return false;
    }

    /*
     * Проверяем currentTime.
     *
     * Отрицательное значение недопустимо.
     */
    if (!Number.isFinite(playback.currentTime) || playback.currentTime < 0) {
        return false;
    }

    /*
     * Не позволяем восстановить позицию
     * за пределами трека.
     */
    if (playback.currentTime > track.duration) {
        return false;
    }

    return true;
}

/**
 * Проверяет playlist-состояние относительно Library.
 *
 * В отличие от альбома, треки плейлиста не обязаны
 * присутствовать в Library: плейлист может содержать
 * файлы вне медиатеки.
 */
function isValidPlaylistPlayback(playback: CurrentPlayback): boolean {
    if (
        playback.currentPlaylistId === null ||
        (typeof playback.currentPlaylistId !== 'string' &&
            typeof playback.currentPlaylistId !== 'number')
    ) {
        return false;
    }

    if (
        !Number.isFinite(playback.currentPlaylistTrackTime) ||
        playback.currentPlaylistTrackTime < 0
    ) {
        return false;
    }

    return true;
}

/**
 * Возвращает первый альбом библиотеки.
 *
 * Порядок соответствует сортировке альбомов
 * в LibraryStore:
 *
 *   title → artist
 */
function getFirstAlbum(library: Library) {
    const albums = Object.values(library.albums);

    if (albums.length === 0) {
        return undefined;
    }

    albums.sort((a, b) => {
        const titleResult = a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
        });

        if (titleResult !== 0) {
            return titleResult;
        }

        return a.artist.localeCompare(b.artist, undefined, {
            sensitivity: 'base',
        });
    });

    return albums[0];
}
