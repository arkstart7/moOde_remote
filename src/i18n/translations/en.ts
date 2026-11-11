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
    'settings.urlLabel': 'MPD URL',
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
    'err.settings.notFound': 'MPD settings are not configured.',
    'err.settings.loadFailed': 'Failed to load settings.',
    'err.server.timeout':
        'The server is not responding. Check that MPD is running on the computer.',

    /*
     * --------------------------------------------------------
     * Ошибки URL и порта MPD
     * --------------------------------------------------------
     */
    'err.url.empty': 'MPD URL is not specified.',
    'err.url.invalid': 'Invalid MPD URL.',
    'err.url.protocol': 'MPD URL must use HTTP or HTTPS.',
    'err.port.notNumber': 'MPD port must be a number.',
    'err.port.outOfRange': 'MPD port must be between 1 and 65535.',

    /*
     * --------------------------------------------------------
     * Ошибки проверки настроек
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'MPD URL is not specified',
    'err.validation.noConnection': 'No connection to MPD.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки списка плейлистов MPD
     * --------------------------------------------------------
     */
    'err.playlists.listFailed': 'Failed to get the MPD playlist list.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плейлиста-каталога "медиатека MPD"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Failed to read items of playlist "{playlist}".{details}',
    'err.catalog.empty':
        'Playlist "{playlist}" is empty. Send your entire media ' +
        'library from MPD to it.',
    'err.catalog.tooLarge':
        'Playlist "{playlist}" contains {total} items, which ' +
        'exceeds the limit of {limit}.',

    /*
     * --------------------------------------------------------
     * Ошибки рабочего очереди MPD
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'Failed to get the tracks of the current album.',
    'err.playlist.clearFailed': 'Failed to clear MPD queue.{details}',
    'err.playlist.addItemsFailed':
        'Failed to add tracks to MPD queue.{details}',

    'err.playlist.itemsFailed': 'Failed to read playlist tracks.{details}',
    'err.playlist.emptyPlaylist': 'The playlist is empty.',
    'err.playlist.selectFailed': 'Failed to select the playlist.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плеера MPD
     * --------------------------------------------------------
     */
    'err.player.stateFailed': 'Failed to get the MPD player state.{details}',
    'err.player.unknownState': 'MPD returned an unknown player state.',
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
    'err.album.loadFailed': 'Failed to load the album into MPD.',

    /*
     * --------------------------------------------------------
     * Ошибки библиотеки и обложек
     * --------------------------------------------------------
     */
    'err.library.importFailed': 'Failed to import the media library.',
    'err.artwork.fetchFailed': 'Failed to fetch the album artwork.{details}',
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
