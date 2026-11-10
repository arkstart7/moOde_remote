/**
 * @file src/library/LibraryStore.ts
 *
 * @description
 * Хранилище медиатеки и текущего состояния приложения.
 *
 * Store содержит:
 *
 * - загруженную Library;
 * - выбранный жанр;
 * - выбранного артиста;
 * - текущее состояние воспроизведения.
 *
 * Store не зависит от React.
 *
 * React-компоненты могут подписываться на изменения
 * через subscribe() и использовать getSnapshot()
 * вместе с useSyncExternalStore().
 */

import {
    CurrentPlayback,
    Library,
    LibraryAlbum,
    LibraryArtist,
    LibraryGenre,
    LibraryTrack,
    PlaylistEntry,
    PlaylistTrackInfo,
} from './types';

type LibraryStoreListener = () => void;

class LibraryStore {
    /*
     * ========================================================
     * Library
     * ========================================================
     */

    private library: Library | null = null;

    /*
     * ========================================================
     * Selection
     * ========================================================
     *
     * null означает:
     *
     * selectedGenreId  -> All genres
     * selectedArtistId -> All artists
     */

    private selectedGenreId: string | null = null;

    private selectedArtistId: string | null = null;

    /*
     * ========================================================
     * Current Playback
     * ========================================================
     */

    private currentPlayback: CurrentPlayback | null = null;

    /*
     * Строки активного плейлиста.
     *
     * Заполняются при активации плейлиста
     * (setCurrentPlaylist / setPlaylistEntries)
     * и сбрасываются при возврате к album-источнику.
     */
    private playlistEntries: PlaylistEntry[] = [];

    /*
     * ID плейлиста, которому принадлежат playlistEntries.
     *
     * Используется, чтобы при откате состояния
     * (setCurrentPlayback) не оставить строки
     * чужого плейлиста.
     */
    private playlistEntriesId: string | number | null = null;

    /*
     * ========================================================
     * React subscriptions
     * ========================================================
     */

    private listeners = new Set<LibraryStoreListener>();

    /*
     * Snapshot version.
     *
     * Значение увеличивается при каждом notify().
     *
     * Используется React useSyncExternalStore().
     */
    private version = 0;

    /*
     * ========================================================
     * Sorted collections cache
     * ========================================================
     *
     * Сортировка больших коллекций на каждый рендер дорога,
     * поэтому результаты сортировки кэшируются и сбрасываются
     * только при загрузке новой Library.
     *
     * Возвращаемые массивы не следует мутировать.
     */

    private sortedGenresCache: LibraryGenre[] | null = null;

    private sortedAllArtistsCache: LibraryArtist[] | null = null;

    private sortedAllAlbumsCache: LibraryAlbum[] | null = null;

    private invalidateSortedCaches(): void {
        this.sortedGenresCache = null;
        this.sortedAllArtistsCache = null;
        this.sortedAllAlbumsCache = null;
    }

    // ========================================================
    // Subscription
    // ========================================================

