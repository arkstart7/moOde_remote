/**
 * @file fr.ts
 * @description Французские строки интерфейса.
 */

import { TranslationDictionary } from './en';

export const fr: TranslationDictionary = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': 'Vérification des paramètres ...',
    'start.loadingLibrary': 'Chargement de la bibliothèque multimédia ...',
    'start.loadingPlaylist': 'Chargement de la liste de lecture ...',
    'start.failed': "Impossible de démarrer l'application.",

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': 'Paramètres',
    'settings.urlLabel': 'URL de MPD',
    'settings.portLabel': 'Port',
    'settings.checking': 'Vérification des paramètres...',
    'settings.loadFailed': 'Échec du chargement des paramètres',
    'settings.checkOrSaveFailed':
        "Échec de la vérification et de l'enregistrement des paramètres",
    'settings.language': 'Langue',
    'settings.languageEn': 'Anglais',
    'settings.languageRu': 'Russe',
    'settings.languageDe': 'Allemand',
    'settings.languageFr': 'Français',
    'settings.languageEs': 'Espagnol',
    'settings.languageZh': 'Chinois',
    'settings.theme': 'Thème',
    'settings.themeSystem': 'Système',
    'settings.themeLight': 'Clair',
    'settings.themeDark': 'Sombre',

    /*
     * --------------------------------------------------------
     * NavigationBar et navigation
     * --------------------------------------------------------
     */
    'menu.main': 'Accueil',
    'menu.genres': 'Genres',
    'menu.artists': 'Artistes',
    'menu.albums': 'Albums',
    'menu.tracks': 'Morceaux',
    'menu.playlists': 'Listes de lecture',
    'menu.settings': 'Paramètres',
    'common.back': 'Retour',
    'common.settings': 'Paramètres',

    /*
     * --------------------------------------------------------
     * Contrôle de la lecture (accessibilité)
     * --------------------------------------------------------
     */
    'controls.previousTrack': 'Morceau précédent',
    'controls.nextTrack': 'Morceau suivant',
    'controls.pause': 'Pause',
    'controls.play': 'Lecture',
    'controls.pauseTrack': 'Mettre en pause le morceau actuel',
    'controls.playTrack': 'Lire le morceau actuel',
    'progress.position': 'Position de lecture',

    /*
     * --------------------------------------------------------
     * Volume
     * --------------------------------------------------------
     */
    'volume.unmute': 'Réactiver le son',
    'volume.mute': 'Couper le son',
    'volume.label': 'Volume',

    /*
     * --------------------------------------------------------
     * Bibliothèque
     * --------------------------------------------------------
     */
    'library.allArtists': 'Tous les artistes',
    'library.allGenres': 'Tous les genres',
    'library.selectAlbum': "Sélectionner l'album {title}",
    'library.selectTrack': 'Sélectionner le morceau {title}',
    'library.artist': 'Artiste {name}',
    'library.genre': 'Genre {name}',
    'library.playlist': 'Liste de lecture {name}',
    'library.selectPlaylist': 'Sélectionner la liste de lecture {name}',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': 'Chargement des listes de lecture ...',
    'tracklist.empty': 'Aucune liste de lecture avec des morceaux.',

    'playback.unknownTrack': 'Morceau non présent dans la bibliothèque.',
    'playback.commandPending': 'Commande en cours…',

    /*
     * --------------------------------------------------------
     * Erreurs générales
     * --------------------------------------------------------
     */
    'err.unknown': 'Erreur inconnue.',
    'err.generic': '{details}',
    'err.response.invalid': 'Le serveur a renvoyé une réponse invalide.',
    'err.settings.notFound': 'Les paramètres de MPD ne sont pas configurés.',
    'err.settings.loadFailed': 'Échec du chargement des paramètres.',
    'err.server.timeout':
        "Le serveur ne répond pas. Vérifiez que MPD est lancé sur l'ordinateur.",

    /*
     * --------------------------------------------------------
     * Erreurs d'URL et de port MPD
     * --------------------------------------------------------
     */
    'err.url.empty': "L'URL de MPD n'est pas spécifiée.",
    'err.url.invalid': 'URL de MPD invalide.',
    'err.url.protocol': "L'URL de MPD doit utiliser HTTP ou HTTPS.",
    'err.port.notNumber': 'Le port de MPD doit être un nombre.',
    'err.port.outOfRange': 'Le port de MPD doit être compris entre 1 et 65535.',

    /*
     * --------------------------------------------------------
     * Erreurs de vérification des paramètres
     * --------------------------------------------------------
     */
    'err.validation.noUrl': "L'URL de MPD n'est pas spécifiée",
    'err.validation.noConnection': 'Pas de connexion à MPD.{details}',

    /*
     * --------------------------------------------------------
     * Erreurs de la liste des listes de lecture MPD
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'Échec de la récupération de la liste des listes de lecture MPD.{details}',

    /*
     * --------------------------------------------------------
     * Erreurs du catalogue de la liste "медиатека MPD"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Échec de la lecture des éléments de la liste de lecture "{playlist}".{details}',
    'err.catalog.empty':
        'La liste de lecture "{playlist}" est vide. Envoyez-y toute votre bibliothèque multimédia.',
    'err.catalog.tooLarge':
        'La liste de lecture "{playlist}" contient {total} éléments, ce qui dépasse la limite de {limit}.',

    /*
     * --------------------------------------------------------
     * Erreurs de la liste de lecture MPD
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        "Échec de la récupération des pistes de l'album actuel.",
    'err.playlist.clearFailed':
        'Échec de la suppression du contenu de la liste de lecture MPD.{details}',
    'err.playlist.addItemsFailed':
        "Échec de l'ajout des morceaux à la liste de lecture.{details}",

    'err.playlist.itemsFailed':
        'Échec de la lecture des morceaux de la liste de lecture.{details}',
    'err.playlist.emptyPlaylist': 'La liste de lecture est vide.',
    'err.playlist.selectFailed':
        'Échec de la sélection de la liste de lecture.{details}',

    /*
     * --------------------------------------------------------
     * Erreurs du lecteur MPD
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        "Échec de la récupération de l'état du lecteur MPD.{details}",
    'err.player.unknownState': 'MPD a renvoyé un état de lecteur inconnu.',
    'err.volume.notFinite': 'Le volume doit être un nombre fini.',
    'err.volume.setFailed': 'Échec de la modification du volume.{details}',
    'err.volume.rangeUnknown': 'Impossible de déterminer la plage de volume.',
    'err.mute.setFailed':
        "Échec de la modification de l'état de sourdine.{details}",
    'err.position.invalid': 'La position de lecture doit être non négative.',
    'err.position.setFailed':
        'Échec de la modification de la position de lecture.{details}',
    'err.pause.failed': 'Échec de la mise en pause du morceau actuel.{details}',
    'err.stop.failed': "Échec de l'arrêt de la lecture.{details}",
    'err.track.indexUnknown':
        "Impossible de déterminer l'index du morceau actuel.",
    'err.play.failed': 'Échec du démarrage du morceau actuel.{details}',

    /*
     * --------------------------------------------------------
     * Messages de secours du contrôleur de lecture
     * --------------------------------------------------------
     */
    'err.playback.changeFailed':
        "Échec de la modification de l'état de lecture.",
    'err.track.switchFailed': 'Échec du changement de morceau.',
    'err.album.loadFailed': "Échec du chargement de l'album dans MPD.",

    /*
     * --------------------------------------------------------
     * Erreurs de la bibliothèque et des pochettes
     * --------------------------------------------------------
     */
    'err.library.importFailed':
        "Échec de l'importation de la bibliothèque multimédia.",
    'err.artwork.fetchFailed':
        "Échec de la récupération de la pochette de l'album.{details}",
    'err.artwork.base64Unavailable':
        "L'encodage Base64 n'est pas disponible dans cet environnement.",
} as const;
