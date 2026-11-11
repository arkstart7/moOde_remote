import AsyncStorage from '@react-native-async-storage/async-storage';

import type * as SettingsServiceModule from '../src/services/settingsService';

/**
 * settingsService кэширует настройки на уровне модуля,
 * поэтому для каждого теста нужен свежий экземпляр модуля.
 */
function loadFreshModule(): typeof SettingsServiceModule {
    let exported: typeof SettingsServiceModule;

    jest.isolateModules(() => {
        exported = require('../src/services/settingsService');
    });

    return exported!;
}

const validSettings = {
    host: '192.168.1.100',
    port: '8880',
};

describe('settingsService', () => {
    const getItemMock = AsyncStorage.getItem as jest.Mock;
    const setItemMock = AsyncStorage.setItem as jest.Mock;
    const removeItemMock = AsyncStorage.removeItem as jest.Mock;

    beforeEach(() => {
        getItemMock.mockReset();
        setItemMock.mockReset();
        removeItemMock.mockReset();
    });

    test('returns null when nothing is stored', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(null);

        await expect(service.loadSettings()).resolves.toBeNull();
    });

    test('parses stored settings', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify(validSettings));

        await expect(service.loadSettings()).resolves.toEqual(validSettings);
    });

    test('accepts legacy settings with foobarDirectory', async () => {
        const service = loadFreshModule();

        /*
         * Настройки, сохраненные прежними версиями приложения,
         * содержат удаленное поле foobarDirectory и должны
         * оставаться валидными без повторной настройки.
         *
         * Лишнее поле проходит сквозь парсер безвредно,
         * поэтому проверяем подмножество значимых полей.
         */
        getItemMock.mockResolvedValue(
            JSON.stringify({
                ...validSettings,

                foobarDirectory:
                    'content://com.android.externalstorage/tree/music',
            }),
        );

        await expect(service.loadSettings()).resolves.toMatchObject(
            validSettings,
        );
    });

    test('returns null for invalid JSON', async () => {
        const service = loadFreshModule();

        console.error = jest.fn();

        getItemMock.mockResolvedValue('{not-json');

        await expect(service.loadSettings()).resolves.toBeNull();
    });

    test('returns null when structure does not match', async () => {
        const service = loadFreshModule();

        console.warn = jest.fn();

        getItemMock.mockResolvedValue(
            JSON.stringify({
                host: 123,
                port: '8880',
            }),
        );

        await expect(service.loadSettings()).resolves.toBeNull();
    });

    test('caches the first successful read', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify(validSettings));

        await service.loadSettings();
        await service.loadSettings();

        expect(getItemMock).toHaveBeenCalledTimes(1);
    });

    test('updates the cache after saving', async () => {
        const service = loadFreshModule();

        await service.saveSettings(validSettings);

        /*
         * Повторное чтение берется из кэша:
         * хранилище больше не запрашивается.
         */
        const reloaded = await service.loadSettings();

        expect(reloaded).toEqual(validSettings);
        expect(getItemMock).not.toHaveBeenCalled();
        expect(setItemMock).toHaveBeenCalledWith(
            '@moode_remote/settings',
            JSON.stringify(validSettings),
        );
    });

    test('clears the cache after removing settings', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify(validSettings));

        await service.loadSettings();
        await service.clearSettings();

        getItemMock.mockResolvedValue(null);

        await expect(service.loadSettings()).resolves.toBeNull();
        expect(removeItemMock).toHaveBeenCalledWith('@moode_remote/settings');
    });
});
