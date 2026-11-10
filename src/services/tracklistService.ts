/**
 * @file tracklistService.ts
 *
 * @description
 * Загрузка списка плейлистов для экрана "Плейлисты".
 *
 * Данные читаются напрямую из MPD:
 *
 * - listplaylists — имена сохраненных плейлистов;
 * - listplaylist  — количество треков (голые строки путей);
 * - listplaylistinfo — треки плейлиста с метаданными.
 *
 * Плейлисты без треков не показываются.
 */

import { runMpdCommand } from './mpd/mpdClient';

import {
    OBJECT_START_KEYS,
    groupPairs,
    parsePairs,
    quoteMpdArg,
} from './mpd/mpdParser';

import { ErrorDescriptor, LocalizedError } from '../i18n';

import { PlaylistTrackInfo } from '../library/types';

/**
 * Имена служебных плейлистов, которые не показываются
 * на экране "Плейлисты". Сравнение выполняется без учета регистра.
 */
const EXCLUDED_PLAYLIST_NAMES = new Set(['default', 'default playlist']);

/**
 * Плейлист, доступный для отображения на экране "Плейлисты".
 *
 * Идентификатор плейлиста в MPD — его имя.
 */
export interface TracklistPlaylist {
    id: string | number;

    title: string;

    itemCount: number;
}

/**
 * Загружает список плейлистов для экрана "Плейлисты".
 *
 * Возвращает только пользовательские плейлисты,
 * в которых есть хотя бы один трек.
 */
export async function loadTracklistPlaylists(): Promise<TracklistPlaylist[]> {
    const names = await loadStoredPlaylistNames();

    const operation: ErrorDescriptor = {
        code: 'err.playlists.listFailed',
    };

    const result: TracklistPlaylist[] = [];

    for (const name of names) {
        if (EXCLUDED_PLAYLIST_NAMES.has(name.trim().toLowerCase())) {
            continue;
        }

        /*
         * Команда listplaylist возвращает голые строки путей:
         * количество строк — это количество треков, без чтения
         * метаданных каждого трека.
         */
        let itemCount: number;

        try {
            const frame = await runMpdCommand([
                `listplaylist ${quoteMpdArg(name)}`,
            ]);

            itemCount = frame.lines.length;
        } catch (error) {
            throw new LocalizedError(operation.code, {
                details: error instanceof Error ? ` ${error.message}` : '',
            });
        }

        if (itemCount > 0) {
            result.push({ id: name, title: name, itemCount });
        }
    }

    return result;
}

/**
 * Читает имена сохраненных плейлистов в порядке сервера.
 */
async function loadStoredPlaylistNames(): Promise<string[]> {
    const operation: ErrorDescriptor = {
        code: 'err.playlists.listFailed',
    };

    let frame;

    try {
        frame = await runMpdCommand(['listplaylists']);
    } catch (error) {
        throw new LocalizedError(operation.code, {
            details: error instanceof Error ? ` ${error.message}` : '',
        });
    }

    const names: string[] = [];

    for (const pair of parsePairs(frame.lines)) {
        if (pair.key === 'playlist' && pair.value.trim()) {
            names.push(pair.value);
        }
    }

    return names;
}

/**
 * Читает все треки плейлиста вместе с метаданными.
 *
 * Метаданные нужны, чтобы показывать треки, которых нет
 * в медиатеке (например, строки .cue-альбомов): по пути
 * такие строки с медиатекой не сопоставляются.
 */
export async function readPlaylistTrackInfo(
    playlistId: string | number,
): Promise<PlaylistTrackInfo[]> {
    const operation: ErrorDescriptor = { code: 'err.playlist.itemsFailed' };

    let entries: Array<Record<string, string[]>>;

    try {
        const frame = await runMpdCommand([
            `listplaylistinfo ${quoteMpdArg(String(playlistId))}`,
        ]);

        entries = groupPairs(parsePairs(frame.lines), OBJECT_START_KEYS);
    } catch (error) {
        throw new LocalizedError(operation.code, {
            details: error instanceof Error ? ` ${error.message}` : '',
        });
    }

    const items: PlaylistTrackInfo[] = [];

    for (const entry of entries) {
        const path = entry.file?.[0];

        if (!path) {
            continue;
        }

        const durationText = entry.duration?.[0] ?? entry.time?.[0];

        const durationSeconds =
            durationText !== undefined && durationText.trim() !== ''
                ? Number.parseFloat(durationText)
                : Number.NaN;

        items.push({
            path,

            title: nonEmptyOrNull(entry.Title?.[0]),

            artist: nonEmptyOrNull(entry.Artist?.[0]),

            album: nonEmptyOrNull(entry.Album?.[0]),

            durationSeconds: Number.isFinite(durationSeconds)
                ? durationSeconds
                : null,
        });
    }

    return items;
}

/**
 * Возвращает значение или null для пустых строк.
 */
function nonEmptyOrNull(value: string | undefined): string | null {
    const trimmed = value?.trim() ?? '';

    return trimmed === '' ? null : value ?? null;
}

/**
 * Читает пути всех треков плейлиста.
 */
export async function readPlaylistTrackPaths(
    playlistId: string | number,
): Promise<string[]> {
    const items = await readPlaylistTrackInfo(playlistId);

    return items.map(item => item.path);
}
