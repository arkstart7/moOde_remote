/**
 * @file mpdPlaylistService.ts
 *
 * @description
 * Управление очередью воспроизведения MPD.
 *
 * Beefweb-версия использовала отдельный playlist "beefweb";
 * в MPD роль такого плейлиста играет сама очередь:
 * перед загрузкой нового источника очередь очищается
 * и наполняется путями треков заново.
 */

import { libraryStore } from '../../library/LibraryStore';

import { runMpdCommand } from './mpdClient';

import { quoteMpdArg } from './mpdParser';

import { ErrorDescriptor, LocalizedError } from '../../i18n';

/**
 * Размер порции команд add внутри одного кадра.
 *
 * Ограничение защищает от слишком больших кадров
 * при загрузке альбомов с сотнями треков.
 */
const ADD_BATCH_SIZE = 200;

/**
 * Загружает текущий альбом в очередь MPD.
 *
 * Текущий альбом и его треки берутся непосредственно
 * из LibraryStore.
 */
export async function loadCurrentAlbumToMpdPlaylist(): Promise<void> {
    const paths = libraryStore.getCurrentAlbumTrackPaths();

    if (paths.length === 0) {
        throw new LocalizedError('err.playlist.tracksUnavailable');
    }

    await loadTrackPathsToMpdPlaylist(paths);
}

/**
 * Заменяет содержимое очереди MPD треками по переданным путям.
 *
 * Треки берутся из уже выбранных источников:
 * как альбома, так и плейлиста.
 */
export async function loadTrackPathsToMpdPlaylist(
    paths: string[],
): Promise<void> {
    /*
     * --------------------------------------------------------
     * 1. Очищаем очередь, чтобы в ней находился
     *    только выбранный источник.
     * --------------------------------------------------------
     */
    await runCommand(['clear'], { code: 'err.playlist.clearFailed' });

    /*
     * --------------------------------------------------------
     * 2. Добавляем треки порциями.
     * --------------------------------------------------------
     */
    const addOperation: ErrorDescriptor = {
        code: 'err.playlist.addItemsFailed',
    };

    for (let offset = 0; offset < paths.length; offset += ADD_BATCH_SIZE) {
        const batch = paths
            .slice(offset, offset + ADD_BATCH_SIZE)
            .map(path => `add ${quoteMpdArg(path)}`);

        if (batch.length > 0) {
            await runCommand(batch, addOperation);
        }
    }
}

/**
 * Выполняет команды MPD, добавляя контекст операции
 * к транспортным ошибкам.
 */
async function runCommand(
    commands: string[],
    operation: ErrorDescriptor,
): Promise<void> {
    try {
        await runMpdCommand(commands);
    } catch (error) {
        const details =
            error instanceof Error && error.message ? ` ${error.message}` : '';

        throw new LocalizedError(operation.code, {
            ...operation.params,

            details,
        });
    }
}
