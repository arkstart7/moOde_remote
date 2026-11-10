/**
 * @file de.ts
 * @description Немецкие строки интерфейса.
 */

import { TranslationDictionary } from './en';

export const de: TranslationDictionary = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': 'Einstellungen werden überprüft ...',
    'start.loadingLibrary': 'Medienbibliothek wird geladen ...',
    'start.loadingPlaylist': 'Wiedergabeliste wird geladen ...',
    'start.failed': 'Die Anwendung konnte nicht gestartet werden.',

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': 'Einstellungen',
    'settings.urlLabel': 'MPD-URL',
    'settings.portLabel': 'Port',
    'settings.checking': 'Einstellungen werden überprüft...',
    'settings.loadFailed': 'Einstellungen konnten nicht geladen werden',
    'settings.checkOrSaveFailed':
        'Einstellungen konnten nicht überprüft und gespeichert werden',
    'settings.language': 'Sprache',
    'settings.languageEn': 'Englisch',
    'settings.languageRu': 'Russisch',
    'settings.languageDe': 'Deutsch',
    'settings.languageFr': 'Französisch',
    'settings.languageEs': 'Spanisch',
    'settings.languageZh': 'Chinesisch',
    'settings.theme': 'Design',
    'settings.themeSystem': 'System',
    'settings.themeLight': 'Hell',
    'settings.themeDark': 'Dunkel',

    /*
     * --------------------------------------------------------
     * NavigationBar und Navigation
     * --------------------------------------------------------
     */
    'menu.main': 'Hauptseite',
    'menu.genres': 'Genres',
    'menu.artists': 'Künstler',
    'menu.albums': 'Alben',
    'menu.tracks': 'Titel',
    'menu.playlists': 'Wiedergabelisten',
    'menu.settings': 'Einstellungen',
    'common.back': 'Zurück',
    'common.settings': 'Einstellungen',

    /*
     * --------------------------------------------------------
     * Wiedergabesteuerung (Barrierefreiheit)
     * --------------------------------------------------------
     */
    'controls.previousTrack': 'Vorheriger Titel',
    'controls.nextTrack': 'Nächster Titel',
    'controls.pause': 'Pause',
    'controls.play': 'Wiedergeben',
    'controls.pauseTrack': 'Aktuellen Titel pausieren',
    'controls.playTrack': 'Aktuellen Titel wiedergeben',
    'progress.position': 'Wiedergabeposition',

    /*
     * --------------------------------------------------------
     * Lautstärke
     * --------------------------------------------------------
     */
    'volume.unmute': 'Stummschaltung aufheben',
    'volume.mute': 'Stummschalten',
    'volume.label': 'Lautstärke',

    /*
     * --------------------------------------------------------
     * Bibliothek
     * --------------------------------------------------------
     */
    'library.allArtists': 'Alle Künstler',
    'library.allGenres': 'Alle Genres',
    'library.selectAlbum': 'Album {title} auswählen',
    'library.selectTrack': 'Titel {title} auswählen',
    'library.artist': 'Künstler {name}',
    'library.genre': 'Genre {name}',
    'library.playlist': 'Wiedergabeliste {name}',
    'library.selectPlaylist': 'Wiedergabeliste {name} auswählen',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': 'Wiedergabelisten werden geladen ...',
    'tracklist.empty': 'Keine Wiedergabelisten mit Titeln.',

    'playback.unknownTrack': 'Titel nicht in der Bibliothek.',
    'playback.commandPending': 'Befehl wird ausgeführt…',

    /*
     * --------------------------------------------------------
     * Allgemeine Fehler
     * --------------------------------------------------------
     */
    'err.unknown': 'Unbekannter Fehler.',
    'err.generic': '{details}',
    'err.response.invalid':
        'Der Server hat eine ungültige Antwort zurückgegeben.',
    'err.settings.notFound': 'MPD-Einstellungen sind nicht konfiguriert.',
    'err.settings.loadFailed': 'Einstellungen konnten nicht geladen werden.',
    'err.server.timeout':
        'Der Server antwortet nicht. Prüfen Sie, ob foobar2000 auf dem Computer läuft.',

    /*
     * --------------------------------------------------------
     * Fehler bei URL und Port von MPD
     * --------------------------------------------------------
     */
    'err.url.empty': 'MPD-URL ist nicht angegeben.',
    'err.url.invalid': 'Ungültige MPD-URL.',
    'err.url.protocol': 'MPD-URL muss HTTP oder HTTPS verwenden.',
    'err.port.notNumber': 'MPD-Port muss eine Zahl sein.',
    'err.port.outOfRange': 'MPD-Port muss zwischen 1 und 65535 liegen.',

    /*
     * --------------------------------------------------------
     * Fehler bei der Überprüfung der Einstellungen
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'MPD-URL ist nicht angegeben',
    'err.validation.noConnection': 'Keine Verbindung zu MPD.{details}',

    /*
     * --------------------------------------------------------
     * Fehler bei der Wiedergabelistenliste von MPD
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'Wiedergabelistenliste von MPD konnte nicht abgerufen werden.{details}',

    /*
     * --------------------------------------------------------
     * Fehler beim Katalog der Wiedergabeliste "медиатека MPD"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Elemente der Wiedergabeliste "{playlist}" konnten nicht gelesen werden.{details}',
    'err.catalog.empty':
        'Wiedergabeliste "{playlist}" ist leer. Senden Sie Ihre gesamte Medienbibliothek dorthin.',
    'err.catalog.tooLarge':
        'Wiedergabeliste "{playlist}" enthält {total} Elemente, was das Limit von {limit} überschreitet.',

    /*
     * --------------------------------------------------------
     * Fehler der Arbeitswiedergabeliste MPD
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'Die Titel des aktuellen Albums konnten nicht abgerufen werden.',
    'err.playlist.clearFailed':
        'Wiedergabeliste MPD konnte nicht geleert werden.{details}',
    'err.playlist.addItemsFailed':
        'Titel konnten nicht zur Wiedergabeliste hinzugefügt werden.{details}',

    'err.playlist.itemsFailed':
        'Titel der Wiedergabeliste konnten nicht gelesen werden.{details}',
    'err.playlist.emptyPlaylist': 'Die Wiedergabeliste ist leer.',
    'err.playlist.selectFailed':
        'Wiedergabeliste konnte nicht ausgewählt werden.{details}',

    /*
     * --------------------------------------------------------
     * Fehler des MPD-Players
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        'Status des MPD-Players konnte nicht abgerufen werden.{details}',
    'err.player.unknownState':
        'MPD hat einen unbekannten Player-Status zurückgegeben.',
    'err.volume.notFinite': 'Die Lautstärke muss eine endliche Zahl sein.',
    'err.volume.setFailed':
        'Die Lautstärke konnte nicht geändert werden.{details}',
    'err.volume.rangeUnknown':
        'Der Lautstärkebereich konnte nicht ermittelt werden.',
    'err.mute.setFailed':
        'Der Stummschaltungsstatus konnte nicht geändert werden.{details}',
    'err.position.invalid': 'Die Wiedergabeposition muss nicht-negativ sein.',
    'err.position.setFailed':
        'Die Wiedergabeposition konnte nicht geändert werden.{details}',
    'err.pause.failed':
        'Der aktuelle Titel konnte nicht pausiert werden.{details}',
    'err.stop.failed': 'Die Wiedergabe konnte nicht gestoppt werden.{details}',
    'err.track.indexUnknown':
        'Der Index des aktuellen Titels konnte nicht ermittelt werden.',
    'err.play.failed':
        'Der aktuelle Titel konnte nicht gestartet werden.{details}',

    /*
     * --------------------------------------------------------
     * Reservemeldungen des Wiedergabesteuerers
     * --------------------------------------------------------
     */
    'err.playback.changeFailed':
        'Der Wiedergabestatus konnte nicht geändert werden.',
    'err.track.switchFailed': 'Der Titel konnte nicht gewechselt werden.',
    'err.album.loadFailed': 'Das Album konnte nicht in MPD geladen werden.',

    /*
     * --------------------------------------------------------
     * Fehler der Bibliothek und Cover
     * --------------------------------------------------------
     */
    'err.library.importFailed':
        'Die Medienbibliothek konnte nicht importiert werden.',
    'err.artwork.fetchFailed':
        'Album-Cover konnte nicht abgerufen werden.{details}',
    'err.artwork.base64Unavailable':
        'Base64-Kodierung ist in dieser Umgebung nicht verfügbar.',
} as const;
