/**
 * @file mpdParser.ts
 * @description Чистый парсер текстового протокола MPD.
 *
 * Модуль не выполняет ввода-вывода, поэтому полностью покрывается
 * юнит-тестами. Разбор кадра целиком (включая бинарные чанки,
 * внутри которых могут быть любые байты, включая 0x0A) выполняет
 * readFramedResponse(); построчный разбор содержимого — функции
 * parsePairs, groupPairs, toSong и parseStatus.
 */

import { MpdAckError, MpdPlayState, MpdSong, MpdStatus } from './mpdTypes';

import { utf8Decode } from './mpdText';

/** Одна строка ответа MPD "ключ: значение". */
export interface MpdPair {
    key: string;

    value: string;
}

/**
 * Ключи, начинающие новый объект в списочных ответах
 * (listallinfo, playlistinfo, find и т.п.).
 */
export const OBJECT_START_KEYS = new Set(['file', 'directory', 'playlist']);

/** Ответ MPD, завершившийся OK или ACK. */
export interface MpdFramedResponse {
    /** Текстовые строки кадра без терминатора OK/ACK. */
    lines: string[];

    /** Бинарные чанки из полей binary: N (в порядке следования). */
    binaries: Uint8Array[];

    /** Ошибка ACK, если кадр завершен строкой ACK. */
    error: MpdAckError | null;
}

/**
 * Разбирает строку ACK в структурированную ошибку.
 *
 * Возвращает null, если строка не является ACK.
 */
export function parseAckError(line: string): MpdAckError | null {
    const match = /^ACK \[(\d+)@(\d+)\] \{([^}]*)\} (.*)$/.exec(line);

    if (!match) {
        return null;
    }

    return new MpdAckError(
        Number.parseInt(match[1], 10),
        Number.parseInt(match[2], 10),
        match[3],
        match[4],
    );
}

/**
 * Разбивает строки ответа на пары "ключ/значение".
 *
 * Разделитель — первое ": " в строке; строки без разделителя
 * пропускаются с диагностикой в консоль.
 */
export function parsePairs(lines: string[]): MpdPair[] {
    const pairs: MpdPair[] = [];

    for (const line of lines) {
        const separatorIndex = line.indexOf(': ');

        if (separatorIndex <= 0) {
            if (line) {
                console.error('MPD line without separator:', line);
            }

            continue;
        }

        pairs.push({
            key: line.slice(0, separatorIndex),

            value: line.slice(separatorIndex + 2),
        });
    }

    return pairs;
}

/**
 * Группирует пары в объекты по ключам начала объекта.
 *
 * Многозначные теги (повторяющиеся ключи) собираются в массивы.
 */
export function groupPairs(
    pairs: MpdPair[],
    startKeys: ReadonlySet<string>,
): Array<Record<string, string[]>> {
    const groups: Array<Record<string, string[]>> = [];

    let current: Record<string, string[]> | null = null;

    for (const pair of pairs) {
        if (startKeys.has(pair.key)) {
            current = {};

            groups.push(current);
        }

        if (!current) {
            continue;
        }

        const values = current[pair.key];

        if (values) {
            values.push(pair.value);
        } else {
            current[pair.key] = [pair.value];
        }
    }

    return groups;
}

/** Парсит положительное целое, иначе возвращает undefined. */
function parseOptionalInt(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);

    return Number.isNaN(parsed) ? undefined : parsed;
}

/** Парсит положительное дробное число, иначе возвращает undefined. */
function parseOptionalFloat(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }

    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Преобразует "0"/"1" MPD в boolean. */
function parseMpdBoolean(value: string | undefined): boolean {
    return value === '1';
}

/** Строит MpdSong из группированного объекта пар. */
export function toSong(entry: Record<string, string[]>): MpdSong {
    const tags: Record<string, string[]> = {};

    for (const [key, values] of Object.entries(entry)) {
        if (key !== 'file' && key !== 'duration' && key !== 'time') {
            tags[key] = values;
        }
    }

    return {
        file: entry.file?.[0] ?? '',

        lastModified: entry['last-modified']?.[0],

        duration: parseOptionalFloat(entry.duration?.[0]),

        time: parseOptionalInt(entry.time?.[0]),

        format: entry.format?.[0],

        position: parseOptionalInt(entry.Pos?.[0]),

        id: parseOptionalInt(entry.Id?.[0]),

        tags,
    };
}