    /**
     * Подписывает компонент на изменения Store.
     *
     * Возвращает функцию отмены подписки.
     */
    subscribe = (listener: LibraryStoreListener): (() => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    /**
     * Возвращает текущую версию Store.
     *
     * Используется useSyncExternalStore().
     */
    getSnapshot = (): number => {
        return this.version;
    };

    /**
     * Уведомляет всех подписчиков об изменении Store.
     */
    private notify(): void {
        this.version += 1;

        this.listeners.forEach(listener => listener());
    }

    // ========================================================
    // Library
    // ========================================================

    /**
     * Устанавливает загруженную Library.
     *
     * При загрузке новой Library выбор жанра и артиста
     * сбрасывается:
     *
     * - All genres
     * - All artists
     */
    setLibrary(library: Library): void {
        this.library = library;

        this.selectedGenreId = null;
        this.selectedArtistId = null;

        this.invalidateSortedCaches();

        this.notify();
    }

    /**
     * Возвращает Library.
     *
     * Если Library еще не загружена,
     * выбрасывается исключение.
     */
    getLibrary(): Library {
        if (!this.library) {
            throw new Error('Library has not been initialized.');
        }

        return this.library;
    }

    /**
     * Проверяет, загружена ли Library.
     */
    isInitialized(): boolean {
        return this.library !== null;
    }

    /**
     * Очищает Library и состояние Store.
     *
     * В текущей архитектуре автоматически вызывать
     * этот метод не следует.
     */
    clear(): void {
        this.library = null;

        this.selectedGenreId = null;
        this.selectedArtistId = null;

        this.currentPlayback = null;

        this.playlistEntries = [];
        this.playlistEntriesId = null;

        this.notify();
    }

    // ========================================================
    // Genre selection
    // ========================================================

    /**
     * Возвращает выбранный жанр.
     *
     * null означает All genres.
     */
    getSelectedGenreId(): string | null {
        return this.selectedGenreId;
    }

    /**
     * Устанавливает выбранный жанр.
     *
     * При смене жанра выбранный артист сбрасывается,
     * поскольку прежний артист может отсутствовать
     * в новом жанре.
     */
    setSelectedGenreId(genreId: string | null): void {
        this.selectedGenreId = genreId;

        this.selectedArtistId = null;

        this.notify();
    }

    // ========================================================
    // Artist selection
    // ========================================================

    /**
     * Возвращает выбранного артиста.
     *
     * null означает All artists.
     */
    getSelectedArtistId(): string | null {
        return this.selectedArtistId;
    }

    /**
     * Устанавливает выбранного артиста.
     */
    setSelectedArtistId(artistId: string | null): void {
        this.selectedArtistId = artistId;

        this.notify();
    }

    /**
     * Сбрасывает выбор жанра и артиста.
     */
    clearSelection(): void {
        this.selectedGenreId = null;
        this.selectedArtistId = null;

        this.notify();
    }

    // ========================================================
    // Genres
    // ========================================================

    /**
     * Возвращает все жанры.
     *
     * Жанры сортируются по названию; результат кэшируется
     * до загрузки новой Library. Массив не следует мутировать.
     */
    getGenres(): LibraryGenre[] {
        if (!this.sortedGenresCache) {
            this.sortedGenresCache = Object.values(
                this.getLibrary().genres,
            ).sort(compareByName);
        }

        return this.sortedGenresCache;
    }

    /**
     * Возвращает жанр по ID.
     */
    getGenre(genreId: string): LibraryGenre | undefined {
        return this.getLibrary().genres[genreId];
    }

    // ========================================================
    // Artists
    // ========================================================

    /**
     * Возвращает всех артистов.
     *
     * Жанр не учитывается. Результат кэшируется
     * до загрузки новой Library.
     */
    getAllArtists(): LibraryArtist[] {
        if (!this.sortedAllArtistsCache) {
            this.sortedAllArtistsCache = Object.values(
                this.getLibrary().artists,
            ).sort(compareByName);
        }

        return this.sortedAllArtistsCache;
    }

    /**
     * Возвращает артистов указанного жанра.
     *
     * Если genreId не передан,
     * возвращаются все артисты.
     */
    getArtists(genreId?: string): LibraryArtist[] {
        if (!genreId) {
            return this.getAllArtists();
        }

        const genre = this.getGenre(genreId);

        if (!genre) {
            return [];
        }

        return genre.artistIds
            .map(artistId => this.getLibrary().artists[artistId])
            .filter((artist): artist is LibraryArtist => artist !== undefined)
            .sort(compareByName);
    }

    /**
     * Возвращает артистов с учетом
     * текущего выбранного жанра.
     */
    getSelectedArtists(): LibraryArtist[] {
        return this.getArtists(this.selectedGenreId ?? undefined);
    }

    /**
     * Возвращает артиста по ID.
     */
    getArtist(artistId: string): LibraryArtist | undefined {
        return this.getLibrary().artists[artistId];
    }

    // ========================================================
    // Albums
    // ========================================================

    /**
     * Возвращает все альбомы.
     *
     * Результат кэшируется до загрузки новой Library.
     */
    getAllAlbums(): LibraryAlbum[] {
        if (!this.sortedAllAlbumsCache) {
            this.sortedAllAlbumsCache = sortAlbums(
                Object.values(this.getLibrary().albums),
            );
        }

        return this.sortedAllAlbumsCache;
    }

    /**
     * Возвращает альбомы указанного жанра.
     *
     * Если genreId не передан,
     * возвращаются все альбомы.
     */
    getAlbumsByGenre(genreId?: string): LibraryAlbum[] {
        if (!genreId) {
            return this.getAllAlbums();
        }

        const genre = this.getGenre(genreId);

        if (!genre) {
            return [];
        }

        const albums = genre.albumIds
            .map(albumId => this.getLibrary().albums[albumId])
            .filter((album): album is LibraryAlbum => album !== undefined);

        return sortAlbums(albums);
    }

    /**
     * Возвращает альбомы с учетом текущего выбора:
     *
     * - selectedGenreId;
     * - selectedArtistId.
     *
     * Если жанр не выбран:
     *   учитывается только артист.
     *
     * Если артист не выбран:
     *   возвращаются все альбомы выбранного жанра.
     */
    getSelectedAlbums(): LibraryAlbum[] {
        const albums = this.getAlbumsByGenre(this.selectedGenreId ?? undefined);

        if (!this.selectedArtistId) {
            return albums;
        }

        const artist = this.getArtist(this.selectedArtistId);

        if (!artist) {
            return [];
        }

        const albumIds = new Set(artist.albumIds);

        /*
         * Базовый список уже отсортирован,
         * фильтрация сохраняет порядок.
         */
        return albums.filter(album => albumIds.has(album.id));
    }

    /**
     * Возвращает альбом по ID.
     */
    getAlbum(albumId: string): LibraryAlbum | undefined {
        return this.getLibrary().albums[albumId];
    }

    // ========================================================
    // Tracks
    // ========================================================

    /**
     * Возвращает все треки альбома.
     *
     * Порядок определяется album.trackIds,
     * сформированным LibraryImporter.
     */
    getTracks(albumId: string): LibraryTrack[] {
        const album = this.getAlbum(albumId);

        if (!album) {
            return [];
        }

        return album.trackIds
            .map(trackId => this.getLibrary().tracks[trackId])
            .filter((track): track is LibraryTrack => track !== undefined);
    }

    /**
     * Возвращает треки конкретного диска.
     */
    getDiscTracks(albumId: string, discNumber: number): LibraryTrack[] {
        const album = this.getAlbum(albumId);

        if (!album) {
            return [];
        }

        const disc = album.discs[discNumber];

        if (!disc) {
            return [];
        }

        return disc.trackIds
            .map(trackId => this.getLibrary().tracks[trackId])
            .filter((track): track is LibraryTrack => track !== undefined);
    }

    /**
     * Возвращает трек по ID.
     */
    getTrack(trackId: string): LibraryTrack | undefined {
        return this.getLibrary().tracks[trackId];
    }

    /**
     * Возвращает пути всех треков альбома.
     *
     * Используется, например, при загрузке
     * альбома в очереди MPD.
     */
    getAlbumTrackPaths(albumId: string): string[] {
        return this.getTracks(albumId).map(track => track.path);
    }

    /** ========================================================
     * Current Playback
     * Текущее состояние приложения относительно
     * выбранного для работы альбома и воспроизведения.
     *
     * currentAlbumId — текущий альбом.
     * currentTrackId — текущий трек.
     * currentTime — текущая позиция воспроизведения.
     *
     * При выборе нового альбома:
     *
     * - currentAlbumId устанавливается на новый альбом;
     * - currentTrackId устанавливается на первый трек;
     * - currentTime сбрасывается в 0.
     * ========================================================
     */

    /**
     * Возвращает текущее состояние воспроизведения.
     *
     * null возможно только до инициализации
     * CurrentPlayback.
     */
    getCurrentPlayback(): CurrentPlayback | null {
        return this.currentPlayback;
    }

    /**
     * Устанавливает CurrentPlayback целиком.
     *
     * Используется, в частности, при восстановлении
     * состояния из AsyncStorage и при откате
     * неудачного выбора альбома/плейлиста.
     *
     * Строки плейлиста сохраняются только тогда,
     * когда восстановленное состояние относится
     * к тому же плейлису, которому они принадлежали;
     * иначе они сбрасываются.
     */
    setCurrentPlayback(playback: CurrentPlayback): void {
        this.currentPlayback = playback;

        const entriesBelongToPlayback =
            playback.playbackSource === 'playlist' &&
            playback.currentPlaylistId !== null &&
            this.playlistEntriesId === playback.currentPlaylistId;

        if (!entriesBelongToPlayback) {
            this.playlistEntries = [];
            this.playlistEntriesId = null;
        }

        this.notify();
    }

    /**
     * Выбирает новый текущий альбом.
     *
     * При смене альбома:
     *
     * playbackSource = 'album'
     * currentAlbumId = albumId
     * currentTrackId = первый трек альбома
     * currentTime = 0
     *
     * playlist-контекст сбрасывается.
     */
    setCurrentAlbum(albumId: string): void {
        const album = this.getAlbum(albumId);

        if (!album) {
            throw new Error(`Album not found: ${albumId}`);
        }

        const firstTrackId = album.trackIds[0];

        if (!firstTrackId) {
            throw new Error(`Album has no tracks: ${albumId}`);
        }

        this.currentPlayback = {
            playbackSource: 'album',

            currentAlbumId: albumId,

            currentTrackId: firstTrackId,

            currentTime: 0,

            currentPlaylistId: null,
            currentPlaylistTrackId: null,
            currentPlaylistTrackTime: 0,
        };

        this.playlistEntries = [];
        this.playlistEntriesId = null;

        this.notify();
    }

    /**
     * Устанавливает текущий трек.
     *
     * currentTrackId хранится как ID трека,
     * а не как индекс.
     *
     * При смене трека:
     * currentTime = 0.
     */
    setCurrentTrack(trackId: string): void {
        const track = this.getTrack(trackId);

        if (!track) {
            throw new Error(`Track not found: ${trackId}`);
        }

        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (this.currentPlayback.playbackSource !== 'album') {
            throw new Error('Current playback source is not an album.');
        }

        /*
         * Дополнительно проверяем,
         * что трек принадлежит текущему альбому.
         */
        const currentAlbumId = this.currentPlayback.currentAlbumId;

        if (currentAlbumId === null) {
            throw new Error('Current album not found.');
        }

        const album = this.getAlbum(currentAlbumId);

        if (!album) {
            throw new Error('Current album not found.');
        }

        if (!album.trackIds.includes(trackId)) {
            throw new Error(
                `Track does not belong to current album: ${trackId}`,
            );
        }

        this.currentPlayback = {
            ...this.currentPlayback,

            currentTrackId: trackId,

            currentTime: 0,
        };

        this.notify();
    }

    /**
     * Устанавливает текущую позицию
     * воспроизведения в секундах.
     *
     * Позиция относится к активному источнику:
     * album-треку или треку плейлиста.
     */
    setCurrentTime(currentTime: number): void {
        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (!Number.isFinite(currentTime) || currentTime < 0) {
            throw new Error(`Invalid playback time: ${currentTime}`);
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            this.setCurrentPlaylistTime(currentTime);

            return;
        }

        const track = this.getCurrentTrack();

        if (!track) {
            throw new Error('Current track not found.');
        }

        /*
         * Не разрешаем сохранить позицию
         * за пределами трека.
         */
        const time = Math.min(currentTime, track.duration);

        this.currentPlayback = {
            ...this.currentPlayback,

            currentTime: time,
        };

        this.notify();
    }

    /**
     * Возвращает текущий альбом.
     *
     * Определен только для album-источника.
     */
    getCurrentAlbum(): LibraryAlbum | undefined {
        if (!this.currentPlayback) {
            return undefined;
        }

        if (this.currentPlayback.playbackSource !== 'album') {
            return undefined;
        }

        if (this.currentPlayback.currentAlbumId === null) {
            return undefined;
        }

        return this.getAlbum(this.currentPlayback.currentAlbumId);
    }

    /**
     * Возвращает текущий трек активного источника:
     * трек текущего альбома или трек плейлиста.
     */
    getCurrentTrack(): LibraryTrack | undefined {
        if (!this.currentPlayback) {
            return undefined;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.getCurrentPlaylistTrack();
        }

        if (this.currentPlayback.currentTrackId === null) {
            return undefined;
        }

        return this.getTrack(this.currentPlayback.currentTrackId);
    }

    /**
     * Возвращает индекс текущего трека
     * внутри активного списка треков:
     * текущего альбома или плейлиста.
     *
     * В CurrentPlayback индекс НЕ хранится.
     *
     * Возвращается:
     * - 0, 1, 2, ... если трек найден;
     * - -1, если трек не найден.
     */
    getCurrentTrackIndex(): number {
        if (!this.currentPlayback) {
            return -1;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.getCurrentPlaylistTrackIndex();
        }

        const album = this.getCurrentAlbum();

        if (!album || this.currentPlayback.currentTrackId === null) {
            return -1;
        }

        return album.trackIds.indexOf(this.currentPlayback.currentTrackId);
    }

    /**
     * Возвращает пути треков текущего альбома.
     */
    getCurrentAlbumTrackPaths(): string[] {
        if (!this.currentPlayback) {
            return [];
        }

        if (this.currentPlayback.currentAlbumId === null) {
            return [];
        }

        return this.getAlbumTrackPaths(this.currentPlayback.currentAlbumId);
    }

    /*
     * ========================================================
     * Current playlist
     * ========================================================
     *
     * playlist-контекст воспроизведения.
     *
     * Строки плейлиста (PlaylistEntry) хранятся отдельно
     * от CurrentPlayback и не персистятся: они читаются
     * с сервера при выборе плейлиста и при запуске.
     */

    /**
     * Возвращает ID плейлиста, которому принадлежат
     * хранимые строки, либо null.
     */
    getPlaylistEntriesId(): string | number | null {
        return this.playlistEntriesId;
    }

    /**
     * Возвращает строки активного плейлиста.
     *
     * Возвращаемый массив — копия;
     * его не следует использовать для мутаций.
     */
    getPlaylistEntries(): PlaylistEntry[] {
        return [...this.playlistEntries];
    }

    /**
     * Заменяет строки активного плейлиста, сохраняя
     * текущий playlist-контекст воспроизведения.
     *
     * Используется при восстановлении плейлиста
     * после запуска приложения и при откате
     * неудачного выбора.
     */
    setPlaylistEntries(entries: PlaylistEntry[]): void {
        if (this.currentPlayback?.playbackSource !== 'playlist') {
            throw new Error('Current playback source is not a playlist.');
        }

        this.playlistEntries = entries.map(entry => ({ ...entry }));
        this.playlistEntriesId = this.currentPlayback.currentPlaylistId;

        this.notify();
    }

    /**
     * Восстанавливает строки плейлиста при рестарте приложения.
     *
     * В отличие от setCurrentPlaylist() сохранённый
     * playlist-контекст (трек и позиция) сохраняется:
     * entries нужны только для сопоставления индексов.
     *
     * Если сохранённый трек отсутствует среди строк
     * (например, файл вне медиатеки), текущим становится
     * первый трек плейлиста, найденный в медиатеке.
     *
     * @param playlistId идентификатор плейлиста.
     * @param items Строки плейлиста (путь + метаданные) в порядке следования.
     */
    restorePlaylistEntries(
        playlistId: string | number,
        items: PlaylistTrackInfo[],
    ): void {
        if (items.length === 0) {
            throw new Error(`Playlist has no tracks: ${playlistId}`);
        }

        if (
            this.currentPlayback?.playbackSource !== 'playlist' ||
            this.currentPlayback.currentPlaylistId !== playlistId
        ) {
            throw new Error(
                `Current playback does not belong to playlist: ${playlistId}`,
            );
        }

        const entries = this.buildPlaylistEntries(items);

        const savedTrackId = this.currentPlayback.currentPlaylistTrackId;

        const savedEntryIndex = this.currentPlayback.currentPlaylistEntryIndex;

        /*
         * Текущая строка вне медиатеки (trackId === null)
         * идентифицируется только индексом: заменять её
         * первым треком из медиатеки нельзя, иначе после
         * рестарта подсветка и метаданные указывают
         * на другую строку.
         */
        const savedEntryIndexValid =
            typeof savedEntryIndex === 'number' &&
            Number.isInteger(savedEntryIndex) &&
            savedEntryIndex >= 0 &&
            savedEntryIndex < entries.length;

        const restoredTrackId =
            savedTrackId !== null &&
            savedTrackId !== undefined &&
            entries.some(entry => entry.trackId === savedTrackId)
                ? savedTrackId
                : savedEntryIndexValid
                ? entries[savedEntryIndex].trackId
                : entries.find(entry => entry.trackId !== null)?.trackId ??
                  null;

        this.currentPlayback = {
            ...this.currentPlayback,

            currentPlaylistTrackId: restoredTrackId,
        };

        this.playlistEntries = entries;
        this.playlistEntriesId = playlistId;

        this.notify();
    }

    /**
     * Активирует плейлист как источник воспроизведения.
     *
     * album-контекст сбрасывается, треком плейлиста
     * становится первый трек, найденный в медиатеке.
     *
     * @param playlistId идентификатор плейлиста.
     * @param items Строки плейлиста (путь + метаданные) в порядке следования.
     */
    setCurrentPlaylist(
        playlistId: string | number,
        items: PlaylistTrackInfo[],
    ): void {
        if (items.length === 0) {
            throw new Error(`Playlist has no tracks: ${playlistId}`);
        }

        if (!this.isInitialized()) {
            throw new Error('Library has not been initialized.');
        }

        const entries = this.buildPlaylistEntries(items);

        const firstTrackId =
            entries.find(entry => entry.trackId !== null)?.trackId ?? null;

        this.currentPlayback = {
            playbackSource: 'playlist',

            currentAlbumId: null,
            currentTrackId: null,
            currentTime: 0,

            currentPlaylistId: playlistId,
            currentPlaylistTrackId: firstTrackId,
            currentPlaylistTrackTime: 0,

            /*
             * Текущей строкой становится первая строка плейлиста:
             * как и у альбома, при выборе источника подсвечивается
             * первый трек. Особенно важно для плейлистов без треков
             * из медиатеки: без индекса текущая строка не определена.
             */
            currentPlaylistEntryIndex: 0,
        };

        this.playlistEntries = entries;
        this.playlistEntriesId = playlistId;

        this.notify();
    }

    /**
     * Устанавливает текущий трек плейлиста.
     *
     * Трек должен присутствовать в строках
     * активного плейлиста.
     *
     * При смене трека:
     * currentPlaylistTrackTime = 0.
     */
    setCurrentPlaylistTrack(trackId: string): void {
        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (this.currentPlayback.playbackSource !== 'playlist') {
            throw new Error('Current playback source is not a playlist.');
        }

        const entryIndex = this.playlistEntries.findIndex(
            entry => entry.trackId === trackId,
        );

        if (entryIndex < 0) {
            throw new Error(
                `Track does not belong to current playlist: ${trackId}`,
            );
        }

        this.currentPlayback = {
            ...this.currentPlayback,

            currentPlaylistTrackId: trackId,
            currentPlaylistTrackTime: 0,

            currentPlaylistEntryIndex: entryIndex,
        };

        this.notify();
    }

    /**
     * Устанавливает текущую позицию
     * внутри трека плейлиста в секундах.
     */
    setCurrentPlaylistTime(currentPlaylistTrackTime: number): void {
        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (this.currentPlayback.playbackSource !== 'playlist') {
            throw new Error('Current playback source is not a playlist.');
        }

        if (
            !Number.isFinite(currentPlaylistTrackTime) ||
            currentPlaylistTrackTime < 0
        ) {
            throw new Error(
                `Invalid playback time: ${currentPlaylistTrackTime}`,
            );
        }

        const track = this.getCurrentPlaylistTrack();

        /*
         * Если трек не найден в медиатеке, длительность
         * неизвестна — ограничение позиции невозможно.
         */
        const time = track
            ? Math.min(currentPlaylistTrackTime, track.duration)
            : currentPlaylistTrackTime;

        this.currentPlayback = {
            ...this.currentPlayback,

            currentPlaylistTrackTime: time,
        };

        this.notify();
    }

    /**
     * Возвращает текущий трек плейлиста.
     */
    getCurrentPlaylistTrack(): LibraryTrack | undefined {
        const trackId = this.currentPlayback?.currentPlaylistTrackId;

        if (trackId === null || trackId === undefined) {
            return undefined;
        }

        return this.getTrack(trackId);
    }

    /**
     * Устанавливает текущей строку плейлиста по индексу.
     *
     * В отличие от setCurrentPlaylistTrack работает и
     * со строками вне медиатеки: currentPlaylistTrackId
     * получает null, а currentPlaylistEntryIndex
     * запоминает позицию строки. При смене строки
     * currentPlaylistTrackTime = 0.
     *
     * @param index Индекс строки активного плейлиста.
     */
    setCurrentPlaylistEntryByIndex(index: number): void {
        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (this.currentPlayback.playbackSource !== 'playlist') {
            throw new Error('Current playback source is not a playlist.');
        }

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.playlistEntries.length
        ) {
            throw new Error(`Invalid playlist entry index: ${index}`);
        }

        this.currentPlayback = {
            ...this.currentPlayback,

            currentPlaylistTrackId: this.playlistEntries[index].trackId,
            currentPlaylistEntryIndex: index,
            currentPlaylistTrackTime: 0,
        };

        this.notify();
    }

