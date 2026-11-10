/**
 * @file playbackController.ts
 *
 * @description
 * Единый контроллер воспроизведения между приложением и Beefweb.
 *
 * Контроллер принадлежит уровню сервисов (как LibraryStore)
 * и не зависит от React. Компоненты подписываются на изменения
 * через subscribe()/getSnapshot() вместе с useSyncExternalStore().
 *
 * Контроллер владеет:
 *
 * - циклом опроса состояния Beefweb;
 * - состоянием воспроизведения (playing/paused/stopped);
 * - состоянием громкости и mute;
 * - оптимистичными обновлениями позиции после seek/play;
 * - сохранением CurrentPlayback в AsyncStorage.
 *
 * Экраны вызывают только методы действий:
 *
 *     playbackController.playPause();
 *     playbackController.selectTrack('next');
 *     playbackController.seek(30);
 *     ...
 *
 * Опрос запускается по требованию через acquirePolling():
 * каждый смонтированный и сфокусированный экран увеличивает
 * счетчик потребителей, поэтому независимо от числа экранов
 * в стеке навигации запросы уходят не чаще одного раза
 * в секунду.
 */

import { libraryStore } from '../library/LibraryStore';

import {
    BeefwebPlaybackState,
    BeefwebVolumeInfo,
    getPlayerSnapshot,
    pausePlayer,
    percentageToVolume,
    playCurrentTrack,
    setPlayerMuted,
    setPlayerPosition,
    setPlayerVolume,
    stopPlayer,
    volumeToPercentage,
} from './beefwebPlayerService';

import {
    loadCurrentAlbumToBeefwebPlaylist,
    loadTrackPathsToBeefwebPlaylist,
} from './beefwebPlaylistService';

import { readPlaylistTrackInfo } from './tracklistService';

import { resolveBeefwebUrl } from './beefwebUrl';

import { saveCurrentPlayback } from './playbackService';

import { syncPlaybackSnapshot } from './playbackSyncService';

import { ErrorDescriptor, LocalizedError } from '../i18n';

/** Интервал опроса состояния проигрывателя. */
const POLL_INTERVAL_MS = 1000;

/**
 * Окно, в течение которого позиция с сервера игнорируется
 * после локального seek/play: сервер может еще не применить
 * новую позицию и вернуть старую.
 */
const EXPECTED_POSITION_WINDOW_MS = 2000;

/** Допустимое отклонение позиции внутри окна ожидания, сек. */
const EXPECTED_POSITION_TOLERANCE_SEC = 1;

/** Уровень громкости до первого ответа сервера. */
const DEFAULT_VOLUME_LEVEL = 40;

type Listener = () => void;

export type TrackDirection = 'previous' | 'next';

class PlaybackController {
    /*
     * ========================================================
     * Subscription
     * ========================================================
     */

    private listeners = new Set<Listener>();

    private version = 0;

    subscribe = (listener: Listener): (() => void) => {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    };

    /** Используется useSyncExternalStore(). */
    getSnapshot = (): number => {
        return this.version;
    };

    private notify(): void {
        this.version += 1;

        this.listeners.forEach(listener => listener());
    }

    /*
     * ========================================================
     * State
     * ========================================================
     */

    private pollTimer: ReturnType<typeof setInterval> | null = null;

    private pollRefCount = 0;

    private pollInFlight = false;

    private playbackState: BeefwebPlaybackState = 'stopped';

    /** Выполняется ли сейчас команда (play/pause/seek/альбом/трек). */
    private pending = false;

    private errorData: ErrorDescriptor | null = null;

    private volumeInfo: BeefwebVolumeInfo | null = null;

    private volumeLevel = DEFAULT_VOLUME_LEVEL;

    /** Последний ненулевой уровень для снятия mute. */
    private savedVolume = DEFAULT_VOLUME_LEVEL;

    private muted = false;

    /** Получен ли хотя бы один ответ сервера о громкости. */
    private volumeReady = false;

    /*
     * Внутренние поля-«ref»: не читаются рендером напрямую.
     */

