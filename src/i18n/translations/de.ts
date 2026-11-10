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
    'settings.urlLabel': 'Foobar2000-URL',
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
    'err.settings.notFound':
        'Foobar2000-Einstellungen sind nicht konfiguriert.',
    'err.settings.loadFailed': 'Einstellungen konnten nicht geladen werden.',
    'err.server.timeout':
        'Der Server antwortet nicht. Prüfen Sie, ob foobar2000 auf dem Computer läuft.',

    /*
     * --------------------------------------------------------
     * Fehler bei URL und Port von Foobar2000
     * --------------------------------------------------------
     */
    'err.url.empty': 'Foobar2000-URL ist nicht angegeben.',
    'err.url.invalid': 'Ungültige Foobar2000-URL.',
    'err.url.protocol': 'Foobar2000-URL muss HTTP oder HTTPS verwenden.',
    'err.port.notNumber': 'Foobar2000-Port muss eine Zahl sein.',
    'err.port.outOfRange': 'Foobar2000-Port muss zwischen 1 und 65535 liegen.',

    /*
     * --------------------------------------------------------
     * Fehler bei der Überprüfung der Einstellungen
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'Foobar2000-URL ist nicht angegeben',
    'err.validation.noConnection': 'Keine Verbindung zu Foobar2000.{details}',
    'err.validation.noConnectionHttp':
        'Keine Verbindung zu Foobar2000 (HTTP {status})',

    /*
     * --------------------------------------------------------
     * Fehler bei der Wiedergabelistenliste von Beefweb
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'Wiedergabelistenliste von Beefweb konnte nicht abgerufen werden.{details}',
    'err.playlists.listFailedHttp':
        'Wiedergabelistenliste von Beefweb konnte nicht abgerufen werden. ' +
        'HTTP {status}.{details}',

    /*
     * --------------------------------------------------------
     * Fehler beim Katalog der Wiedergabeliste "beefweb-catalog"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Elemente der Wiedergabeliste "{playlist}" konnten nicht gelesen werden.{details}',
    'err.catalog.readFailedHttp':
        'Elemente der Wiedergabeliste "{playlist}" konnten nicht gelesen werden. ' +
        'HTTP {status}.{details}',
    'err.catalog.missing':
        'Wiedergabeliste "{playlist}" wurde nicht gefunden. Öffnen Sie in foobar2000 die Medienbibliothek, wählen Sie alle Alben aus und senden Sie sie an eine neue Wiedergabeliste mit dem Namen "{playlist}".',
    'err.catalog.empty':
        'Wiedergabeliste "{playlist}" ist leer. Senden Sie Ihre gesamte Medienbibliothek dorthin.',
    'err.catalog.tooLarge':
        'Wiedergabeliste "{playlist}" enthält {total} Elemente, was das Limit von {limit} überschreitet.',
    'err.catalog.rowsMismatch':
        'Wiedergabeliste "{playlist}": gelesene Zeilen: {count} von {total}.',
    'err.catalog.invalidResponse':
        'Wiedergabeliste "{playlist}": Der Server hat eine ungültige Antwort zurückgegeben.',
    'err.catalog.chunkTooLarge':
        'Wiedergabeliste "{playlist}": Empfangene Elemente: {count} statt {expected}.',
    'err.catalog.columnsMismatch':
        'Wiedergabeliste "{playlist}": Der Server hat {count} Spalten statt {expected} zurückgegeben.',

    /*
     * --------------------------------------------------------
     * Fehler der Arbeitswiedergabeliste "beefweb"
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'Die Titel des aktuellen Albums konnten nicht abgerufen werden.',
    'err.playlist.beefwebMissing':
        'Wiedergabeliste "beefweb" wurde nicht gefunden.',
    'err.playlist.createFailed':
        'Wiedergabeliste "beefweb" konnte nicht erstellt werden.{details}',
    'err.playlist.createFailedHttp':
        'Wiedergabeliste "beefweb" konnte nicht erstellt werden. HTTP {status}.{details}',
    'err.playlist.clearFailed':
        'Wiedergabeliste "beefweb" konnte nicht geleert werden.{details}',
    'err.playlist.clearFailedHttp':
        'Wiedergabeliste "beefweb" konnte nicht geleert werden. HTTP {status}.{details}',
    'err.playlist.addItemsFailed':
        'Titel konnten nicht zur Wiedergabeliste hinzugefügt werden.{details}',
    'err.playlist.addItemsFailedHttp':
        'Titel konnten nicht zur Wiedergabeliste hinzugefügt werden. HTTP {status}.{details}',

    'err.playlist.itemsFailed':
        'Titel der Wiedergabeliste konnten nicht gelesen werden.{details}',
    'err.playlist.itemsFailedHttp':
        'Titel der Wiedergabeliste konnten nicht gelesen werden. HTTP {status}.{details}',
    'err.playlist.emptyPlaylist': 'Die Wiedergabeliste ist leer.',
    'err.playlist.selectFailed':
        'Wiedergabeliste konnte nicht ausgewählt werden.{details}',

    /*
     * --------------------------------------------------------
     * Fehler des Beefweb-Players
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        'Status des Beefweb-Players konnte nicht abgerufen werden.{details}',
    'err.player.unknownState':
        'Beefweb hat einen unbekannten Player-Status zurückgegeben.',
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
    'err.album.loadFailed':
        'Das Album konnte nicht in Foobar2000 geladen werden.',

    /*
     * --------------------------------------------------------
     * Fehler der Bibliothek und Cover
     * --------------------------------------------------------
     */
    'err.library.importFailed':
        'Die Medienbibliothek konnte nicht importiert werden.',
    'err.artwork.catalogMismatch':
        'Alben konnten nicht mit der Wiedergabeliste "beefweb-catalog" abgeglichen werden. ' +
        'Aktualisieren Sie die Wiedergabeliste in foobar2000 und starten Sie die Anwendung neu.',
    'err.artwork.fetchFailedHttp':
        'Album-Cover konnte nicht abgerufen werden. HTTP {status}.',
    'err.artwork.emptyResponse': 'Leere Antwort für das Album-Cover.',
    'err.artwork.base64Unavailable':
        'Base64-Kodierung ist in dieser Umgebung nicht verfügbar.',
} as const;
