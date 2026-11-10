/**
 * @file zh.ts
 * @description Chinese strings of the interface.
 */

import { TranslationDictionary } from './en';

export const zh: TranslationDictionary = {
    /*
     * --------------------------------------------------------
     * StartScreen
     * --------------------------------------------------------
     */
    'start.checkingSettings': '正在检查设置 ...',
    'start.loadingLibrary': '正在加载媒体库 ...',
    'start.loadingPlaylist': '正在加载播放列表 ...',
    'start.failed': '无法启动应用程序。',

    /*
     * --------------------------------------------------------
     * SettingsScreen
     * --------------------------------------------------------
     */
    'settings.title': '设置',
    'settings.urlLabel': 'Foobar2000 URL',
    'settings.portLabel': '端口',
    'settings.checking': '正在检查设置...',
    'settings.loadFailed': '无法加载设置',
    'settings.checkOrSaveFailed': '无法验证和保存设置',
    'settings.language': '语言',
    'settings.languageEn': '英语',
    'settings.languageRu': '俄语',
    'settings.languageDe': '德语',
    'settings.languageFr': '法语',
    'settings.languageEs': '西班牙语',
    'settings.languageZh': '中文',
    'settings.theme': '主题',
    'settings.themeSystem': '系统',
    'settings.themeLight': '浅色',
    'settings.themeDark': '深色',

    /*
     * --------------------------------------------------------
     * NavigationBar 和导航
     * --------------------------------------------------------
     */
    'menu.main': '主页',
    'menu.genres': '流派',
    'menu.artists': '艺术家',
    'menu.albums': '专辑',
    'menu.tracks': '曲目',
    'menu.playlists': '播放列表',
    'menu.settings': '设置',
    'common.back': '返回',
    'common.settings': '设置',

    /*
     * --------------------------------------------------------
     * 播放控制（无障碍）
     * --------------------------------------------------------
     */
    'controls.previousTrack': '上一曲目',
    'controls.nextTrack': '下一曲目',
    'controls.pause': '暂停',
    'controls.play': '播放',
    'controls.pauseTrack': '暂停当前曲目',
    'controls.playTrack': '播放当前曲目',
    'progress.position': '播放位置',

    /*
     * --------------------------------------------------------
     * 音量
     * --------------------------------------------------------
     */
    'volume.unmute': '取消静音',
    'volume.mute': '静音',
    'volume.label': '音量',

    /*
     * --------------------------------------------------------
     * 媒体库
     * --------------------------------------------------------
     */
    'library.allArtists': '所有艺术家',
    'library.allGenres': '所有流派',
    'library.selectAlbum': '选择专辑 {title}',
    'library.selectTrack': '选择曲目 {title}',
    'library.artist': '艺术家 {name}',
    'library.genre': '流派 {name}',
    'library.playlist': '播放列表 {name}',
    'library.selectPlaylist': '选择播放列表 {name}',

    /*
     * --------------------------------------------------------
     * PlaylistScreen
     * --------------------------------------------------------
     */
    'tracklist.loading': '正在加载播放列表 ...',
    'tracklist.empty': '没有包含曲目的播放列表。',

    'playback.unknownTrack': '曲目不在媒体库中。',
    'playback.commandPending': '正在执行命令…',

    /*
     * --------------------------------------------------------
     * 常规错误
     * --------------------------------------------------------
     */
    'err.unknown': '未知错误。',
    'err.generic': '{details}',
    'err.response.invalid': '服务器返回了无效的响应。',
    'err.settings.notFound': '未配置 Foobar2000 设置。',
    'err.settings.loadFailed': '无法加载设置。',
    'err.server.timeout':
        '服务器无响应。请检查电脑上的 foobar2000 是否正在运行。',

    /*
     * --------------------------------------------------------
     * Foobar2000 URL 和端口错误
     * --------------------------------------------------------
     */
    'err.url.empty': '未指定 Foobar2000 URL。',
    'err.url.invalid': 'Foobar2000 URL 无效。',
    'err.url.protocol': 'Foobar2000 URL 必须使用 HTTP 或 HTTPS。',
    'err.port.notNumber': 'Foobar2000 端口必须是数字。',
    'err.port.outOfRange': 'Foobar2000 端口必须介于 1 到 65535 之间。',

    /*
     * --------------------------------------------------------
     * 设置验证错误
     * --------------------------------------------------------
     */
    'err.validation.noUrl': '未指定 Foobar2000 URL',
    'err.validation.noConnection': '无法连接到 Foobar2000。{details}',
    'err.validation.noConnectionHttp': '无法连接到 Foobar2000（HTTP {status}）',

    /*
     * --------------------------------------------------------
     * Beefweb 播放列表列表错误
     * --------------------------------------------------------
     */
    'err.playlists.listFailed': '无法获取 Beefweb 播放列表列表。{details}',
    'err.playlists.listFailedHttp':
        '无法获取 Beefweb 播放列表列表。HTTP {status}。{details}',

    /*
     * --------------------------------------------------------
     * 播放列表“beefweb-catalog”目录错误
     * --------------------------------------------------------
     */
    'err.catalog.readFailed': '无法读取播放列表“{playlist}”的项目。{details}',
    'err.catalog.readFailedHttp':
        '无法读取播放列表“{playlist}”的项目。HTTP {status}。{details}',
    'err.catalog.missing':
        '未找到播放列表“{playlist}”。在 foobar2000 中打开媒体库，选择所有专辑，并将其发送到名为“{playlist}”的新播放列表。',
    'err.catalog.empty':
        '播放列表“{playlist}”为空。请将您的整个媒体库发送到该列表。',
    'err.catalog.tooLarge':
        '播放列表“{playlist}”包含 {total} 个项目，超过了 {limit} 的限制。',
    'err.catalog.rowsMismatch':
        '播放列表“{playlist}”：已读取行数：{count}（共 {total}）。',
    'err.catalog.invalidResponse':
        '播放列表“{playlist}”：服务器返回了无效的响应。',
    'err.catalog.chunkTooLarge':
        '播放列表“{playlist}”：收到的项目：{count}，而不是 {expected}。',
    'err.catalog.columnsMismatch':
        '播放列表“{playlist}”：服务器返回了 {count} 列，而不是 {expected}。',

    /*
     * --------------------------------------------------------
     * 工作播放列表“beefweb”错误
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable': '无法获取当前专辑的曲目。',
    'err.playlist.beefwebMissing': '未找到播放列表“beefweb”。',
    'err.playlist.createFailed': '无法创建播放列表“beefweb”。{details}',
    'err.playlist.createFailedHttp':
        '无法创建播放列表“beefweb”。HTTP {status}。{details}',
    'err.playlist.clearFailed': '无法清空播放列表“beefweb”。{details}',
    'err.playlist.clearFailedHttp':
        '无法清空播放列表“beefweb”。HTTP {status}。{details}',
    'err.playlist.addItemsFailed':
        '无法将曲目添加到播放列表“beefweb”。{details}',
    'err.playlist.addItemsFailedHttp':
        '无法将曲目添加到播放列表“beefweb”。HTTP {status}。{details}',

    'err.playlist.itemsFailed': '无法读取播放列表曲目。{details}',
    'err.playlist.itemsFailedHttp':
        '无法读取播放列表曲目。HTTP {status}。{details}',
    'err.playlist.emptyPlaylist': '播放列表为空。',
    'err.playlist.selectFailed': '无法选择播放列表。{details}',

    /*
     * --------------------------------------------------------
     * Beefweb 播放器错误
     * --------------------------------------------------------
     */
    'err.player.stateFailed': '无法获取 Beefweb 播放器状态。{details}',
    'err.player.unknownState': 'Beefweb 返回了未知的播放器状态。',
    'err.volume.notFinite': '音量必须是有限数字。',
    'err.volume.setFailed': '无法更改音量。{details}',
    'err.volume.rangeUnknown': '无法确定音量范围。',
    'err.mute.setFailed': '无法更改静音状态。{details}',
    'err.position.invalid': '播放位置必须为非负数。',
    'err.position.setFailed': '无法更改播放位置。{details}',
    'err.pause.failed': '无法暂停当前曲目。{details}',
    'err.stop.failed': '无法停止播放。{details}',
    'err.track.indexUnknown': '无法确定当前曲目索引。',
    'err.play.failed': '无法开始播放当前曲目。{details}',

    /*
     * --------------------------------------------------------
     * 播放控制器的备用消息
     * --------------------------------------------------------
     */
    'err.playback.changeFailed': '无法更改播放状态。',
    'err.track.switchFailed': '无法切换曲目。',
    'err.album.loadFailed': '无法将专辑加载到 Foobar2000。',

    /*
     * --------------------------------------------------------
     * 媒体库和封面错误
     * --------------------------------------------------------
     */
    'err.library.importFailed': '无法导入媒体库。',
    'err.artwork.catalogMismatch':
        '无法将专辑与播放列表“beefweb-catalog”匹配。请在 foobar2000 中更新该播放列表并重新启动应用程序。',
    'err.artwork.fetchFailedHttp': '无法获取专辑封面。HTTP {status}。',
    'err.artwork.emptyResponse': '封面响应为空。',
    'err.artwork.base64Unavailable': '此环境中不可用 Base64 编码。',
} as const;
