/**
 * @file beefwebPlayerService.ts
 * @description Commands and state queries for the Beefweb player API.
 */

import { findBeefwebPlaylistId } from './beefwebPlaylistService';
import { fetchWithTimeout } from './fetchWithTimeout';

import { ErrorDescriptor, LocalizedError } from '../i18n';

export type BeefwebPlaybackState = 'stopped' | 'playing' | 'paused';

export type BeefwebVolumeType = 'db' | 'linear' | 'upDown';

export interface BeefwebVolumeInfo {
    type?: BeefwebVolumeType;
    min?: number;
    max?: number;
    value?: number;
    isMuted?: boolean;
}

export interface BeefwebActiveItem {
    playlistId?: string;
    playlistIndex?: number;
    index?: number;
    position?: number;
    duration?: number;
}

export interface BeefwebPlayerSnapshot {
    playbackState: BeefwebPlaybackState;
    activeItem?: BeefwebActiveItem;
    volume?: BeefwebVolumeInfo;
}

interface PlayerStateResponse {
    player?: {
        playbackState?: BeefwebPlaybackState;
        activeItem?: BeefwebActiveItem;
        volume?: BeefwebVolumeInfo;
    };
}

/** Таймаут одного запроса к Beefweb. */
const REQUEST_TIMEOUT_MS = 5000;

export async function getPlayerState(
    beefwebUrl: string,
): Promise<BeefwebPlaybackState> {
    const snapshot = await getPlayerSnapshot(beefwebUrl);

    return snapshot.playbackState;
}

export async function getPlayerSnapshot(
    beefwebUrl: string,
): Promise<BeefwebPlayerSnapshot> {
    const operation: ErrorDescriptor = { code: 'err.player.stateFailed' };

    const response = await request(
        `${beefwebUrl}/api/player`,
        undefined,
        operation,
    );

    const data = (await readJson(response)) as PlayerStateResponse;

    const playbackState = data.player?.playbackState;

    if (
        playbackState !== 'stopped' &&
        playbackState !== 'playing' &&
        playbackState !== 'paused'
    ) {
        throw new LocalizedError('err.player.unknownState');
    }

    return {
        playbackState,
        activeItem: data.player?.activeItem,
        volume: data.player?.volume,
    };
}

export function volumeToPercentage(volume: BeefwebVolumeInfo): number | null {
    const { min, max, value } = volume;

    if (
        typeof min !== 'number' ||
        typeof max !== 'number' ||
        typeof value !== 'number' ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        !Number.isFinite(value) ||
        max <= min
    ) {
        return null;
    }

    if (volume.type === 'db') {
        if (value <= min) {
            return 0;
        }

        if (value >= max) {
            return 100;
        }

        return clampPercentage(Math.pow(2, value / 10) * 100);
    }

    return clampPercentage(((value - min) / (max - min)) * 100);
}

export function percentageToVolume(
    volume: BeefwebVolumeInfo,
    percentage: number,
): number | null {
    const { min, max } = volume;

    if (
        typeof min !== 'number' ||
        typeof max !== 'number' ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        max <= min ||
        !Number.isFinite(percentage)
    ) {
        return null;
    }

    const clampedPercentage = clampPercentage(percentage);

    if (volume.type === 'db') {
        if (clampedPercentage <= 0) {
            return min;
        }

        return Math.min(
            max,
            Math.max(min, 10 * Math.log2(clampedPercentage / 100)),
        );
    }

    return min + (clampedPercentage / 100) * (max - min);
}

export async function setPlayerVolume(
    beefwebUrl: string,
    volume: number,
): Promise<void> {
    if (!Number.isFinite(volume)) {
        throw new LocalizedError('err.volume.notFinite');
    }

    await request(
        `${beefwebUrl}/api/player`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ volume }),
        },
        { code: 'err.volume.setFailed' },
    );
}

export async function setPlayerMuted(
    beefwebUrl: string,
    isMuted: boolean,
): Promise<void> {
    await request(
        `${beefwebUrl}/api/player`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isMuted }),
        },
        { code: 'err.mute.setFailed' },
    );
}

export async function setPlayerPosition(
    beefwebUrl: string,
    position: number,
): Promise<void> {
    if (!Number.isFinite(position) || position < 0) {
        throw new LocalizedError('err.position.invalid');
    }

    await request(
        `${beefwebUrl}/api/player`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ position }),
        },
        { code: 'err.position.setFailed' },
    );
}

export async function pausePlayer(beefwebUrl: string): Promise<void> {
    await request(
        `${beefwebUrl}/api/player/pause`,
        { method: 'POST' },
        { code: 'err.pause.failed' },
    );
}

export async function stopPlayer(beefwebUrl: string): Promise<void> {
    await request(
        `${beefwebUrl}/api/player/stop`,
        { method: 'POST' },
        { code: 'err.stop.failed' },
    );
}

export async function playCurrentTrack(
    beefwebUrl: string,
    trackIndex: number,
    position = 0,
): Promise<void> {
    if (!Number.isInteger(trackIndex) || trackIndex < 0) {
        throw new LocalizedError('err.track.indexUnknown');
    }

    if (!Number.isFinite(position) || position < 0) {
        throw new LocalizedError('err.position.invalid');
    }

    /*
     * Плейлист должен существовать заранее:
     * он создается при загрузке альбома
     * в beefwebPlaylistService.
     */
    const playlistId = await findBeefwebPlaylistId(beefwebUrl);

    await request(
        `${beefwebUrl}/api/player/play/${encodeURIComponent(
            String(playlistId),
        )}/${trackIndex}`,
        { method: 'POST' },
        { code: 'err.play.failed' },
    );

    if (position > 0) {
        await setPlayerPosition(beefwebUrl, position);
    }
}

/**
 * Выполняет запрос к Beefweb с таймаутом
 * и добавляет контекст к транспортной ошибке.
 */
async function request(
    url: string,
    init: RequestInit | undefined,
    operation: ErrorDescriptor,
): Promise<Response> {
    try {
        return await fetchWithTimeout(url, init, REQUEST_TIMEOUT_MS);
    } catch (error) {
        throw new LocalizedError(operation.code, {
            ...operation.params,

            details: error instanceof Error ? ` ${error.message}` : '',
        });
    }
}

/**
 * Читает JSON-тело ответа с понятной ошибкой
 * вместо сырого SyntaxError.
 */
async function readJson(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        throw new LocalizedError('err.response.invalid');
    }
}

function clampPercentage(value: number): number {
    return Math.min(100, Math.max(0, value));
}
