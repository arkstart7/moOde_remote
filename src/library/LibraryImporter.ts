/**
 * @file src/library/LibraryImporter.ts
 *
 * Преобразует исходную коллекцию Foobar2000 во внутреннюю
 * структуру Library.
 *
 * Источником данных служит медиатека MPD (см. mpdCatalogService),
 * записи которой приводятся к форме FoobarTrack.
 */

import { Library, LibraryTrack } from './types';

/**
 * Представление одного трека исходной коллекции.
 */
export interface FoobarTrack {
    path: string;
    subsong_index: number;
    length: number;

    info?: {
        bitrate?: string;
        bitspersample?: string;
        channels?: string;
        codec?: string;
        encoding?: string;
        samplerate?: string;
    };

    meta?: Record<string, string[]>;
}

/**
 * Представление всей исходной коллекции.
 */
export type FoobarLibrary = FoobarTrack[];

/**
 * Импортирует библиотеку Foobar2000 во внутренний формат Library.
 *
 * Правила импорта:
 *
 * - Для тегов с несколькими значениями используется первое значение.
 * - album artist используется вместо artist для идентификации исполнителя альбома.
 * - Если album artist отсутствует, используется artist.
 * - Если genre отсутствует, используется "?".
 * - Если discnumber отсутствует, используется 1.
 * - Если totaldiscs отсутствует, используется 1.
 * - Для multi-disc альбомов имя каталога диска извлекается из path.
 * - Номер диска определяется только тегом discnumber.
 * - Треки сортируются сначала по номеру диска, затем по номеру трека.
 *
 * @param foobarLibrary - Массив треков исходной коллекции.
 * @returns Внутренняя структура Library.
 */
export function importLibrary(foobarLibrary: FoobarLibrary): Library {
    const library: Library = {
        tracks: {},
        albums: {},
        artists: {},
        genres: {},
    };

    for (const foobarTrack of foobarLibrary) {
        const title = getFirstMetaValue(foobarTrack, 'title') ?? '';

        const artist = getFirstMetaValue(foobarTrack, 'artist') ?? '';

        const albumArtist =
            getFirstMetaValue(foobarTrack, 'album artist') ?? artist;

        const album = getFirstMetaValue(foobarTrack, 'album') ?? '';

        const genre = getFirstMetaValue(foobarTrack, 'genre') ?? '?';

        const date = getFirstMetaValue(foobarTrack, 'date');

        const trackNumber = parseOptionalNumber(
            getFirstMetaValue(foobarTrack, 'tracknumber'),
        );

        const totalTracks = parseOptionalNumber(
            getFirstMetaValue(foobarTrack, 'totaltracks'),
        );

        /*
         * Для однодискового альбома эти теги могут отсутствовать.
         * В таком случае считаем, что это диск №1 из 1.
         */
        const discNumber =
            parseOptionalNumber(getFirstMetaValue(foobarTrack, 'discnumber')) ??
            1;

        const totalDiscs =
            parseOptionalNumber(getFirstMetaValue(foobarTrack, 'totaldiscs')) ??
            1;

        const trackId = createTrackId(foobarTrack);

        const artistId = createArtistId(albumArtist);

        const genreId = createGenreId(genre);

        const albumId = createAlbumId(albumArtist, album);

        /*
         * ----------------------------------------------------
         * Track
         * ----------------------------------------------------
         */

        const libraryTrack: LibraryTrack = {
            id: trackId,

            path: foobarTrack.path,

            title,
            artist,
            albumArtist,
            album,
            genre,

            date,

            trackNumber,
            totalTracks,

            discNumber,
            totalDiscs,

            duration: foobarTrack.length,
        };

        library.tracks[trackId] = libraryTrack;

        /*
         * ----------------------------------------------------
         * Genre
         * ----------------------------------------------------
         */

        let libraryGenre = library.genres[genreId];

        if (!libraryGenre) {
            libraryGenre = {
                id: genreId,
                name: genre,

                artistIds: [],
                albumIds: [],
            };

            library.genres[genreId] = libraryGenre;
        }

        /*
         * ----------------------------------------------------
         * Artist
         * ----------------------------------------------------
         */

        let libraryArtist = library.artists[artistId];

        if (!libraryArtist) {
            libraryArtist = {
                id: artistId,
                name: albumArtist,

                albumIds: [],
            };

            library.artists[artistId] = libraryArtist;
        }

        /*
         * ----------------------------------------------------
         * Album
         * ----------------------------------------------------
         */

        let libraryAlbum = library.albums[albumId];

        if (!libraryAlbum) {
            libraryAlbum = {
                id: albumId,

                title: album,
                artist: albumArtist,
                genre,

                year: date,

                totalDiscs,

                trackIds: [],

                discs: {},
            };

            library.albums[albumId] = libraryAlbum;
        } else {
            /*
             * Теоретически totalDiscs может отсутствовать
             * у части треков и присутствовать у других.
             *
             * Поэтому сохраняем максимальное значение.
             */
            libraryAlbum.totalDiscs = Math.max(
                libraryAlbum.totalDiscs,
                totalDiscs,
            );
        }

        /*
         * ----------------------------------------------------
         * Album → Track
         * ----------------------------------------------------
         */

        libraryAlbum.trackIds.push(trackId);

        /*
         * ----------------------------------------------------
         * Genre → Artist
         * ----------------------------------------------------
         */

        addUnique(libraryGenre.artistIds, artistId);

        /*
         * ----------------------------------------------------
         * Genre → Album
         * ----------------------------------------------------
         */

        addUnique(libraryGenre.albumIds, albumId);

        /*
         * ----------------------------------------------------
         * Artist → Album
         * ----------------------------------------------------
         */

        addUnique(libraryArtist.albumIds, albumId);

        /*
         * ----------------------------------------------------
         * Album → Disc
         * ----------------------------------------------------
         */

        let libraryDisc = libraryAlbum.discs[discNumber];

        if (!libraryDisc) {
            libraryDisc = {
                number: discNumber,
                trackIds: [],
            };

            /*
             * Для multi-disc альбомов сохраняем название
             * непосредственного родительского каталога трека.
             *
             * Например:
             *
             * ...\19\cd_1%2\03. Chasing pavements.wav
             *
             *                ↓
             *
             * name = "cd_1%2"
             */
            if (totalDiscs > 1) {
                libraryDisc.name = getParentDirectoryName(foobarTrack.path);
            }

            libraryAlbum.discs[discNumber] = libraryDisc;
        }

        /*
         * Один и тот же диск содержит несколько треков.
         * Каждый trackId добавляем только один раз.
         */
        addUnique(libraryDisc.trackIds, trackId);
    }

    /*
     * --------------------------------------------------------
     * Sort
     * --------------------------------------------------------
     *
     * Сортируем:
     *
     *   1. диски по discNumber;
     *   2. треки внутри диска по trackNumber.
     *
     * Album.trackIds получает общий порядок:
     *
     *   Disc 1 / Track 1
     *   Disc 1 / Track 2
     *   ...
     *   Disc 2 / Track 1
     *   Disc 2 / Track 2
     */

    sortAlbumTracks(library);

    sortDiscTracks(library);

    return library;
}