    private seekPending = false;

    private commandPending = false;

    private volumePending = false;

    /** Пользователь тянет слайдер громкости — remote не перезаписывает. */
    private volumePreview = false;

    private confirmedPosition = 0;

    private confirmedVolume = DEFAULT_VOLUME_LEVEL;

    private confirmedMuted = false;

    private expectedPosition: number | null = null;

    private expectedPositionUntil = 0;

    /*
     * ========================================================
     * Getters
     * ========================================================
     */

    getPlaybackState(): BeefwebPlaybackState {
        return this.playbackState;
    }

    isPending(): boolean {
        return this.pending;
    }

    getError(): ErrorDescriptor | null {
        return this.errorData;
    }

    getVolumeLevel(): number {
        return this.volumeLevel;
    }

    isMuted(): boolean {
        return this.muted;
    }

    isVolumeReady(): boolean {
        return this.volumeReady;
    }

    /*
     * ========================================================
     * Polling lifecycle
     * ========================================================
     */

    /**
     * Регистрирует потребителя опроса и возвращает функцию
     * освобождения. Предназначено для useFocusEffect:
     *
     *     useFocusEffect(
     *         useCallback(() => playbackController.acquirePolling(), []),
     *     );
     */
    acquirePolling = (): (() => void) => {
        this.pollRefCount += 1;

        if (this.pollTimer === null) {
            this.pollTimer = setInterval(() => {
                this.refreshSnapshot();
            }, POLL_INTERVAL_MS);

            this.refreshSnapshot();
        }

        return () => {
            this.pollRefCount = Math.max(0, this.pollRefCount - 1);

            if (this.pollRefCount === 0 && this.pollTimer !== null) {
                clearInterval(this.pollTimer);

                this.pollTimer = null;
                this.volumeReady = false;

                this.notify();
            }
        };
    };

