/**
 * @file mpdCatalogService.ts
 *
 * @description
 * Чтение медиатеки напрямую из базы MPD.
 *
 * Команда listallinfo возвращает все файлы базы с тегами;
 * записи группируются парсером (см. mpdParser.groupPairs) и
 * преобразуются в структуру FoobarTrack, которую принимает
 * существующий LibraryImporter.
 *
 * В отличие от прежнего Beefweb-каталога, медиатека MPD
 * поддерживается самим сервером (music_directory), поэтому
 * служебный плейлист-каталог больше не нужен: несколько
 * устройств, разделяющих один сервер, не конкурируют за него.
 */

import { runMpdCommand } from './mpdClient';

import { OBJECT_START_KEYS, groupPairs, parsePairs } from './mpdParser';

import { ErrorDescriptor, LocalizedError } from '../../i18n';

import { FoobarTrack } from '../../library/LibraryImporter';

/** Защита от аномально большого ответа: максимальный размер каталога. */
const MAX_CATALOG_ITEMS = 200_000;

/**
 * Загружает всю медиатеку MPD и преобразует ее в FoobarTrack[].
 *
 * Ошибки транспорта оборачиваются в понятные пользователю
 * LocalizedError; сама MPD-ошибка ACK пробрасывается как есть.
 */
export async function loadMpdLibraryTracks(): Promise<FoobarTrack[]> {
    const operation: ErrorDescriptor = { code: 'err.catalog.readFailed' };

    let frame;

    try {
        frame = await runMpdCommand(['listallinfo']);
    } catch (error) {
        throw new LocalizedError(operation.code, {
            details: error instanceof Error ? ` ${error.message}` : '',
        });
    }

    const entries = groupPairs(parsePairs(frame.lines), OBJECT_START_KEYS);

    const tracks: FoobarTrack[] = [];

    for (const entry of entries) {
        const path = entry.file?.[0];

        /*
         * listallinfo возвращает также directory-записи без тегов:
         * без пути файла запись пропускается.
         */
        if (!path) {
            continue;
        }

        if (tracks.length >= MAX_CATALOG_ITEMS) {
            throw new LocalizedError('err.catalog.tooLarge', {
                limit: MAX_CATALOG_ITEMS,
            });
        }

        tracks.push(toFoobarTrack(entry, path));
    }

    if (tracks.length === 0) {
        throw new LocalizedError('err.catalog.empty');
    }

    return tracks;
}

/**
 * Преобразует группированную запись MPD в FoobarTrack.
 *
 * Семантика прежнего импорта сохранена: для мультизначных
 * тегов берется первое значение; составные номера
 * "3/12" и "1/2" разбираются в номер и общее количество.
 */
function toFoobarTrack(
    entry: Record<string, string[]>,
    path: string,
): FoobarTrack {
    return {
        path,

        subsong_index: 0,

        length: parseDuration(entry),

        meta: {
            title: [entry.Title?.[0] ?? buildFallbackTitle(path)],

            artist: [entry.Artist?.[0] ?? ''],

            'album artist': [entry.AlbumArtist?.[0] ?? ''],

            album: [entry.Album?.[0] ?? ''],

            genre: [entry.Genre?.[0] ?? ''],

            date: [entry.Date?.[0] ?? ''],

            tracknumber: [splitCompositeTag(entry.Track).number ?? ''],

            totaltracks: [splitCompositeTag(entry.Track).total ?? ''],

            discnumber: [splitCompositeTag(entry.Disc).number ?? ''],

            totaldiscs: [splitCompositeTag(entry.Disc).total ?? ''],
        },
    };
}

/**
 * Длительность трека: поле duration (дробное) или time (целое).
 */
function parseDuration(entry: Record<string, string[]>): number {
    const durationText = entry.duration?.[0];

    if (durationText !== undefined) {
        const duration = Number.parseFloat(durationText);

        if (Number.isFinite(duration)) {
            return duration;
        }
    }

    const timeText = entry.time?.[0];

    if (timeText !== undefined) {
        const time = Number.parseFloat(timeText);

        if (Number.isFinite(time)) {
            return time;
        }
    }

    return 0;
}

/**
 * Разбирает составной тег "3/12" в номер и общее количество.
 */
function splitCompositeTag(values: string[] | undefined): {
    number?: string;
    total?: string;
} {
    const value = values?.[0];

    if (!value) {
        return {};
    }

    const separatorIndex = value.indexOf('/');

    if (separatorIndex === -1) {
        return { number: value.trim() };
    }

    return {
        number: value.slice(0, separatorIndex).trim(),

        total: value.slice(separatorIndex + 1).trim(),
    };
}

/**
 * Резервный заголовок: имя файла без расширения.
 */
function buildFallbackTitle(path: string): string {
    const fileName = path.split('/').pop() ?? path;

    const dotIndex = fileName.lastIndexOf('.');

    const title = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

    return title;
}
