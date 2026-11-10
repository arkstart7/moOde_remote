/**
 * @file mpdPlayerService.ts
 *
 * @description
 * Команды и запросы состояния проигрывателя через MPD.
 *
 * Снапшот строится из пары команд status + currentsong на одном
 * командном соединении (см. mpdClient.ts).
 */

import { runMpdCommand } from './mpdClient';

import { parsePairs, parseStatus, pairsToRecord, toSong } from './mpdParser';

import { ErrorDescriptor, LocalizedError } from '../../i18n';

export type MpdPlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Громкость в терминах приложения.
 *
 * MPD выражает громкость процентами 0..100, поэтому min/max
 * фиксированы; структура сохранена совместимой с прежним клиентом,
 * чтобы логика контроллера не менялась.
 */
export interface MpdVolumeInfo {
    min: number;

    max: number;

    value: number;

    /**
     * В MPD нет отдельного состояния mute; поле оставлено
     * для совместимости и не выставляется снапшотом.
     */
    isMuted?: boolean;
}

export interface MpdActiveItem {
    index: number;

    position: number;

    duration?: number;
}

export interface MpdPlayerSnapshot {
    playbackState: MpdPlaybackState;

    activeItem?: MpdActiveItem;

    volume?: MpdVolumeInfo;
}

const MIN_PERCENT = 0;

const MAX_PERCENT = 100;

export async function getPlayerState(): Promise<MpdPlaybackState> {
    const snapshot = await getPlayerSnapshot();

    return snapshot.playbackState;
}

export async function getPlayerSnapshot(): Promise<MpdPlayerSnapshot> {
    const operation: ErrorDescriptor = { code: 'err.player.stateFailed' };

    const statusFrame = await runCommand(['status'], operation);

    const status = parseStatus(pairsToRecord(parsePairs(statusFrame.lines)));

    const playbackState = toPlaybackState(status.state);

    let activeItem: MpdActiveItem | undefined;

    if (playbackState !== 'stopped' && status.song !== undefined) {
        const songFrame = await runCommand(['currentsong'], operation);

        const song = toSong(pairsToRecord(parsePairs(songFrame.lines)));

        activeItem = {
            index: status.song,

            position: status.time?.elapsed ?? 0,

            duration: song.duration ?? song.time,
        };
    }

    let volume: MpdVolumeInfo | undefined;

    if (status.volume >= MIN_PERCENT) {
        volume = {
            min: MIN_PERCENT,

            max: MAX_PERCENT,

            value: status.volume,
        };
    }

    return {
        playbackState,

        activeItem,

        volume,
    };
}

export function volumeToPercentage(volume: MpdVolumeInfo): number | null {
    if (typeof volume.value !== 'number' || !Number.isFinite(volume.value)) {
        return null;
    }

    return clampPercentage(volume.value);
}

export function percentageToVolume(
    volume: MpdVolumeInfo,
    percentage: number,
): number | null {
    if (
        typeof volume.min !== 'number' ||
        typeof volume.max !== 'number' ||
        !Number.isFinite(volume.min) ||
        !Number.isFinite(volume.max) ||
        volume.max <= volume.min ||
        !Number.isFinite(percentage)
    ) {
        return null;
    }

    return clampPercentage(percentage);
}

export async function setPlayerVolume(percentage: number): Promise<void> {
    if (!Number.isFinite(percentage)) {
        throw new LocalizedError('err.volume.notFinite');
    }

    const clamped = Math.round(clampPercentage(percentage));

    await runCommand([`setvol ${clamped}`], {
        code: 'err.volume.setFailed',
    });
}

export async function setPlayerMuted(isMuted: boolean): Promise<void> {
    /*
     * MPD не имеет команды mute: при включении mute громкость
     * сбрасывается в 0. Восстановление громкости при выключении
     * mute выполняет playbackController через setPlayerVolume()
     * (сохраненное значение), поэтому здесь действие не нужно.
     */
    if (isMuted) {
        await setPlayerVolume(MIN_PERCENT);
    }
}

export async function setPlayerPosition(position: number): Promise<void> {
    if (!Number.isFinite(position) || position < 0) {
        throw new LocalizedError('err.position.invalid');
    }

    await runCommand([`seekcur ${Math.floor(position)}`], {
        code: 'err.position.setFailed',
    });
}

export async function pausePlayer(): Promise<void> {
    await runCommand(['pause 1'], { code: 'err.pause.failed' });
}

export async function stopPlayer(): Promise<void> {
    await runCommand(['stop'], { code: 'err.stop.failed' });
}

export async function playCurrentTrack(
    trackIndex: number,
    position = 0,
): Promise<void> {
    if (!Number.isInteger(trackIndex) || trackIndex < 0) {
        throw new LocalizedError('err.track.indexUnknown');
    }

    if (!Number.isFinite(position) || position < 0) {
        throw new LocalizedError('err.position.invalid');
    }

    const commands = [`play ${trackIndex}`];

    if (position > 0) {
        commands.push(`seek ${trackIndex} ${Math.floor(position)}`);
    }

    await runCommand(commands, { code: 'err.play.failed' });
}

/**
 * Выполняет команды MPD, добавляя контекст операции
 * к транспортным ошибкам.
 */
async function runCommand(
    commands: string[],
    operation: ErrorDescriptor,
): Promise<ReturnType<typeof runMpdCommand>> {
    try {
        return await runMpdCommand(commands);
    } catch (error) {
        const details =
            error instanceof Error && error.message ? ` ${error.message}` : '';

        throw new LocalizedError(operation.code, {
            ...operation.params,

            details,
        });
    }
}

/** Приводит состояние MPD к состоянию приложения. */
function toPlaybackState(state: 'play' | 'pause' | 'stop'): MpdPlaybackState {
    switch (state) {
        case 'play':
            return 'playing';

        case 'pause':
            return 'paused';

        default:
            return 'stopped';
    }
}

function clampPercentage(value: number): number {
    return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}