    /**
     * Одиночный тик синхронизации с сервером.
     */
    private async refreshSnapshot(): Promise<void> {
        if (this.pollInFlight || this.seekPending || this.commandPending) {
            return;
        }

        this.pollInFlight = true;

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            const snapshot = await getPlayerSnapshot(beefwebUrl);

            const trackChanged = syncPlaybackSnapshot(snapshot, false);

            this.playbackState = snapshot.playbackState;

            if (snapshot.volume) {
                this.applyRemoteVolume(snapshot.volume);
            }

            this.applyRemotePosition(snapshot);

            this.errorData = null;

            if (trackChanged) {
                await this.persistCurrentPlayback(
                    'Failed to persist automatically selected track:',
                );
            }
        } catch (error) {
            this.errorData = toErrorDescriptor(error, {
                code: 'err.player.stateFailed',
            });

            console.error('Failed to refresh playback state:', error);
        } finally {
            this.pollInFlight = false;
            this.volumeReady = true;

            this.notify();
        }
    }

    /**
     * Обновляет громкость с сервера, если пользователь
     * сейчас не взаимодействует со слайдером.
     */
    private applyRemoteVolume(volume: BeefwebVolumeInfo): void {
        this.volumeInfo = volume;

        if (this.volumePending || this.volumePreview) {
            return;
        }

        const remoteVolume = volumeToPercentage(volume);

        if (remoteVolume !== null) {
            this.volumeLevel = remoteVolume;
            this.confirmedVolume = remoteVolume;

            if (remoteVolume > 0) {
                this.savedVolume = remoteVolume;
            }
        }

        if (volume.isMuted !== undefined) {
            this.muted = volume.isMuted;
            this.confirmedMuted = volume.isMuted;
        }
    }

    /**
     * Применяет позицию с сервера с учетом окна ожидания
     * после локального seek/play.
     */
    private applyRemotePosition(
        snapshot: Awaited<ReturnType<typeof getPlayerSnapshot>>,
    ): void {
        const remotePosition = snapshot.activeItem?.position;

        const expectedPositionIsPending =
            this.expectedPosition !== null &&
            Date.now() < this.expectedPositionUntil &&
            remotePosition !== undefined &&
            remotePosition <
                this.expectedPosition - EXPECTED_POSITION_TOLERANCE_SEC;

        if (!expectedPositionIsPending) {
            this.expectedPosition = null;
        }

        if (
            expectedPositionIsPending ||
            snapshot.playbackState === 'stopped' ||
            remotePosition === undefined ||
            !Number.isFinite(remotePosition)
        ) {
            return;
        }

        const position = Math.max(0, remotePosition);

        libraryStore.setCurrentTime(position);
        this.confirmedPosition = position;
    }

    private markExpectedPosition(position: number): void {
        this.expectedPosition = position;
        this.expectedPositionUntil = Date.now() + EXPECTED_POSITION_WINDOW_MS;
    }

    /**
     * Сохраняет CurrentPlayback, глотая ошибки записи:
     * сбой AsyncStorage не должен ломать воспроизведение.
     */
    private async persistCurrentPlayback(logContext: string): Promise<void> {
        const updatedPlayback = libraryStore.getCurrentPlayback();

        if (!updatedPlayback) {
            return;
        }

        try {
            await saveCurrentPlayback(updatedPlayback);
        } catch (error) {
            console.error(logContext, error);
        }
    }

    /*
     * ========================================================
     * Actions
     * ========================================================
     */

    playPause = async (): Promise<void> => {
        if (this.pending) {
            return;
        }

        const trackIndex = libraryStore.getCurrentTrackIndex();

        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            /*
             * Позиция хранится в поле активного источника:
             * currentTime для альбома, currentPlaylistTrackTime
             * для плейлиста.
             */
            const resumePosition = libraryStore.getCurrentTime();

            /*
             * Если индекс текущего трека не определён
             * (например, ни одна строка плейлиста не найдена
             * в медиатеке), но в активном источнике есть треки,
             * воспроизведение начинается с первой позиции:
             * это безопаснее, чем падать с ошибкой.
             */
            const effectiveTrackIndex =
                trackIndex < 0 && libraryStore.getActiveTrackCount() > 0
                    ? 0
                    : trackIndex;

            let storeUpdated = false;

            if (effectiveTrackIndex !== trackIndex) {
                /*
                 * Для плейлиста индекс строки запоминается
                 * даже без трека в медиатеке: иначе после
                 * рестарта текущая строка не восстанавливается.
                 */
                if (libraryStore.getPlaybackSource() === 'playlist') {
                    libraryStore.setCurrentPlaylistEntryByIndex(
                        effectiveTrackIndex,
                    );
                } else {
                    const firstTrackId =
                        libraryStore.getActiveTrackIdAtIndex(
                            effectiveTrackIndex,
                        );

                    if (firstTrackId) {
                        libraryStore.setActiveTrack(firstTrackId);
                    }
                }

                storeUpdated = true;
            }

            if (this.playbackState === 'playing') {
                await pausePlayer(beefwebUrl);
            } else {
                await playCurrentTrack(
                    beefwebUrl,
                    effectiveTrackIndex,
                    resumePosition,
                );

                this.markExpectedPosition(resumePosition);
            }

            const snapshot = await getPlayerSnapshot(beefwebUrl);

            this.playbackState = snapshot.playbackState;

            if (storeUpdated) {
                await this.persistCurrentPlayback(
                    'Failed to persist started playback:',
                );
            }
        } catch (error) {
            this.errorData = toErrorDescriptor(error, {
                code: 'err.playback.changeFailed',
            });

            console.error('Failed to change playback state:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };

    selectTrack = async (direction: TrackDirection): Promise<void> => {
        if (this.pending) {
            return;
        }

        const playbackSource = libraryStore.getPlaybackSource();

        const trackIndex = libraryStore.getCurrentTrackIndex();

        const trackCount = libraryStore.getActiveTrackCount();

        /*
         * Для плейлиста текущая строка может не иметь
         * трека в медиатеке, поэтому ориентируемся на
         * индекс строки, а не на объект LibraryTrack.
         */
        if (playbackSource !== 'playlist') {
            const currentTrack = libraryStore.getCurrentTrack();

            if (!currentTrack || trackIndex < 0 || trackCount === 0) {
                return;
            }
        } else if (trackIndex < 0 || trackCount === 0) {
            return;
        }

        const targetIndex =
            direction === 'previous' ? trackIndex - 1 : trackIndex + 1;

        if (targetIndex < 0 || targetIndex >= trackCount) {
            return;
        }

        const targetTrackId = libraryStore.getActiveTrackIdAtIndex(targetIndex);

        /*
         * Для плейлиста targetTrackId допустимо null:
         * строка вне медиатеки тоже может быть выбрана,
         * сервер играет ее по индексу плейлиста.
         */
        if (playbackSource !== 'playlist' && !targetTrackId) {
            return;
        }

        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            await playCurrentTrack(beefwebUrl, targetIndex);

            if (playbackSource === 'playlist') {
                libraryStore.setCurrentPlaylistEntryByIndex(targetIndex);
            } else if (targetTrackId) {
                libraryStore.setActiveTrack(targetTrackId);
            }
            this.markExpectedPosition(0);

            await this.persistCurrentPlayback(
                'Failed to persist track change:',
            );

            const snapshot = await getPlayerSnapshot(beefwebUrl);

            this.playbackState = snapshot.playbackState;
        } catch (error) {
            this.errorData = toErrorDescriptor(error, {
                code: 'err.track.switchFailed',
            });

            console.error('Failed to change track:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };

    seek = async (targetSeconds: number): Promise<void> => {
        if (this.pending || this.seekPending) {
            return;
        }

        const currentTrack = libraryStore.getCurrentTrack();

        /*
         * Для строки плейлиста вне медиатеки длительность
         * известна только из метаданных строки.
         */
        const playlistEntryDuration =
            libraryStore.getPlaybackSource() === 'playlist'
                ? libraryStore.getCurrentPlaylistEntry()?.durationSeconds ?? 0
                : 0;

        const maxDuration = currentTrack?.duration ?? playlistEntryDuration;

        if (maxDuration <= 0) {
            return;
        }

        const position = Math.min(maxDuration, Math.max(0, targetSeconds));

        this.seekPending = true;
        this.pending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            await setPlayerPosition(beefwebUrl, position);

            libraryStore.setCurrentTime(position);
            this.confirmedPosition = position;
            this.markExpectedPosition(position);

            await this.persistCurrentPlayback(
                'Failed to persist seek position:',
            );
        } catch (error) {
            libraryStore.setCurrentTime(this.confirmedPosition);

            this.errorData = toErrorDescriptor(error, {
                code: 'err.position.setFailed',
            });

            console.error('Failed to seek player:', error);
        } finally {
            this.seekPending = false;
            this.pending = false;
            this.notify();
        }
    };

    /**
     * Локальный предпросмотр громкости во время перетаскивания.
     */
    previewVolume = (newVolume: number): void => {
        this.volumePreview = true;
        this.volumeLevel = newVolume;

        if (newVolume > 0) {
            this.savedVolume = newVolume;
        }

        this.notify();
    };

    /**
     * Отправляет выбранный уровень громкости на сервер.
     */
    commitVolume = async (): Promise<void> => {
        this.volumePreview = false;

        if (this.volumePending || !this.volumeInfo) {
            this.notify();

            return;
        }

        const remoteVolume = percentageToVolume(
            this.volumeInfo,
            this.volumeLevel,
        );

        if (remoteVolume === null) {
            this.errorData = { code: 'err.volume.rangeUnknown' };
            this.notify();

            return;
        }

        this.volumePending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            await setPlayerVolume(beefwebUrl, remoteVolume);

            if (this.volumeLevel > 0 && this.muted) {
                await setPlayerMuted(beefwebUrl, false);

                this.muted = false;
                this.confirmedMuted = false;
            }

            this.confirmedVolume = this.volumeLevel;

            if (this.volumeLevel > 0) {
                this.savedVolume = this.volumeLevel;
            }
        } catch (error) {
            this.volumeLevel = this.confirmedVolume;
            this.muted = this.confirmedMuted;

            this.errorData = toErrorDescriptor(error, {
                code: 'err.volume.setFailed',
            });

            console.error('Failed to change volume:', error);
        } finally {
            this.volumePending = false;
            this.notify();
        }
    };

    toggleMute = async (): Promise<void> => {
        if (this.volumePending) {
            return;
        }

        const nextMuted = !this.muted;

        this.volumePending = true;
        this.muted = nextMuted;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            if (!nextMuted && this.volumeInfo) {
                const remoteVolume = percentageToVolume(
                    this.volumeInfo,
                    this.savedVolume,
                );

                if (remoteVolume !== null) {
                    await setPlayerVolume(beefwebUrl, remoteVolume);

                    this.volumeLevel = this.savedVolume;
                    this.confirmedVolume = this.savedVolume;
                }
            }

            await setPlayerMuted(beefwebUrl, nextMuted);

            this.confirmedMuted = nextMuted;
        } catch (error) {
            this.muted = this.confirmedMuted;

            this.errorData = toErrorDescriptor(error, {
                code: 'err.mute.setFailed',
            });

            console.error('Failed to change mute state:', error);
        } finally {
            this.volumePending = false;
            this.notify();
        }
    };

    /**
     * Выбирает альбом: загружает его в playlist "beefweb"
     * и восстанавливает прежнее состояние воспроизведения
     * (playing / paused / stopped).
     */
    selectAlbum = async (albumId: string): Promise<void> => {
        const currentPlayback = libraryStore.getCurrentPlayback();

        if (this.pending || albumId === currentPlayback?.currentAlbumId) {
            return;
        }

        const previousPlayback = currentPlayback;

        /*
         * commandPending блокирует опрос на время всей операции:
         * пока плейлист перезагружается, activeItem с сервера
         * указывает на старое содержимое, и syncPlaybackSnapshot
         * сопоставил бы устаревший индекс с треками нового альбома.
         */
        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            libraryStore.setCurrentAlbum(albumId);

            const beefwebUrl = await resolveBeefwebUrl();

            const previousSnapshot = await getPlayerSnapshot(beefwebUrl);

            await stopPlayer(beefwebUrl);

            await loadCurrentAlbumToBeefwebPlaylist(beefwebUrl);

            if (previousSnapshot.playbackState === 'playing') {
                await playCurrentTrack(beefwebUrl, 0);
            } else if (previousSnapshot.playbackState === 'paused') {
                await playCurrentTrack(beefwebUrl, 0);
                await pausePlayer(beefwebUrl);
            } else {
                await stopPlayer(beefwebUrl);
            }

            await this.persistCurrentPlayback(
                'Failed to persist selected album:',
            );
        } catch (error) {
            if (previousPlayback) {
                libraryStore.setCurrentPlayback(previousPlayback);
            }

            this.errorData = toErrorDescriptor(error, {
                code: 'err.album.loadFailed',
            });

            console.error('Failed to select album:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };

    /**
     * Выбирает плейлист: читает его треки, загружает их в playlist "beefweb"
     * и восстанавливает прежнее состояние воспроизведения
     * (playing / paused / stopped).
     */
    selectPlaylist = async (playlistId: string | number): Promise<void> => {
        const currentPlayback = libraryStore.getCurrentPlayback();

        if (this.pending || playlistId === currentPlayback?.currentPlaylistId) {
            return;
        }

        const previousPlayback = currentPlayback;

        /*
         * commandPending блокирует опрос на время всей операции:
         * пока плейлист перезагружается, activeItem с сервера
         * указывает на старое содержимое, и syncPlaybackSnapshot
         * сопоставил бы устаревший индекс с треками нового плейлиста.
         */
        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            const items = await readPlaylistTrackInfo(playlistId);

            if (items.length === 0) {
                throw new LocalizedError('err.playlist.emptyPlaylist');
            }

            libraryStore.setCurrentPlaylist(playlistId, items);

            const beefwebUrl = await resolveBeefwebUrl();

            const previousSnapshot = await getPlayerSnapshot(beefwebUrl);

            await stopPlayer(beefwebUrl);

            await loadTrackPathsToBeefwebPlaylist(
                beefwebUrl,
                items.map(item => item.path),
            );

            if (previousSnapshot.playbackState === 'playing') {
                await playCurrentTrack(beefwebUrl, 0);
            } else if (previousSnapshot.playbackState === 'paused') {
                await playCurrentTrack(beefwebUrl, 0);
                await pausePlayer(beefwebUrl);
            } else {
                await stopPlayer(beefwebUrl);
            }

            await this.persistCurrentPlayback(
                'Failed to persist selected playlist:',
            );
        } catch (error) {
            if (previousPlayback) {
                libraryStore.setCurrentPlayback(previousPlayback);
            }

            this.errorData = toErrorDescriptor(error, {
                code: 'err.playlist.selectFailed',
            });

            console.error('Failed to select playlist:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };

    /**
     * Запускает конкретный трек активного источника
     * (текущего альбома или текущего плейлиста).
     */
    playTrack = async (trackId: string): Promise<void> => {
        if (this.pending) {
            return;
        }

        const currentTrackId = libraryStore.getCurrentTrack()?.id;

        const trackIndex = libraryStore.getActiveTrackIndexById(trackId);

        if (trackIndex < 0 || trackId === currentTrackId) {
            return;
        }

        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            await playCurrentTrack(beefwebUrl, trackIndex);

            libraryStore.setActiveTrack(trackId);

            await this.persistCurrentPlayback(
                'Failed to persist selected track:',
            );

            const snapshot = await getPlayerSnapshot(beefwebUrl);

            this.playbackState = snapshot.playbackState;
        } catch (error) {
            this.errorData = toErrorDescriptor(error, {
                code: 'err.track.switchFailed',
            });

            console.error('Failed to play track:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };

    /**
     * Запускает строку активного плейлиста по её индексу.
     *
     * В отличие от playTrack() работает и для строк,
     * которых нет в медиатеке: сервер воспроизводит
     * плейлист по индексу, поэтому trackId не требуется.
     */
    playPlaylistEntry = async (entryIndex: number): Promise<void> => {
        if (this.pending) {
            return;
        }

        if (libraryStore.getPlaybackSource() !== 'playlist') {
            return;
        }

        if (
            !Number.isInteger(entryIndex) ||
            entryIndex < 0 ||
            entryIndex >= libraryStore.getActiveTrackCount()
        ) {
            return;
        }

        if (entryIndex === libraryStore.getCurrentTrackIndex()) {
            return;
        }

        this.pending = true;
        this.commandPending = true;
        this.errorData = null;
        this.notify();

        try {
            const beefwebUrl = await resolveBeefwebUrl();

            await playCurrentTrack(beefwebUrl, entryIndex);

            libraryStore.setCurrentPlaylistEntryByIndex(entryIndex);

            await this.persistCurrentPlayback(
                'Failed to persist selected playlist entry:',
            );

            const snapshot = await getPlayerSnapshot(beefwebUrl);

            this.playbackState = snapshot.playbackState;
        } catch (error) {
            this.errorData = toErrorDescriptor(error, {
                code: 'err.track.switchFailed',
            });

            console.error('Failed to play playlist entry:', error);
        } finally {
            this.commandPending = false;
            this.pending = false;
            this.notify();
        }
    };
}

/**
 * Приводит произвольную ошибку к дескриптору для перевода в UI.
 *
 * Ошибки без полезного сообщения (не Error или с пустым message)
 * заменяются резервным кодом операции.
 */
function toErrorDescriptor(
    error: unknown,
    fallback: ErrorDescriptor,
): ErrorDescriptor {
    if (error instanceof LocalizedError) {
        return { code: error.code, params: error.params };
    }

    if (error instanceof Error && error.message) {
        return { code: 'err.generic', params: { details: error.message } };
    }

    return fallback;
}

/**
 * Единственный экземпляр PlaybackController.
 */
export const playbackController = new PlaybackController();
