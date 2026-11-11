import AsyncStorage from '@react-native-async-storage/async-storage';

import type * as ThemeServiceModule from '../src/theme/themeService';

/**
 * themeService кэширует режим темы на уровне модуля,
 * поэтому для каждого теста нужен свежий экземпляр модуля.
 */
function loadFreshModule(): typeof ThemeServiceModule {
    let exported: typeof ThemeServiceModule;

    jest.isolateModules(() => {
        exported = require('../src/theme/themeService');
    });

    return exported!;
}

describe('themeService', () => {
    const getItemMock = AsyncStorage.getItem as jest.Mock;
    const setItemMock = AsyncStorage.setItem as jest.Mock;

    beforeEach(() => {
        getItemMock.mockReset();
        setItemMock.mockReset();
    });

    test('falls back to the system mode when nothing is stored', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(null);

        await expect(service.loadTheme()).resolves.toBe('system');
    });

    test('loads a saved theme mode', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('light'));

        await expect(service.loadTheme()).resolves.toBe('light');
    });

    test('accepts a raw string value saved without JSON', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue('dark');

        await expect(service.loadTheme()).resolves.toBe('dark');
    });

    test('ignores an unsupported saved value', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('blue'));

        await expect(service.loadTheme()).resolves.toBe('system');
    });

    test('caches the first successful read', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('light'));

        await service.loadTheme();
        await service.loadTheme();

        expect(getItemMock).toHaveBeenCalledTimes(1);
    });

    test('saves the mode and notifies subscribers immediately', async () => {
        const service = loadFreshModule();

        const listener = jest.fn();

        service.subscribe(listener);

        await service.saveTheme('dark');

        expect(setItemMock).toHaveBeenCalledWith(
            '@moode_remote/theme',
            'dark',
        );

        expect(service.getThemeMode()).toBe('dark');

        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('repeated reads after saving do not hit the storage', async () => {
        const service = loadFreshModule();

        await service.saveTheme('light');

        await expect(service.loadTheme()).resolves.toBe('light');

        expect(getItemMock).not.toHaveBeenCalled();
    });
});
