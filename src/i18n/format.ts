/**
 * @file format.ts
 * @description Подстановка параметров в шаблон перевода.
 *
 * Плейсхолдеры имеют вид {name}. Отсутствующий параметр
 * заменяется пустой строкой, поэтому хвостовые плейсхолдеры
 * (например, {details} в сообщениях об ошибках) корректно
 * опускаются без отдельных вариантов шаблона.
 */

import { TranslationParams } from './translations/en';

const PARAM_PATTERN = /\{(\w+)\}/g;

export function formatTemplate(
    template: string,
    params?: TranslationParams,
): string {
    return template.replace(PARAM_PATTERN, (match, name: string) => {
        const value = params?.[name];

        return value === undefined ? '' : String(value);
    });
}
