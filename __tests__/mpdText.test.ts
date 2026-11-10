/**
 * Тесты UTF-8 кодирования протокола MPD.
 */

import { utf8Decode, utf8Encode } from '../src/services/mpd/mpdText';

test('utf8Encode encodes ASCII as-is', () => {
    expect(Array.from(utf8Encode('file: a.flac\n'))).toEqual([
        0x66, 0x69, 0x6c, 0x65, 0x3a, 0x20, 0x61, 0x2e, 0x66, 0x6c, 0x61, 0x63,
        0x0a,
    ]);
});

test('UTF-8 roundtrip preserves Cyrillic and emoji', () => {
    const samples = ['Круиз — КиНО', 'Ωmega', 'café ☕', ''];

    for (const sample of samples) {
        expect(utf8Decode(utf8Encode(sample))).toBe(sample);
    }
});

test('utf8Decode decodes a known byte sequence', () => {
    /* "мир" в UTF-8. */
    const bytes = Uint8Array.from([0xd0, 0xbc, 0xd0, 0xb8, 0xd1, 0x80]);

    expect(utf8Decode(bytes)).toBe('мир');
});
