/**
 * Synchronization helpers for the MPD player and LibraryStore.
 */

import { MpdPlayerSnapshot } from './mpd/mpdPlayerService';

import { libraryStore } from '../library/LibraryStore';

/**
 * Synchronizes the active item and, optionally, its position.
 *
 * Returns true when the current track was changed automatically by MPD.
 */
export function syncPlaybackSnapshot(
    snapshot: MpdPlayerSnapshot,
    syncPosition = true,
): boolean {
    const activeIndex = snapshot.activeItem?.index;
    let trackChanged = false;

    if (libraryStore.getPlaybackSource() === 'playlist') {
        /*
         * Плейлист: индекс activeItem указывает на строку
         * очереди MPD, то есть на строку плейлиста,
         * хранимого в LibraryStore.
         */
        const entries = libraryStore.getPlaylistEntries();

        if (
            typeof activeIndex === 'number' &&
            Number.isInteger(activeIndex) &&
            activeIndex >= 0 &&
            activeIndex < entries.length
        ) {
            const activeTrackId = entries[activeIndex].trackId;

            /*
             * Строки, отсутствующие в медиатеке, не могут
             * стать текущим треком в приложении. Для них
             * запоминается индекс строки плейлиста, чтобы
             * показать метаданные из строки плейлиста.
             */
            if (activeTrackId !== null) {
                const currentTrack = libraryStore.getCurrentTrack();

                if (currentTrack?.id !== activeTrackId) {
                    libraryStore.setActiveTrack(activeTrackId);
                    trackChanged = true;
                }
            } else {
                /*
                 * Строка вне медиатеки: индекс — единственный
                 * идентификатор текущей строки, поэтому его
                 * изменение тоже требует сохранения состояния,
                 * чтобы после рестарта подсветка восстановилась.
                 */
                const previousIndex =
                    libraryStore.getCurrentPlaylistTrackIndex();

                libraryStore.setCurrentPlaylistEntryIndex(activeIndex);

                if (
                    libraryStore.getCurrentPlaylistTrackIndex() !==
                    previousIndex
                ) {
                    trackChanged = true;
                }
            }
        }
    } else {
        const currentAlbum = libraryStore.getCurrentAlbum();

        if (
            currentAlbum &&
            typeof activeIndex === 'number' &&
            Number.isInteger(activeIndex) &&
            activeIndex >= 0 &&
            activeIndex < currentAlbum.trackIds.length
        ) {
            const activeTrackId = currentAlbum.trackIds[activeIndex];
            const currentTrack = libraryStore.getCurrentTrack();

            if (currentTrack?.id !== activeTrackId) {
                libraryStore.setActiveTrack(activeTrackId);
                trackChanged = true;
            }
        }
    }

    const remotePosition = snapshot.activeItem?.position;
    const currentPlayback = libraryStore.getCurrentPlayback();

    if (
        syncPosition &&
        snapshot.playbackState !== 'stopped' &&
        currentPlayback &&
        remotePosition !== undefined &&
        Number.isFinite(remotePosition)
    ) {
        const position = Math.max(0, remotePosition);

        if (position !== libraryStore.getCurrentTime()) {
            libraryStore.setCurrentTime(position);
        }
    }

    return trackChanged;
}
