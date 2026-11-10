/**
 * Тесты чистого парсера протокола MPD.
 */

import {
    OBJECT_START_KEYS,
    groupPairs,
    parseAckError,
    parsePairs,
    parseStatus,
    quoteMpdArg,
    readFramedResponse,
    toSong,
} from '../src/services/mpd/mpdParser';

import { utf8Encode } from '../src/services/mpd/mpdText';

import { MpdAckError } from '../src/services/mpd/mpdTypes';

test('parseAckError extracts code, position, command and message', () => {
    const error = parseAckError('ACK [50@0] {play} song doesn\'t exist: "123"');

    expect(error).toBeInstanceOf(MpdAckError);
    expect(error?.code).toBe(50);
    expect(error?.commandListPosition).toBe(0);
    expect(error?.commandName).toBe('play');
    expect(error?.message).toBe('song doesn\'t exist: "123"');
});

test('parseAckError returns null for non-ACK lines', () => {
    expect(parseAckError('OK')).toBeNull();
    expect(parseAckError('file: song.flac')).toBeNull();
});

test('parsePairs splits at first separator and skips broken lines', () => {
    const pairs = parsePairs(['file: a/b.flac', 'Title: Cafe Con Leche', '']);

    expect(pairs).toEqual([
        { key: 'file', value: 'a/b.flac' },
        { key: 'Title', value: 'Cafe Con Leche' },
    ]);
});

test('groupPairs groups songs and repeats multi-value tags', () => {
    const pairs = parsePairs([
        'file: one.flac',
        'Artist: A1',
        'Artist: A2',
        'Title: First',
        'file: two.flac',
        'Title: Second',
    ]);

    const groups = groupPairs(pairs, OBJECT_START_KEYS);

    expect(groups).toHaveLength(2);
    expect(groups[0].file).toEqual(['one.flac']);
    expect(groups[0].Artist).toEqual(['A1', 'A2']);
    expect(groups[1].Title).toEqual(['Second']);
});

test('toSong maps numeric fields and keeps tags as arrays', () => {
    const song = toSong({
        file: ['Music/x.flac'],
        duration: ['123.45'],
        Pos: ['3'],
        Id: ['42'],
        Artist: ['Круиз'],
        Album: ['КиНО'],
    });

    expect(song.file).toBe('Music/x.flac');
    expect(song.duration).toBeCloseTo(123.45);
    expect(song.position).toBe(3);
    expect(song.id).toBe(42);
    expect(song.tags.Artist).toEqual(['Круиз']);
    expect(song.tags.Album).toEqual(['КиНО']);
    expect(song.tags.file).toBeUndefined();
});

test('parseStatus normalizes flags, numbers and time', () => {
    const status = parseStatus({
        volume: ['35'],
        repeat: ['1'],
        random: ['0'],
        state: ['play'],
        song: ['2'],
        songid: ['7'],
        playlist: ['11'],
        playlistlength: ['15'],
        time: ['12.3:200'],
        bitrate: ['320'],
        audio: ['44100:16:2'],
    });

    expect(status.volume).toBe(35);
    expect(status.repeat).toBe(true);
    expect(status.random).toBe(false);
    expect(status.state).toBe('play');
    expect(status.song).toBe(2);
    expect(status.playlist).toBe(11);
    expect(status.playlistLength).toBe(15);
    expect(status.time).toEqual({ elapsed: 12.3, total: 200 });
    expect(status.bitrate).toBe(320);
    expect(status.audio).toBe('44100:16:2');
});

test('parseStatus falls back to stopped state and missing volume', () => {
    const status = parseStatus({ state: ['weird'] });

    expect(status.state).toBe('stop');
    expect(status.volume).toBe(-1);
    expect(status.time).toBeUndefined();
});

test('quoteMpdArg escapes quotes and backslashes', () => {
    expect(quoteMpdArg('plain')).toBe('plain');
    expect(quoteMpdArg('a b')).toBe('"a b"');
    expect(quoteMpdArg('say "hi"')).toBe('"say \\"hi\\""');
});

test('readFramedResponse parses a complete OK frame', () => {
    const bytes = utf8Encode('file: a.flac\nOK\n');

    const { response, consumed } = readFramedResponse(bytes);

    expect(response?.lines).toEqual(['file: a.flac']);
    expect(response?.error).toBeNull();
    expect(consumed).toBe(bytes.length);
});

test('readFramedResponse keeps an incomplete frame unconsumed', () => {
    const bytes = utf8Encode('file: a.flac\n');

    const { response, consumed } = readFramedResponse(bytes);

    expect(response).toBeNull();
    expect(consumed).toBe(0);
});

test('readFramedResponse accepts binary chunks containing newlines', () => {
    const payload = Uint8Array.from([1, 0x0a, 2, 0x4f, 3]);

    const text = 'binary: 5\n';

    const buffer = new Uint8Array(utf8Encode(text).length + payload.length + 4);

    buffer.set(utf8Encode(text), 0);

    buffer.set(payload, text.length);

    buffer.set(utf8Encode('\nOK\n'), text.length + payload.length);

    const { response, consumed } = readFramedResponse(buffer);

    expect(response?.binaries).toHaveLength(1);

    expect(Array.from(response?.binaries[0] ?? [])).toEqual([
        1, 0x0a, 2, 0x4f, 3,
    ]);

    /* Строка "binary: 5" потребляется как директива и не входит в lines. */
    expect(response?.lines).toEqual([]);
    expect(consumed).toBe(buffer.length);
});

test('readFramedResponse reports ACK errors', () => {
    const { response } = readFramedResponse(
        utf8Encode('ACK [5@0] {} unknown command\n'),
    );

    expect(response?.error).toBeInstanceOf(MpdAckError);
    expect(response?.error?.code).toBe(5);
});

test('readFramedResponse consumes only one frame at a time', () => {
    const bytes = utf8Encode('OK\nfile: b.flac\nOK\n');

    const first = readFramedResponse(bytes);

    expect(first.response?.lines).toEqual([]);

    const rest = readFramedResponse(bytes.subarray(first.consumed));

    expect(rest.response?.lines).toEqual(['file: b.flac']);
});
