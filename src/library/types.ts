/**
 * @file src/library/types.ts
 * Этот файл содержит типы, используемые в модуле library.
 */
/*
Library
│
├── genres
│   └── LibraryGenre
│       ├── artistIds
│       └── albumIds
│
├── artists
│   └── LibraryArtist
│       └── albumIds
│
├── albums
│   └── LibraryAlbum
│       ├── trackIds
│       └── discs
│           └── LibraryDisc
│               └── trackIds
│
└── tracks
    └── LibraryTrack
        └── path
*/

/**
 * @name LibraryDisc
 * @description Интерфейс для представления диска в библиотеке.
 * @param number - Номер диска.
 * @param name - Название диска (необязательный параметр).
 * @param trackIds - Массив идентификаторов треков, содержащихся на диске.
 */
export interface LibraryDisc {
    number: number;
    name?: string;
    trackIds: string[];
}

/**
 * @name LibraryAlbum
 * @description Интерфейс для представления альбома в библиотеке.
 * @param id - Уникальный идентификатор альбома.
 * @param title - Название альбома.
 * @param artist - Исполнитель альбома.
 * @param genre - Жанр альбома.
 * @param year - Год выпуска альбома (необязательный параметр).
 * @param totalDiscs - Общее количество дисков в альбоме.
 * @param trackIds - Массив идентификаторов треков, содержащихся в альбоме.
 * @param discs - Объект, содержащий информацию о дисках альбома, где ключами являются номера дисков, а значениями объекты типа LibraryDisc.
 */
export interface LibraryAlbum {
    id: string;
    title: string;
    artist: string;
    genre: string;
    year?: string;
    totalDiscs: number;
    trackIds: string[];
    discs: Record<number, LibraryDisc>;
}

/**
 * @name LibraryTrack
 * @description Интерфейс для представления трека в библиотеке.
 * @param id - Уникальный идентификатор трека.
 * @param path - Путь к файлу трека.
 * @param title - Название трека.
 * @param artist - Исполнитель трека.
 * @param albumArtist - Исполнитель альбома, к которому принадлежит трек.
 * @param album - Название альбома, к которому принадлежит трек.
 * @param genre - Жанр трека.
 * @param date - Значение тега date (необязательный параметр).
 * @param trackNumber - Номер трека в альбоме (необязательный параметр).
 * @param totalTracks - Общее количество треков в альбоме (необязательный параметр).
 * @param discNumber - Номер диска, на котором находится трек (необязательный параметр).
 * @param totalDiscs - Общее количество дисков в альбоме (необязательный параметр).
 * @param duration - Продолжительность трека в секундах.
 */
export interface LibraryTrack {
    id: string;
    path: string;
    title: string;
    artist: string;
    albumArtist: string;
    album: string;
    genre: string;
    date?: string;
    trackNumber?: number;
    totalTracks?: number;
    discNumber?: number;
    totalDiscs?: number;
    duration: number;
}

/**
 * @name LibraryArtist
 * @description Интерфейс для представления исполнителя в библиотеке.
 * @param id - Уникальный идентификатор исполнителя.
 * @param name - Название исполнителя.
 * @param albumIds - Массив идентификаторов альбомов, связанных с исполнителем.
 */
export interface LibraryArtist {
    id: string;
    name: string;
    albumIds: string[];
}

/**
 * @name LibraryGenre
 * @description Интерфейс для представления жанра в библиотеке.
 * @param id - Уникальный идентификатор жанра.
 * @param name - Название жанра.
 * @param artistIds - Массив идентификаторов исполнителей, связанных с жанром.
 * @param albumIds - Массив идентификаторов альбомов, связанных с жанром.
 */
export interface LibraryGenre {
    id: string;
    name: string;
    artistIds: string[];
    albumIds: string[];
}

