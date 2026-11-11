/**
 * @file storageMigration.ts
 * @description Миграция данных AsyncStorage из прежней версии
 * приложения (ключи с префиксом @foobar_remote) в новые ключи
 * с префиксом @moode_remote.
 *
 * Значение переносится при первом чтении нового ключа:
 * если по новому ключу данных нет, а по старому есть,
 * значение копируется в новый ключ и старый удаляется.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Читает значение по новому ключу, при отсутствии выполняет
 * миграцию из легаси-ключа.
 *
 * Ошибки миграции не прерывают чтение: при сбое возвращается
 * значение нового ключа (возможно, null), а старые данные
 * остаются нетронутыми.
 */
export async function readMigratedStorageValue(
    key: string,
    legacyKey: string,
): Promise<string | null> {
    let value: string | null = null;

    try {
        value = await AsyncStorage.getItem(key);
    } catch (error) {
        console.error(`Failed to read storage key "${key}":`, error);

        return null;
    }

    if (value !== null) {
        return value;
    }

    try {
        const legacyValue = await AsyncStorage.getItem(legacyKey);

        if (legacyValue === null) {
            return null;
        }

        await AsyncStorage.setItem(key, legacyValue);

        await AsyncStorage.removeItem(legacyKey);

        return legacyValue;
    } catch (error) {
        console.error(
            `Failed to migrate storage key "${legacyKey}" to "${key}":`,
            error,
        );

        return null;
    }
}
