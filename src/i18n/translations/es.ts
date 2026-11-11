/**
 * @file es.ts
 * @description Испанские строки интерфейса.
 */

import { TranslationDictionary } from './en';

export const es: TranslationDictionary = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': 'Comprobando configuración ...',
    'start.loadingLibrary': 'Cargando biblioteca multimedia ...',
    'start.loadingPlaylist': 'Cargando lista de reproducción ...',
    'start.failed': 'No se pudo iniciar la aplicación.',

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': 'Configuración',
    'settings.urlLabel': 'URL de MPD',
    'settings.portLabel': 'Puerto',
    'settings.checking': 'Comprobando configuración...',
    'settings.loadFailed': 'No se pudo cargar la configuración',
    'settings.checkOrSaveFailed':
        'No se pudo verificar y guardar la configuración',
    'settings.language': 'Idioma',
    'settings.languageEn': 'Inglés',
    'settings.languageRu': 'Ruso',
    'settings.languageDe': 'Alemán',
    'settings.languageFr': 'Francés',
    'settings.languageEs': 'Español',
    'settings.languageZh': 'Chino',
    'settings.theme': 'Tema',
    'settings.themeSystem': 'Sistema',
    'settings.themeLight': 'Claro',
    'settings.themeDark': 'Oscuro',

    /*
     * --------------------------------------------------------
     * NavigationBar y navegación
     * --------------------------------------------------------
     */
    'menu.main': 'Principal',
    'menu.genres': 'Géneros',
    'menu.artists': 'Artistas',
    'menu.albums': 'Álbumes',
    'menu.tracks': 'Pistas',
    'menu.playlists': 'Listas de reproducción',
    'menu.settings': 'Configuración',
    'common.back': 'Atrás',
    'common.settings': 'Configuración',

    /*
     * --------------------------------------------------------
     * Control de reproducción (accesibilidad)
     * --------------------------------------------------------
     */
    'controls.previousTrack': 'Pista anterior',
    'controls.nextTrack': 'Pista siguiente',
    'controls.pause': 'Pausa',
    'controls.play': 'Reproducir',
    'controls.pauseTrack': 'Pausar la pista actual',
    'controls.playTrack': 'Reproducir la pista actual',
    'progress.position': 'Posición de reproducción',

    /*
     * --------------------------------------------------------
     * Volumen
     * --------------------------------------------------------
     */
    'volume.unmute': 'Activar sonido',
    'volume.mute': 'Silenciar',
    'volume.label': 'Volumen',

    /*
     * --------------------------------------------------------
     * Biblioteca
     * --------------------------------------------------------
     */
    'library.allArtists': 'Todos los artistas',
    'library.allGenres': 'Todos los géneros',
    'library.selectAlbum': 'Seleccionar álbum {title}',
    'library.selectTrack': 'Seleccionar pista {title}',
    'library.artist': 'Artista {name}',
    'library.genre': 'Género {name}',
    'library.playlist': 'Lista de reproducción {name}',
    'library.selectPlaylist': 'Seleccionar lista de reproducción {name}',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': 'Cargando listas de reproducción ...',
    'tracklist.empty': 'No hay listas de reproducción con pistas.',

    'playback.unknownTrack': 'La pista no está en la biblioteca.',
    'playback.commandPending': 'Ejecutando comando…',

    /*
     * --------------------------------------------------------
     * Errores generales
     * --------------------------------------------------------
     */
    'err.unknown': 'Error desconocido.',
    'err.generic': '{details}',
    'err.response.invalid': 'El servidor devolvió una respuesta no válida.',
    'err.settings.notFound': 'La configuración de MPD no está configurada.',
    'err.settings.loadFailed': 'No se pudo cargar la configuración.',
    'err.server.timeout':
        'El servidor no responde. Compruebe que MPD está en ejecución en el ordenador.',

    /*
     * --------------------------------------------------------
     * Errores de URL y puerto de MPD
     * --------------------------------------------------------
     */
    'err.url.empty': 'No se especificó la URL de MPD.',
    'err.url.invalid': 'URL de MPD no válida.',
    'err.url.protocol': 'La URL de MPD debe usar HTTP o HTTPS.',
    'err.port.notNumber': 'El puerto de MPD debe ser un número.',
    'err.port.outOfRange': 'El puerto de MPD debe estar entre 1 y 65535.',

    /*
     * --------------------------------------------------------
     * Errores de verificación de la configuración
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'No se especificó la URL de MPD',
    'err.validation.noConnection': 'Sin conexión con MPD.{details}',

    /*
     * --------------------------------------------------------
     * Errores de la lista de listas de reproducción de MPD
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'No se pudo obtener la lista de listas de reproducción de MPD.{details}',

    /*
     * --------------------------------------------------------
     * Errores del catálogo de la lista "медиатека MPD"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'No se pudieron leer los elementos de la lista de reproducción "{playlist}".{details}',
    'err.catalog.empty':
        'La lista de reproducción "{playlist}" está vacía. Envíe a ella toda su biblioteca multimedia.',
    'err.catalog.tooLarge':
        'La lista de reproducción "{playlist}" contiene {total} elementos, lo que supera el límite de {limit}.',

    /*
     * --------------------------------------------------------
     * Errores de la lista de reproducción MPD
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'No se pudieron obtener las pistas del álbum actual.',
    'err.playlist.clearFailed':
        'No se pudo vaciar la lista de reproducción MPD.{details}',
    'err.playlist.addItemsFailed':
        'No se pudieron añadir las pistas a la lista de reproducción.{details}',

    'err.playlist.itemsFailed':
        'No se pudieron leer las pistas de la lista de reproducción.{details}',
    'err.playlist.emptyPlaylist': 'La lista de reproducción está vacía.',
    'err.playlist.selectFailed':
        'No se pudo seleccionar la lista de reproducción.{details}',

    /*
     * --------------------------------------------------------
     * Errores del reproductor MPD
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        'No se pudo obtener el estado del reproductor MPD.{details}',
    'err.player.unknownState':
        'MPD devolvió un estado de reproductor desconocido.',
    'err.volume.notFinite': 'El volumen debe ser un número finito.',
    'err.volume.setFailed': 'No se pudo cambiar el volumen.{details}',
    'err.volume.rangeUnknown': 'No se pudo determinar el rango del volumen.',
    'err.mute.setFailed': 'No se pudo cambiar el estado de silencio.{details}',
    'err.position.invalid': 'La posición de reproducción debe ser no negativa.',
    'err.position.setFailed':
        'No se pudo cambiar la posición de reproducción.{details}',
    'err.pause.failed': 'No se pudo pausar la pista actual.{details}',
    'err.stop.failed': 'No se pudo detener la reproducción.{details}',
    'err.track.indexUnknown':
        'No se pudo determinar el índice de la pista actual.',
    'err.play.failed':
        'No se pudo iniciar la reproducción de la pista actual.{details}',

    /*
     * --------------------------------------------------------
     * Mensajes de respaldo del controlador de reproducción
     * --------------------------------------------------------
     */
    'err.playback.changeFailed':
        'No se pudo cambiar el estado de reproducción.',
    'err.track.switchFailed': 'No se pudo cambiar la pista.',
    'err.album.loadFailed': 'No se pudo cargar el álbum en MPD.',

    /*
     * --------------------------------------------------------
     * Errores de la biblioteca y las portadas
     * --------------------------------------------------------
     */
    'err.library.importFailed': 'No se pudo importar la biblioteca multimedia.',
    'err.artwork.fetchFailed':
        'No se pudo obtener la portada del álbum.{details}',
    'err.artwork.base64Unavailable':
        'La codificación Base64 no está disponible en este entorno.',
} as const;