/**
 * @name Library
 * @description Интерфейс для представления всей библиотеки.
 * @param tracks - Объект, содержащий информацию о треках библиотеки, где ключами являются идентификаторы треков, а значениями объекты типа LibraryTrack.
 * @param albums - Объект, содержащий информацию об альбомах библиотеки, где ключами являются идентификаторы альбомов, а значениями объекты типа LibraryAlbum.
 * @param artists - Объект, содержащий информацию об исполнителях библиотеки, где ключами являются идентификаторы исполнителей, а значениями объекты типа LibraryArtist.
 * @param genres - Объект, содержащий информацию о жанрах библиотеки, где ключами являются идентификаторы жанров, а значениями объекты типа LibraryGenre.
 */
export interface Library {
    tracks: Record<string, LibraryTrack>;
    albums: Record<string, LibraryAlbum>;
    artists: Record<string, LibraryArtist>;
    genres: Record<string, LibraryGenre>;
}

/**
 * @name PlaybackSource
 * @description
 * Активный источник воспроизведения.
 *
 * 'album'    — воспроизведение строится вокруг текущего альбома;
 * 'playlist' — воспроизведение строится вокруг выбранного плейлиста.
 *
 * Источники взаимоисключающие: при активации плейлиста
 * album-контекст сбрасывается, и наоборот.
 */
export type PlaybackSource = 'album' | 'playlist';

/**
 * @name PlaylistEntry
 * @description
 * Одна строка активного плейлиста.
 *
 * path — путь трека в плейлисте Beefweb;
 * trackId — ID трека в Library, если трек найден по пути,
 * иначе null (плейлист может содержать треки вне медиатеки).
 */
/**
 * @name PlaylistTrackInfo
 * @description
 * Строка плейлиста Beefweb вместе с метаданными.
 *
 * path — путь трека в плейлисте Beefweb;
 * title / artist / album — метаданные строки, прочитанные
 * из плейлиста; null, если тег отсутствует.
 *
 * Метаданные нужны для отображения треков, которых нет
 * в медиатеке (например, строки .cue-альбомов):
 * по пути такие строки с медиатекой не сопоставляются.
 */
export interface PlaylistTrackInfo {
    path: string;
    title: string | null;
    artist: string | null;
    album: string | null;
    durationSeconds: number | null;
}

/**
 * @name PlaylistEntry
 * @description
 * Одна строка активного плейлиста.
 *
 * path — путь трека в плейлисте Beefweb;
 * trackId — ID трека в Library, если трек найден по пути,
 * иначе null (плейлист может содержать треки вне медиатеки);
 * title / artist / album / durationSeconds — метаданные строки
 * из плейлиста, используются как резерв, когда trackId = null.
 */
export interface PlaylistEntry {
    path: string;
    trackId: string | null;
    title: string | null;
    artist: string | null;
    album: string | null;
    durationSeconds: number | null;
}

/**
 * @name CurrentPlayback
 * @description
 * Текущее состояние воспроизведения.
 *
 * playbackSource — активный источник: 'album' | 'playlist'.
 *
 * album-контекст (используется при playbackSource === 'album'):
 * currentAlbumId - ID текущего альбома.
 * currentTrackId - ID текущего трека.
 * currentTime - текущая позиция внутри трека в секундах.
 *
 * playlist-контекст (используется при playbackSource === 'playlist'):
 * currentPlaylistId - ID текущего плейлиста.
 * currentPlaylistTrackId - ID текущего трека плейлиста в Library
 * (null, если трек не найден в медиатеке).
 * currentPlaylistEntryIndex - индекс текущей строки плейлиста;
 * определен даже для строк вне медиатеки, поэтому хранится
 * отдельно от currentPlaylistTrackId (может отсутствовать
 * в сохраненных состояниях прежних версий).
 * currentPlaylistTrackTime - текущая позиция внутри трека в секундах.
 */
export interface CurrentPlayback {
    playbackSource: PlaybackSource;

    currentAlbumId: string | null;
    currentTrackId: string | null;
    currentTime: number;

    currentPlaylistId: string | number | null;
    currentPlaylistTrackId: string | null;
    currentPlaylistEntryIndex?: number | null;
    currentPlaylistTrackTime: number;
}