    /**
     * Возвращает строку плейлиста для текущего трека.
     *
     * Для треков вне медиатеки (currentPlaylistTrackId === null)
     * сопоставление выполняется по индексу строки плейлиста,
     * сохраненному в playback-контексте; если индекс недоступен
     * (например, состояние из прежних версий), используется
     * первая строка плейлиста.
     */
    getCurrentPlaylistEntry(): PlaylistEntry | undefined {
        if (this.currentPlayback?.playbackSource !== 'playlist') {
            return undefined;
        }

        const trackId = this.currentPlayback.currentPlaylistTrackId;

        if (trackId !== null && trackId !== undefined) {
            const foundEntry = this.playlistEntries.find(
                candidate => candidate.trackId === trackId,
            );

            /*
             * Если трек не найден в строках плейлиста
             * (например, после рестарта), используется
             * сохранённый индекс строки.
             */
            if (foundEntry) {
                return foundEntry;
            }
        }

        const entryIndex = this.currentPlayback.currentPlaylistEntryIndex;

        if (
            typeof entryIndex === 'number' &&
            Number.isInteger(entryIndex) &&
            entryIndex >= 0 &&
            entryIndex < this.playlistEntries.length
        ) {
            return this.playlistEntries[entryIndex];
        }

        return this.playlistEntries[0];
    }

