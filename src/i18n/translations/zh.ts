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
    'settings.urlLabel': 'MPD URL',
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
    'err.settings.notFound': '未配置 MPD 设置。',
    'err.settings.loadFailed': '无法加载设置。',
    'err.server.timeout':
        '服务器无响应。请检查电脑上的 MPD 是否正在运行。',

    /*
     * --------------------------------------------------------
     * MPD URL 和端口错误
     * --------------------------------------------------------
     */
    'err.url.empty': '未指定 MPD URL。',
    'err.url.invalid': 'MPD URL 无效。',
    'err.url.protocol': 'MPD URL 必须使用 HTTP 或 HTTPS。',
    'err.port.notNumber': 'MPD 端口必须是数字。',
    'err.port.outOfRange': 'MPD 端口必须介于 1 到 65535 之间。',

    /*
     * --------------------------------------------------------
     * 设置验证错误
     * --------------------------------------------------------
     */
    'err.validation.noUrl': '未指定 MPD URL',
    'err.validation.noConnection': '无法连接到 MPD。{details}',

    /*
     * --------------------------------------------------------
     * MPD 播放列表列表错误
     * --------------------------------------------------------
     */
    'err.playlists.listFailed': '无法获取 MPD 播放列表列表。{details}',

    /*
     * --------------------------------------------------------
     * 播放列表“медиатека MPD”目录错误
     * --------------------------------------------------------
     */
    'err.catalog.readFailed': '无法读取播放列表“{playlist}”的项目。{details}',
    'err.catalog.empty':
        '播放列表“{playlist}”为空。请将您的整个媒体库发送到该列表。',
    'err.catalog.tooLarge':
        '播放列表“{playlist}”包含 {total} 个项目，超过了 {limit} 的限制。',

    /*
     * --------------------------------------------------------
     * MPD 播放队列错误
     * --------------------------------------------------------
     */
    'err.playlist.tracksUnavailable': '无法获取当前专辑的曲目。',
    'err.playlist.clearFailed': '无法清空 MPD 播放队列。{details}',
    'err.playlist.addItemsFailed': '无法将曲目添加到 MPD 播放队列。{details}',

    'err.playlist.itemsFailed': '无法读取播放列表曲目。{details}',
    'err.playlist.emptyPlaylist': '播放列表为空。',
    'err.playlist.selectFailed': '无法选择播放列表。{details}',

    /*
     * --------------------------------------------------------
     * MPD 播放器错误
     * --------------------------------------------------------
     */
    'err.player.stateFailed': '无法获取 MPD 播放器状态。{details}',
    'err.player.unknownState': 'MPD 返回了未知的播放器状态。',
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
    'err.album.loadFailed': '无法将专辑加载到 MPD。',

    /*
     * --------------------------------------------------------
     * 媒体库和封面错误
     * --------------------------------------------------------
     */
    'err.library.importFailed': '无法导入媒体库。',
    'err.artwork.fetchFailed': '无法获取专辑封面。{details}',
    'err.artwork.base64Unavailable': '此环境中不可用 Base64 编码。',
} as const;