/** Строит MpdStatus из группированного объекта пар ответа status. */
export function parseStatus(entry: Record<string, string[]>): MpdStatus {
    const timeValue = entry.time?.[0];

    let time: MpdStatus['time'];

    if (timeValue) {
        const [elapsed, total] = timeValue.split(':');

        time = {
            elapsed: parseOptionalFloat(elapsed) ?? 0,

            total: parseOptionalFloat(total) ?? 0,
        };
    }

    let state: MpdPlayState = 'stop';

    const stateValue = entry.state?.[0];

    if (stateValue === 'play' || stateValue === 'pause') {
        state = stateValue;
    }

    return {
        volume: parseOptionalInt(entry.volume?.[0]) ?? -1,

        repeat: parseMpdBoolean(entry.repeat?.[0]),

        random: parseMpdBoolean(entry.random?.[0]),

        single: parseMpdBoolean(entry.single?.[0]),

        consume: parseMpdBoolean(entry.consume?.[0]),

        playlist: parseOptionalInt(entry.playlist?.[0]) ?? 0,

        playlistLength: parseOptionalInt(entry.playlistlength?.[0]) ?? 0,

        state,

        song: parseOptionalInt(entry.song?.[0]),

        songid: parseOptionalInt(entry.songid?.[0]),

        nextSong: parseOptionalInt(entry.nextsong?.[0]),

        nextSongId: parseOptionalInt(entry.nextsongid?.[0]),

        time,

        bitrate: parseOptionalInt(entry.bitrate?.[0]),

        xfade: parseOptionalFloat(entry.xfade?.[0]),

        audio: entry.audio?.[0],

        updatingDb: parseOptionalInt(entry.updating_db?.[0]),

        error: entry.error?.[0],
    };
}

/**
 * Экранирует аргумент команды MPD.
 *
 * Аргументы с пробелами и спецсимволами заключаются в кавычки,
 * внутренние кавычки и обратные слэши экранируются по правилам
 * протокола.
 */
export function quoteMpdArg(value: string): string {
    if (/^[\w.:/~-]+$/.test(value)) {
        return value;
    }

    return `"${value.replace(/(["\\])/g, '\\$1')}"`;
}

/**
 * Читает один кадр ответа MPD из накопленного буфера байтов.
 *
 * Кадр завершается строкой OK, list_OK или ACK. Поле "binary: N",
 * за которым следуют ровно N произвольных байтов и перевод строки,
 * обрабатывается на байтовом уровне: внутри бинарных данных может
 * встретиться 0x0A, и построчный разбор здесь не работает.
 *
 * Возвращает { response, consumed } или { response: null,
 * consumed: 0 }, если кадр еще не пришёл полностью; в этом случае
 * буфер не потребляется и должен быть дополнен новыми данными.
 */
export function readFramedResponse(buffer: Uint8Array): {
    response: MpdFramedResponse | null;

    consumed: number;
} {
    const lines: string[] = [];

    const binaries: Uint8Array[] = [];

    let pendingBinary = 0;

    let pos = 0;

    while (true) {
        if (pendingBinary > 0) {
            const payloadEnd = pos + pendingBinary;

            /*
             * После бинарных данных должен следовать перевод строки;
             * если он еще не дошел, кадр считается неполным.
             */
            if (buffer.length < payloadEnd + 1) {
                return { response: null, consumed: 0 };
            }

            binaries.push(buffer.slice(pos, payloadEnd));

            pendingBinary = 0;

            pos = payloadEnd + 1;

            continue;
        }

        const newlineIndex = indexOfByte(buffer, 0x0a, pos);

        if (newlineIndex === -1) {
            return { response: null, consumed: 0 };
        }

        const line = utf8Decode(buffer.subarray(pos, newlineIndex));

        pos = newlineIndex + 1;

        const binaryMatch = /^binary: (\d+)$/.exec(line);

        if (binaryMatch) {
            pendingBinary = Number.parseInt(binaryMatch[1], 10);

            continue;
        }

        if (isResponseTerminator(line)) {
            return {
                response: { lines, binaries, error: null },

                consumed: pos,
            };
        }

        if (line.startsWith('ACK ')) {
            return {
                response: { lines, binaries, error: parseAckError(line) },

                consumed: pos,
            };
        }

        lines.push(line);
    }
}

function isResponseTerminator(line: string): boolean {
    return line === 'OK' || line === 'list_OK' || /^OK MPD \d/.test(line);
}

function indexOfByte(buffer: Uint8Array, byte: number, from: number): number {
    for (let i = from; i < buffer.length; i += 1) {
        if (buffer[i] === byte) {
            return i;
        }
    }

    return -1;
}

/**
 * Собирает пары в объект, где каждое значение — массив
 * значений ключа (многозначные теги сохраняются).
 */
export function pairsToRecord(pairs: MpdPair[]): Record<string, string[]> {
    const record: Record<string, string[]> = {};

    for (const pair of pairs) {
        const values = record[pair.key];

        if (values) {
            values.push(pair.value);
        } else {
            record[pair.key] = [pair.value];
        }
    }

    return record;
}
