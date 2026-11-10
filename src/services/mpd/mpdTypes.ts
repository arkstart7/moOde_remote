/**
 * @file mpdTypes.ts
 * @description Типы протокола MPD, используемые клиентом moOdeRemote.
 *
 * Документация протокола:
 * https://mpd.readthedocs.io/en/latest/protocol.html
 */

/** Подсистемы MPD, на которые можно подписаться командой idle. */
export type MpdSubsystem =
    | 'database'
    | 'update'
    | 'stored_playlist'
    | 'playlist'
    | 'player'
    | 'mixer'
    | 'output'
    | 'options'
    | 'partition'
    | 'sticker'
    | 'subscription'
    | 'message'
    | 'mount'
    | 'neighbor';

/** Состояние воспроизведения из ответа status. */
export type MpdPlayState = 'play' | 'pause' | 'stop';

/**
 * Состояние проигрывателя из ответа команды status.
 *
 * Числовые поля нормализованы парсером: отсутствующие значения
 * равны undefined, флаги приведены к boolean.
 */
export interface MpdStatus {
    /** Громкость 0..100 или -1, если выход не поддерживает громкость. */
    volume: number;

    repeat: boolean;

    random: boolean;

    single: boolean;

    consume: boolean;

    /** Версия очереди: увеличивается при каждом изменении очереди. */
    playlist: number;

    playlistLength: number;

    state: MpdPlayState;

    /** Индекс текущего трека в очереди. */
    song?: number;

    /** Идентификатор текущего трека в очереди. */
    songid?: number;

    nextSong?: number;

    nextSongId?: number;

    /** Позиция: elapsed в секундах, total — длительность трека. */
    time?: { elapsed: number; total: number };

    bitrate?: number;

    /** Интервал crossfade в секундах. */
    xfade?: number;

    /** Строка вида "44100:16:2" — частота:разрядность:каналы. */
    audio?: string;

    /** Номер выполняемой команды update, если база обновляется. */
    updatingDb?: number;

    /** Текст последней ошибки воспроизведения, если была. */
    error?: string;
}

/** Трек из ответа MPD (currentsong, playlistinfo, find, listallinfo). */
export interface MpdSong {
    /** Путь к файлу относительно музыкальной директории. */
    file: string;

    lastModified?: string;

    /** Длительность в секундах (дробная). */
    duration?: number;

    /** Длительность в секундах (целая, старый формат). */
    time?: number;

    /** Строка формата аудиопотока, например "44100:16:2". */
    format?: string;

    /** Позиция в очереди (поле Pos). */
    position?: number;

    /** Идентификатор в очереди (поле Id). */
    id?: number;

    /**
     * Теги трека. Многозначные теги MPD отдает повторяющимися
     * строками, поэтому значения всегда массивы строк.
     */
    tags: Record<string, string[]>;
}

/**
 * Ошибка ACK из протокола MPD.
 *
 * Формат строки: ACK [код@позиция] {команда} текст.
 */
export class MpdAckError extends Error {
    public readonly name = 'MpdAckError';

    public readonly code: number;

    public readonly commandListPosition: number;

    public readonly commandName: string;

    constructor(
        code: number,
        commandListPosition: number,
        commandName: string,
        message: string,
    ) {
        super(message);

        this.code = code;

        this.commandListPosition = commandListPosition;

        this.commandName = commandName;
    }
}
