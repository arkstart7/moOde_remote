/**
 * @file mpdText.ts
 * @description UTF-8 кодирование и декодирование без DOM-типов.
 *
 * React Native не предоставляет типы TextEncoder/TextDecoder,
 * поэтому протокол MPD кодируется вручную: протокол целиком
 * работает в UTF-8, включая теги библиотеки на кириллице.
 */

/*
 * Битовые операции необходимы для UTF-8 кодирования байтов.
 */
/* eslint-disable no-bitwise */

/** Кодирует строку в UTF-8 байты. */
export function utf8Encode(value: string): Uint8Array {
    const bytes: number[] = [];

    for (const char of value) {
        const codePoint = char.codePointAt(0) ?? 0;

        if (codePoint < 0x80) {
            bytes.push(codePoint);
        } else if (codePoint < 0x800) {
            bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
        } else if (codePoint < 0x10000) {
            bytes.push(
                0xe0 | (codePoint >> 12),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
            );
        } else {
            bytes.push(
                0xf0 | (codePoint >> 18),
                0x80 | ((codePoint >> 12) & 0x3f),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f),
            );
        }
    }

    return new Uint8Array(bytes);
}

/** Декодирует UTF-8 байты в строку. */
export function utf8Decode(bytes: Uint8Array): string {
    let result = '';

    let index = 0;

    while (index < bytes.length) {
        const first = bytes[index];

        if (first < 0x80) {
            result += String.fromCharCode(first);

            index += 1;
        } else if (first >> 5 === 0x6) {
            result += String.fromCharCode(
                ((first & 0x1f) << 6) | (bytes[index + 1] & 0x3f),
            );

            index += 2;
        } else if (first >> 4 === 0xe) {
            result += String.fromCharCode(
                ((first & 0x0f) << 12) |
                    ((bytes[index + 1] & 0x3f) << 6) |
                    (bytes[index + 2] & 0x3f),
            );

            index += 3;
        } else {
            const codePoint =
                ((first & 0x07) << 18) |
                ((bytes[index + 1] & 0x3f) << 12) |
                ((bytes[index + 2] & 0x3f) << 6) |
                (bytes[index + 3] & 0x3f);

            result += String.fromCodePoint(codePoint);

            index += 4;
        }
    }

    return result;
}
