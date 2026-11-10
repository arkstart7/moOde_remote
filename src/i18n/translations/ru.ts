/**
 * @file ru.ts
 * @description Русские строки интерфейса.
 *
 * Тип `typeof en` гарантирует на этапе компиляции,
 * что набор ключей полностью совпадает с базовым
 * английским словарем: пропущенный или лишний ключ
 * ломает сборку.
 */

import { TranslationDictionary } from './en';

export const ru: TranslationDictionary = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': 'Проверка настроек ...',
    'start.loadingLibrary': 'Загрузка медиа библиотеки ...',
    'start.loadingPlaylist': 'Загрузка плейлиста ...',
    'start.failed': 'Не удалось выполнить запуск приложения.',

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': 'Настройки',
    'settings.urlLabel': 'URL Foobar2000',
    'settings.portLabel': 'Порт',
    'settings.checking': 'Проверка настроек...',
    'settings.loadFailed': 'Не удалось загрузить настройки',
    'settings.checkOrSaveFailed': 'Не удалось проверить и сохранить настройки',
    'settings.language': 'Язык',
    'settings.languageEn': 'Английский',
    'settings.languageRu': 'Русский',
    'settings.languageDe': 'Немецкий',
    'settings.languageFr': 'Французский',
    'settings.languageEs': 'Испанский',
    'settings.languageZh': 'Китайский',
    'settings.theme': 'Тема',
    'settings.themeSystem': 'Системная',
    'settings.themeLight': 'Светлая',
    'settings.themeDark': 'Тёмная',

    /*
     * --------------------------------------------------------
     * NavigationBar и навигация
     * --------------------------------------------------------
     */
    'menu.main': 'Главная',
    'menu.genres': 'Жанры',
    'menu.artists': 'Исполнители',
    'menu.albums': 'Альбомы',
    'menu.tracks': 'Треки',
    'menu.playlists': 'Плейлисты',
    'menu.settings': 'Настройки',
    'common.back': 'Назад',
    'common.settings': 'Настройки',

    /*
     * --------------------------------------------------------
     * Управление воспроизведением (accessibility)
     * --------------------------------------------------------
     */
    'controls.previousTrack': 'Предыдущий трек',
    'controls.nextTrack': 'Следующий трек',
    'controls.pause': 'Поставить на паузу',
    'controls.play': 'Воспроизвести',
    'controls.pauseTrack': 'Поставить трек на паузу',
    'controls.playTrack': 'Воспроизвести текущий трек',
    'progress.position': 'Позиция воспроизведения',

    /*
     * --------------------------------------------------------
     * Громкость
     * --------------------------------------------------------
     */
    'volume.unmute': 'Включить звук',
    'volume.mute': 'Выключить звук',
    'volume.label': 'Громкость',

    /*
     * --------------------------------------------------------
     * Библиотека
     * --------------------------------------------------------
     */
    'library.allArtists': 'Все исполнители',
    'library.allGenres': 'Все жанры',
    'library.selectAlbum': 'Выбрать альбом {title}',
    'library.selectTrack': 'Выбрать трек {title}',
    'library.artist': 'Исполнитель {name}',
    'library.genre': 'Жанр {name}',
    'library.playlist': 'Плейлист {name}',
    'library.selectPlaylist': 'Выбрать плейлист {name}',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': 'Загрузка плейлистов ...',
    'tracklist.empty': 'Нет плейлистов с треками.',

    'playback.unknownTrack': 'Трек отсутствует в медиатеке.',
    'playback.commandPending': 'Выполняется команда…',

    /*
     * --------------------------------------------------------
     * Общие ошибки
     * --------------------------------------------------------
     */
    'err.unknown': 'Неизвестная ошибка.',
    'err.generic': '{details}',
    'err.response.invalid': 'Сервер вернул некорректный ответ.',
    'err.settings.notFound': 'Настройки Foobar2000 не найдены.',
    'err.settings.loadFailed': 'Не удалось загрузить настройки.',
    'err.server.timeout':
        'Сервер не отвечает. Проверьте, что foobar2000 запущен на компьютере.',

    /*
     * --------------------------------------------------------
     * Ошибки URL и порта Foobar2000
     * --------------------------------------------------------
     */
    'err.url.empty': 'Не указан URL Foobar2000.',
    'err.url.invalid': 'Некорректный URL Foobar2000.',
    'err.url.protocol': 'URL Foobar2000 должен использовать HTTP или HTTPS.',
    'err.port.notNumber': 'Порт Foobar2000 должен быть числом.',
    'err.port.outOfRange': 'Порт Foobar2000 должен быть от 1 до 65535.',

    /*
     * --------------------------------------------------------
     * Ошибки проверки настроек
     * --------------------------------------------------------
     */
    'err.validation.noUrl': 'Не указан URL Foobar2000',
    'err.validation.noConnection': 'Нет связи с Foobar2000.{details}',
    'err.validation.noConnectionHttp': 'Нет связи с Foobar2000 (HTTP {status})',

    /*
     * --------------------------------------------------------
     * Ошибки списка плейлистов Beefweb
     * --------------------------------------------------------
     */
    'err.playlists.listFailed':
        'Не удалось получить список плейлистов Beefweb.{details}',
    'err.playlists.listFailedHttp':
        'Не удалось получить список плейлистов Beefweb. ' +
        'HTTP {status}.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плейлиста-каталога "beefweb-catalog"
     * --------------------------------------------------------
     */
    'err.catalog.readFailed':
        'Не удалось прочитать элементы плейлиста "{playlist}".{details}',
    'err.catalog.readFailedHttp':
        'Не удалось прочитать элементы плейлиста "{playlist}". ' +
        'HTTP {status}.{details}',
    'err.catalog.missing':
        'Плейлист "{playlist}" не найден. В foobar2000 откройте ' +
        'Media Library, выделите все альбомы и отправьте их в новый ' +
        'плейлист с именем "{playlist}".',
    'err.catalog.empty':
        'Плейлист "{playlist}" пуст. Отправьте в него всю медиатеку ' +
        'из foobar2000.',
    'err.catalog.tooLarge':
        'Плейлист "{playlist}" содержит {total} элементов, что ' +
        'превышает предел {limit}.',
    'err.catalog.rowsMismatch':
        'Плейлист "{playlist}": прочитано строк: {count} из {total}.',
    'err.catalog.invalidResponse':
        'Плейлист "{playlist}": сервер вернул некорректный ответ.',
    'err.catalog.chunkTooLarge':
        'Плейлист "{playlist}": получено элементов: {count} вместо {expected}.',
    'err.catalog.columnsMismatch':
        'Плейлист "{playlist}": сервер вернул колонок: {count} ' +
        'вместо {expected}.',

    /*
     * --------------------------------------------------------
     * Ошибки рабочего плейлиста "beefweb"
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable':
        'Не удалось получить треки текущего альбома.',
    'err.playlist.beefwebMissing': 'Плейлист "beefweb" не найден.',
    'err.playlist.createFailed':
        'Не удалось создать плейлист "beefweb".{details}',
    'err.playlist.createFailedHttp':
        'Не удалось создать плейлист "beefweb". HTTP {status}.{details}',
    'err.playlist.clearFailed':
        'Не удалось очистить плейлист "beefweb".{details}',
    'err.playlist.clearFailedHttp':
        'Не удалось очистить плейлист "beefweb". HTTP {status}.{details}',
    'err.playlist.addItemsFailed':
        'Не удалось добавить треки в плейлист "beefweb".{details}',
    'err.playlist.addItemsFailedHttp':
        'Не удалось добавить треки в плейлист "beefweb". ' +
        'HTTP {status}.{details}',

    'err.playlist.itemsFailed':
        'Не удалось прочитать треки плейлиста.{details}',
    'err.playlist.itemsFailedHttp':
        'Не удалось прочитать треки плейлиста. HTTP {status}.{details}',
    'err.playlist.emptyPlaylist': 'Плейлист пуст.',
    'err.playlist.selectFailed': 'Не удалось выбрать плейлист.{details}',

    /*
     * --------------------------------------------------------
     * Ошибки плеера Beefweb
     * --------------------------------------------------------
     */
    'err.player.stateFailed':
        'Не удалось получить состояние проигрывателя Beefweb.{details}',
    'err.player.unknownState':
        'Beefweb вернул неизвестное состояние проигрывателя.',
    'err.volume.notFinite': 'Громкость должна быть конечным числом.',
    'err.volume.setFailed': 'Не удалось изменить громкость.{details}',
    'err.volume.rangeUnknown': 'Не удалось определить диапазон громкости.',
    'err.mute.setFailed': 'Не удалось изменить состояние mute.{details}',
    'err.position.invalid':
        'Позиция воспроизведения должна быть неотрицательной.',
    'err.position.setFailed':
        'Не удалось изменить позицию воспроизведения.{details}',
    'err.pause.failed': 'Не удалось поставить текущий трек на паузу.{details}',
    'err.stop.failed': 'Не удалось остановить воспроизведение.{details}',
    'err.track.indexUnknown': 'Не удалось определить индекс текущего трека.',
    'err.play.failed': 'Не удалось запустить текущий трек.{details}',

    /*
     * --------------------------------------------------------
     * Резервные сообщения контроллера воспроизведения
     * --------------------------------------------------------
     */
    'err.playback.changeFailed': 'Не удалось изменить состояние проигрывателя.',
    'err.track.switchFailed': 'Не удалось переключить трек.',
    'err.album.loadFailed': 'Не удалось загрузить альбом в Foobar2000.',

    /*
     * --------------------------------------------------------
     * Ошибки библиотеки и обложек
     * --------------------------------------------------------
     */
    'err.library.importFailed': 'Не удалось импортировать медиатеку.',
    'err.artwork.catalogMismatch':
        'Не удалось сопоставить альбомы с плейлистом ' +
        '"beefweb-catalog". Обновите плейлист в foobar2000 ' +
        'и перезапустите приложение.',
    'err.artwork.fetchFailedHttp':
        'Не удалось получить обложку альбома. HTTP {status}.',
    'err.artwork.emptyResponse': 'Пустой ответ с обложкой альбома.',
    'err.artwork.base64Unavailable':
        'Кодирование base64 недоступно в этом окружении.',
};