    /**
     * Запоминает индекс текущей строки плейлиста.
     *
     * Вызывается, когда сервер играет строку, отсутствующую
     * в медиатеке (например, трек из .cue-файла): у такой
     * строки нет ID трека, но позиция в плейлисте известна.
     *
     * @param index Индекс строки в плейлисте.
     */
    setCurrentPlaylistEntryIndex(index: number): void {
        if (this.currentPlayback?.playbackSource !== 'playlist') {
            return;
        }

        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.playlistEntries.length
        ) {
            return;
        }

        this.currentPlayback = {
            ...this.currentPlayback,

            currentPlaylistEntryIndex: index,
        };

        this.notify();
    }

    /**
     * Возвращает индекс текущего трека плейлиста
     * среди строк активного плейлиста.
     *
     * Для треков вне медиатеки (currentPlaylistTrackId === null)
     * индекс берется из playback-контекста, как в
     * getCurrentPlaylistEntry; если он недоступен,
     * возвращается -1.
     */
    getCurrentPlaylistTrackIndex(): number {
        const playback = this.currentPlayback;

        if (!playback) {
            return -1;
        }

        const trackId = playback.currentPlaylistTrackId;

        if (trackId !== null && trackId !== undefined) {
            const trackIndex = this.playlistEntries.findIndex(
                entry => entry.trackId === trackId,
            );

            /*
             * Если трек не найден в строках плейлиста
             * (например, после рестарта), используется
             * сохранённый индекс строки.
             */
            if (trackIndex >= 0) {
                return trackIndex;
            }
        }

        const entryIndex = playback.currentPlaylistEntryIndex;

        if (
            entryIndex === undefined ||
            entryIndex === null ||
            entryIndex < 0 ||
            entryIndex >= this.playlistEntries.length
        ) {
            return -1;
        }

        return entryIndex;
    }

    /*
     * ========================================================
     * Active source helpers
     * ========================================================
     *
     * Единая точка для playbackController и playbackSyncService:
     * операции выполняются над активным источником,
     * не завися от того, альбом это или плейлист.
     */

    /**
     * Возвращает активный источник воспроизведения.
     *
     * null возможно только до инициализации
     * CurrentPlayback.
     */
    getPlaybackSource(): CurrentPlayback['playbackSource'] | null {
        return this.currentPlayback?.playbackSource ?? null;
    }

    /**
     * Возвращает текущую позицию активного источника.
     */
    getCurrentTime(): number {
        if (!this.currentPlayback) {
            return 0;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.currentPlayback.currentPlaylistTrackTime;
        }

        return this.currentPlayback.currentTime;
    }

    /**
     * Возвращает количество треков активного источника.
     */
    getActiveTrackCount(): number {
        if (!this.currentPlayback) {
            return 0;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.playlistEntries.length;
        }

        const album = this.getCurrentAlbum();

        return album ? album.trackIds.length : 0;
    }

    /**
     * Возвращает ID трека активного источника по индексу.
     *
     * Для плейлиса трек, отсутствующий в медиатеке,
     * дает null; для альбома за границей списка
     * также возвращается null.
     */
    getActiveTrackIdAtIndex(index: number): string | null {
        if (!this.currentPlayback) {
            return null;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.playlistEntries[index]?.trackId ?? null;
        }

        const album = this.getCurrentAlbum();

        return album?.trackIds[index] ?? null;
    }

    /**
     * Возвращает индекс трека активного источника по ID.
     */
    getActiveTrackIndexById(trackId: string): number {
        if (!this.currentPlayback) {
            return -1;
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            return this.playlistEntries.findIndex(
                entry => entry.trackId === trackId,
            );
        }

        const album = this.getCurrentAlbum();

        return album ? album.trackIds.indexOf(trackId) : -1;
    }

    /**
     * Устанавливает текущий трек активного источника.
     */
    setActiveTrack(trackId: string): void {
        if (!this.currentPlayback) {
            throw new Error('Current playback has not been initialized.');
        }

        if (this.currentPlayback.playbackSource === 'playlist') {
            this.setCurrentPlaylistTrack(trackId);

            return;
        }

        this.setCurrentTrack(trackId);
    }

    /**
     * Преобразует строки плейлиста (путь + метаданные) в PlaylistEntry,
     * сопоставляя каждый путь с треком медиатеки.
     *
     * Метаданные (название, исполнитель, альбом) сохраняются
     * всегда: они резервируются для строк, которых нет
     * в медиатеке (например, треки из .cue-файлов).
     *
     * Пути, отсутствующие в медиатеке, сохраняются
     * с trackId = null: они по-прежнему играют
     * на сервере, но приложение не знает их метаданных.
     */
    private buildPlaylistEntries(items: PlaylistTrackInfo[]): PlaylistEntry[] {
        const trackIdByPath = new Map<string, string>();

        for (const track of Object.values(this.getLibrary().tracks)) {
            const key = normalizePlaylistPath(track.path);

            if (key !== null && !trackIdByPath.has(key)) {
                trackIdByPath.set(key, track.id);
            }
        }

        const entries = items.map(item => {
            const normalizedPath = normalizePlaylistPath(item.path) ?? '';

            return {
                path: item.path,
                trackId: trackIdByPath.get(normalizedPath) ?? null,
                title: item.title,
                artist: item.artist,
                album: item.album,
                durationSeconds: item.durationSeconds,
            };
        });

        /*
         * Диагностика: строки плейлиста, не сопоставленные с медиатекой
         * (например, .cue-файлы), обслуживаются метаданными из самих
         * строк. Это штатный случай, поэтому просто console.log:
         * console.error поднял бы красный LogBox при каждой загрузке.
         */
        const unmatched = entries.filter(entry => entry.trackId === null);

        if (unmatched.length > 0) {
            console.log(
                'Playlist entries not matched in library ' +
                    `(${unmatched.length}/${entries.length}):`,
                unmatched.slice(0, 10).map(entry => entry.path),
            );
        }

        return entries;
    }
}

