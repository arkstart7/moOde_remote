/**
 * @file src/services/LibraryLoader.ts
 *
 * @description
 * Загружает медиатеку из базы MPD,
 * импортирует Library, устанавливает её в LibraryStore
 * и восстанавливает текущее состояние воспроизведения.
 */

import { Library } from '../library/types';

import { importLibrary } from '../library/LibraryImporter';
import { libraryStore } from '../library/LibraryStore';

import { initializeCurrentPlayback } from './playbackInitializer';

import { loadMpdLibraryTracks } from './mpd/mpdCatalogService';

import { LocalizedError } from '../i18n';

/**
 * Загружает Library из медиатеки MPD.
 *
 * После успешного импорта:
 *
 * 1. Library помещается в LibraryStore.
 * 2. Восстанавливается CurrentPlayback.
 * 3. CurrentPlayback помещается в LibraryStore.
 */
export async function loadLibrary(): Promise<Library> {
    /*
     * --------------------------------------------------------
     * 1. Читаем треки медиатеки MPD.
     * --------------------------------------------------------
     *
     * Ошибки чтения уже содержат понятные пользователю сообщения
     * и пробрасываются как есть.
     */
    const foobarLibrary = await loadMpdLibraryTracks();

    /*
     * --------------------------------------------------------
     * 2. Импортируем в нашу внутреннюю структуру Library.
     * --------------------------------------------------------
     */
    let library: Library;

    try {
        library = importLibrary(foobarLibrary);
    } catch (error) {
        console.error('Failed to import library:', error);

        throw new LocalizedError('err.library.importFailed');
    }

    /*
     * --------------------------------------------------------
     * 3. Устанавливаем Library в Store.
     * --------------------------------------------------------
     */
    libraryStore.setLibrary(library);

    /*
     * --------------------------------------------------------
     * 4. Восстанавливаем CurrentPlayback.
     * --------------------------------------------------------
     *
     * initializeCurrentPlayback():
     *
     * - восстанавливает сохранённое состояние;
     * - проверяет его относительно новой Library;
     * - либо создаёт состояние первого альбома/трека.
     */
    const currentPlayback = await initializeCurrentPlayback(library);

    /*
     * --------------------------------------------------------
     * 5. Помещаем CurrentPlayback в Store.
     * --------------------------------------------------------
     */
    libraryStore.setCurrentPlayback(currentPlayback);

    return library;
}
