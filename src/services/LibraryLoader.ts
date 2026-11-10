/**
 * @file src/services/LibraryLoader.ts
 *
 * @description
 * Загружает медиатеку из плейлиста-каталога Beefweb,
 * импортирует Library, устанавливает её в LibraryStore
 * и восстанавливает текущее состояние воспроизведения.
 */

import { Library } from '../library/types';

import { importLibrary } from '../library/LibraryImporter';
import { libraryStore } from '../library/LibraryStore';

import { initializeCurrentPlayback } from './playbackInitializer';

import { loadBeefwebCatalogTracks } from './beefwebCatalogService';

import { LocalizedError } from '../i18n';

/**
 * Загружает Library из плейлиста "beefweb-catalog".
 *
 * После успешного импорта:
 *
 * 1. Library помещается в LibraryStore.
 * 2. Восстанавливается CurrentPlayback.
 * 3. CurrentPlayback помещается в LibraryStore.
 *
 * @param beefwebUrl
 * Базовый URL Beefweb без завершающего "/".
 */
export async function loadLibrary(beefwebUrl: string): Promise<Library> {
    /*
     * --------------------------------------------------------
     * 1. Читаем треки плейлиста-каталога.
     * --------------------------------------------------------
     *
     * Ошибки чтения уже содержат понятные пользователю сообщения
     * (плейлист отсутствует, пуст и так далее), поэтому
     * пробрасываются как есть.
     */
    const foobarLibrary = await loadBeefwebCatalogTracks(beefwebUrl);

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