/**
 * Нормализует путь для сопоставления треков плейлиста
 * с треками медиатеки.
 *
 * Плейлист и медиатека могут возвращать один и тот же путь
 * в разном виде: с разным регистром, с обратными слэшами,
 * с URL-кодированием, с префиксом file:// или с индексом
 * субтрека (#N). Приводим обе стороны к одной канонической
 * форме, иначе строки плейлиста не сопоставляются
 * с медиатекой и метаданные (название, исполнитель, альбом)
 * не отображаются.
 *
 * Возвращает null для пустых путей.
 */
function normalizePlaylistPath(path: string): string | null {
    let normalized = path.trim();

    if (normalized === '') {
        return null;
    }

    // Префикс file:// не входит в путь медиатеки.
    if (normalized.toLowerCase().startsWith('file://')) {
        normalized = normalized.slice('file://'.length);
    }

    try {
        normalized = decodeURIComponent(normalized);
    } catch {
        // Некорректное URL-кодирование — используем как есть.
    }

    // Индекс субтрека (#N) не входит в путь медиатеки.
    const hashIndex = normalized.indexOf('#');

    if (hashIndex > 0) {
        normalized = normalized.slice(0, hashIndex);
    }

    return normalized.replace(/\\/g, '/').toLowerCase();
}

/**
 * Сравнивает сущности библиотеки по названию.
 */
function compareByName(a: { name: string }, b: { name: string }): number {
    return a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
    });
}

/**
 * Сортирует альбомы по названию,
 * затем по исполнителю.
 */
function sortAlbums(albums: LibraryAlbum[]): LibraryAlbum[] {
    return [...albums].sort((a, b) => {
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
}

/**
 * Единственный экземпляр LibraryStore
 * для всего приложения.
 */
export const libraryStore = new LibraryStore();