/**
 * Возвращает первое значение указанного метатега.
 *
 * Если тег отсутствует или содержит пустой массив,
 * возвращается undefined.
 */
function getFirstMetaValue(
    track: FoobarTrack,
    key: string,
): string | undefined {
    const values = track.meta?.[key];

    if (!values || values.length === 0) {
        return undefined;
    }

    const value = values[0].trim();

    return value.length > 0 ? value : undefined;
}

/**
 * Преобразует строковое числовое значение в number.
 *
 * Например:
 *
 * "01" → 1
 * "14" → 14
 *
 * Если значение отсутствует или не является числом,
 * возвращается undefined.
 */
function parseOptionalNumber(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    const number = Number.parseInt(value, 10);

    if (Number.isNaN(number)) {
        return undefined;
    }

    return number;
}

/**
 * Создает идентификатор трека.
 *
 * Путь вместе с subsong_index однозначно определяют
 * элемент Foobar2000.
 */
function createTrackId(track: FoobarTrack): string {
    return `${track.path}#${track.subsong_index}`;
}

/**
 * Создает идентификатор исполнителя.
 *
 * Для Artist используется album artist.
 */
function createArtistId(artist: string): string {
    return artist;
}

/**
 * Создает идентификатор жанра.
 */
function createGenreId(genre: string): string {
    return genre;
}

/**
 * Создает идентификатор альбома.
 *
 * Жанр намеренно не входит в ID.
 *
 * Один альбом определяется сочетанием:
 *
 *     album artist + album
 */
function createAlbumId(artist: string, album: string): string {
    return `${artist}|${album}`;
}

/**
 * Возвращает имя непосредственного родительского каталога файла.
 *
 * Например:
 *
 * file://E:\music\Adele\19\cd_1%2\03. Chasing pavements.wav
 *
 * → cd_1%2
 *
 * Название каталога не декодируется.
 * Например "cd_bonus%2" остается "cd_bonus%2".
 */
function getParentDirectoryName(path: string): string | undefined {
    /*
     * Убираем завершающие разделители, если они есть.
     */
    const normalizedPath = path.replace(/[\\/]+$/, '');

    /*
     * Находим последний разделитель —
     * между каталогом и именем файла.
     */
    const lastSeparator = Math.max(
        normalizedPath.lastIndexOf('/'),
        normalizedPath.lastIndexOf('\\'),
    );

    if (lastSeparator === -1) {
        return undefined;
    }

    /*
     * Получаем путь каталога, содержащего файл.
     */
    const directory = normalizedPath.substring(0, lastSeparator);

    /*
     * Теперь получаем имя этого каталога.
     */
    const directoryLastSeparator = Math.max(
        directory.lastIndexOf('/'),
        directory.lastIndexOf('\\'),
    );

    if (directoryLastSeparator === -1) {
        return directory;
    }

    return directory.substring(directoryLastSeparator + 1);
}

/**
 * Добавляет значение в массив, если его там еще нет.
 */
function addUnique<T>(array: T[], value: T): void {
    if (!array.includes(value)) {
        array.push(value);
    }
}

/**
 * Сортирует trackIds каждого альбома.
 *
 * Сначала по номеру диска,
 * затем по номеру трека.
 */
function sortAlbumTracks(library: Library): void {
    for (const album of Object.values(library.albums)) {
        album.trackIds.sort((trackIdA, trackIdB) => {
            const trackA = library.tracks[trackIdA];

            const trackB = library.tracks[trackIdB];

            const discA = trackA.discNumber ?? 1;

            const discB = trackB.discNumber ?? 1;

            if (discA !== discB) {
                return discA - discB;
            }

            const numberA = trackA.trackNumber ?? 0;

            const numberB = trackB.trackNumber ?? 0;

            return numberA - numberB;
        });
    }
}

/**
 * Сортирует trackIds каждого диска по номеру трека.
 */
function sortDiscTracks(library: Library): void {
    for (const album of Object.values(library.albums)) {
        for (const disc of Object.values(album.discs)) {
            disc.trackIds.sort((trackIdA, trackIdB) => {
                const trackA = library.tracks[trackIdA];

                const trackB = library.tracks[trackIdB];

                const numberA = trackA.trackNumber ?? 0;

                const numberB = trackB.trackNumber ?? 0;

                return numberA - numberB;
            });
        }
    }
}
