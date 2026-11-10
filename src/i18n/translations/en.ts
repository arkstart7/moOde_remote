/**
 * @file en.ts
 * @description Английские строки интерфейса. Базовый словарь:
 * его ключи определяют тип TranslationKey, а русский словарь
 * (ru.ts) обязан повторять ровно тот же набор ключей.
 *
 * Подстановки обозначаются фигурными скобками: {name}, {status}.
 * Необязательные подстановки ({details}) при отсутствии
 * заменяются пустой строкой, поэтому хвостовые шаблоны вида
 * "...{details}" безопасно опускаются.
 */

export const en = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': 'Checking settings ...',
    'start.loadingLibrary': 'Loading media library ...',
    'start.loadingPlaylist': 'Loading playlist ...',
    'start.failed': 'Failed to start the application.',

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': 'Settings',
    'settings.urlLabel': 'Foobar2000 URL',
    'settings.portLabel': 'Port',
    'settings.checking': 'Checking settings...',
    'settings.loadFailed': 'Failed to load settings',
    'settings.checkOrSaveFailed': 'Failed to check and save settings',
    'settings.language': 'Language',
    'settings.languageEn': 'English',
    'settings.languageRu': 'Russian',
    'settings.languageDe': 'German',
    'settings.languageFr': 'French',
    'settings.languageEs': 'Spanish',
    'settings.languageZh': 'Chinese',
    'settings.theme': 'Theme',
    'settings.themeSystem': 'System',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',

    /*
     * --------------------------------------------------------
     * NavigationBar и навигация
     * --------------------------------------------------------
     */
    'menu.main': 'Main',
    'menu.genres': 'Genres',
    'menu.artists': 'Artists',
    'menu.albums': 'Albums',
    'menu.tracks': 'Tracks',
    'menu.playlists': 'Playlists',
    'menu.settings': 'Settings',
    'common.back': 'Back',
    'common.settings': 'Settings',

    /*
     * --------------------------------------------------------
     * Управление воспроизведением (accessibility)
     * --------------------------------------------------------
     */
    'controls.previousTrack': 'Previous track',
    'controls.nextTrack': 'Next track',
    'controls.pause': 'Pause',
    'controls.play': 'Play',
    'controls.pauseTrack': 'Pause current track',
    'controls.playTrack': 'Play current track',
    'progress.position': 'Playback position',

    /*
     * --------------------------------------------------------
     * Громкость
     * --------------------------------------------------------
     */
    'volume.unmute': 'Unmute',
    'volume.mute': 'Mute',
    'volume.label': 'Volume',

    /*
     * --------------------------------------------------------
     * Библиотека
     * --------------------------------------------------------
     */
    'library.allArtists': 'All artists',
    'library.allGenres': 'All genres',
    'library.selectAlbum': 'Select album {title}',
    'library.selectTrack': 'Select track {title}',
    'library.artist': 'Artist {name}',
    'library.genre': 'Genre {name}',
    'library.playlist': 'Playlist {name}',
    'library.selectPlaylist': 'Select playlist {name}',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': 'Loading playlists ...',
    'tracklist.empty': 'No playlists with tracks.',

    'playback.unknownTrack': 'Track not in library.',
    'playback.commandPending': 'Running command…',

    /*
     * --------------------------------------------------------
     * Общие ошибки
     * --------------------------------------------------------
     */
    'err.unknown': 'Unknown error.',
    'err.generic': '{details}',
    'err.response.invalid': 'The server returned an invalid response.',
    'err.settings.notFound': 'Foobar2000 settings are not configured.',
    'err.settings.loadFailed': 'Failed to load settings.',
    'err.server.timeout':
        'The server is not responding. Check that foobar2000 is running on the computer.',

    /*
     * --------------------------------------------------------
     * Ошибки URL и порта Foobar2000
     * --------------------------------------------------------
     */
    'err.url.empty': 'Foobar2000 URL is not specified.',
    'err.url.invalid': 'Invalid Foobar2000 URL.',
    'err.url.protocol': 'Foobar2000 URL must use HTTP or HTTPS.',
    'err.port.notNumber': 'Foobar2000 port must be a number.',
    'err.port.outOfRange': 'Foobar2000 port must be between 1 and 65535.',

    /*
     * --------------------------------------------------------
     * Ошибки проверки настроек
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'Foobar2000 URL is not specified',
    'err.validation.noConnection': 'No connection to Foobar2000.{details}',
    'err.validation.noConnectionHttp':
        'No connection to Foobar2000 (HTTP {status})',

    /*
     * --------------------------------------------------------
     * Ошибки списка плейлистов Beefweb
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'Failed to get the Beefweb playlist list.{details}',
    'err.playlists.listFailedHttp':
        'Failed to get the Beefweb playlist list. HTTP {status}.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плейлиста-каталога "beefweb-catalog"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Failed to read items of playlist "{playlist}".{details}',
    'err.catalog.readFailedHttp':
        'Failed to read items of playlist "{playlist}". ' +
        'HTTP {status}.{details}',
    'err.catalog.missing':
        'Playlist "{playlist}" was not found. In foobar2000 open ' +
        'Media Library, select all albums and send them to a new ' +
        'playlist named "{playlist}".',
    'err.catalog.empty':
        'Playlist "{playlist}" is empty. Send your entire media ' +
        'library from foobar2000 to it.',
    'err.catalog.tooLarge':
        'Playlist "{playlist}" contains {total} items, which ' +
        'exceeds the limit of {limit}.',
    'err.catalog.rowsMismatch':
        'Playlist "{playlist}": rows read: {count} of {total}.',
    'err.catalog.invalidResponse':
        'Playlist "{playlist}": the server returned an invalid response.',
    'err.catalog.chunkTooLarge':
        'Playlist "{playlist}": items received: {count} instead of {expected}.',
    'err.catalog.columnsMismatch':
        'Playlist "{playlist}": server returned {count} columns ' +
        'instead of {expected}.',

    /*
     * --------------------------------------------------------
     * Ошибки рабочего плейлиста "beefweb"
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'Failed to get the tracks of the current album.',
    'err.playlist.beefwebMissing': 'Playlist "beefweb" was not found.',
    'err.playlist.createFailed':
        'Failed to create playlist "beefweb".{details}',
    'err.playlist.createFailedHttp':
        'Failed to create playlist "beefweb". HTTP {status}.{details}',
    'err.playlist.clearFailed': 'Failed to clear playlist "beefweb".{details}',
    'err.playlist.clearFailedHttp':
        'Failed to clear playlist "beefweb". HTTP {status}.{details}',
    'err.playlist.addItemsFailed':
        'Failed to add tracks to playlist "beefweb".{details}',
    'err.playlist.addItemsFailedHttp':
        'Failed to add tracks to playlist "beefweb". ' +
        'HTTP {status}.{details}',

    'err.playlist.itemsFailed': 'Failed to read playlist tracks.{details}',
    'err.playlist.itemsFailedHttp':
        'Failed to read playlist tracks. HTTP {status}.{details}',
    'err.playlist.emptyPlaylist': 'The playlist is empty.',
    'err.playlist.selectFailed': 'Failed to select the playlist.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плеера Beefweb
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        'Failed to get the Beefweb player state.{details}',
    'err.player.unknownState': 'Beefweb returned an unknown player state.',
    'err.volume.notFinite': 'Volume must be a finite number.',
    'err.volume.setFailed': 'Failed to change the volume.{details}',
    'err.volume.rangeUnknown': 'Failed to determine the volume range.',
    'err.mute.setFailed': 'Failed to change the mute state.{details}',
    'err.position.invalid': 'Playback position must be non-negative.',
    'err.position.setFailed':
        'Failed to change the playback position.{details}',
    'err.pause.failed': 'Failed to pause the current track.{details}',
    'err.stop.failed': 'Failed to stop playback.{details}',
    'err.track.indexUnknown': 'Failed to determine the current track index.',
    'err.play.failed': 'Failed to start the current track.{details}',

    /*
     * --------------------------------------------------------
     * Резервные сообщения контроллера воспроизведения
     * --------------------------------------------------------
     */
    'err.playback.changeFailed': 'Failed to change the playback state.',
    'err.track.switchFailed': 'Failed to switch the track.',
    'err.album.loadFailed': 'Failed to load the album into Foobar2000.',

    /*
     * --------------------------------------------------------
     * Ошибки библиотеки и обложек
     * --------------------------------------------------------
     */
    'err.library.importFailed': 'Failed to import the media library.',
    'err.artwork.catalogMismatch':
        'Failed to match albums with playlist "beefweb-catalog". ' +
        'Update the playlist in foobar2000 and restart the application.',
    'err.artwork.fetchFailedHttp':
        'Failed to fetch the album artwork. HTTP {status}.',
    'err.artwork.emptyResponse': 'Empty artwork response.',
    'err.artwork.base64Unavailable':
        'Base64 encoding is unavailable in this environment.',
} as const;

export type TranslationKey = keyof typeof en;

export type TranslationParams = Record<string, string | number | undefined>;

/**
 * Словарь перевода: ровно те же ключи, что и в базовом
 * словаре, но со строковыми значениями любого содержания.
 */
export type TranslationDictionary = Record<TranslationKey, string>;
