import AsyncStorage from '@react-native-async-storage/async-storage';

import type * as I18nServiceModule from '../src/i18n/i18nService';

/**
 * i18nService кэширует язык на уровне модуля,
 * поэтому для каждого теста нужен свежий экземпляр модуля.
 */
function loadFreshModule(): typeof I18nServiceModule {
    let exported: typeof I18nServiceModule;

    jest.isolateModules(() => {
        exported = require('../src/i18n/i18nService');
    });

    return exported!;
}

describe('i18nService', () => {
    const getItemMock = AsyncStorage.getItem as jest.Mock;
    const setItemMock = AsyncStorage.setItem as jest.Mock;

    beforeEach(() => {
        getItemMock.mockReset();
        setItemMock.mockReset();
    });

    test('falls back to English when nothing is stored', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(null);

        await expect(service.loadLanguage()).resolves.toBe('en');

        expect(service.translate('start.checkingSettings')).toBe(
            'Checking settings ...',
        );
    });

    test('loads a saved language', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('ru'));

        await expect(service.loadLanguage()).resolves.toBe('ru');

        expect(service.translate('start.checkingSettings')).toBe(
            'Проверка настроек ...',
        );
    });

    test('accepts a raw string value saved without JSON', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue('ru');

        await expect(service.loadLanguage()).resolves.toBe('ru');
    });

    test('ignores an unsupported saved value', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('xx'));

        await expect(service.loadLanguage()).resolves.toBe('en');
    });

    test('ignores invalid JSON', async () => {
        const service = loadFreshModule();

        console.error = jest.fn();

        getItemMock.mockResolvedValue('{not-json');

        await expect(service.loadLanguage()).resolves.toBe('en');
    });

    test('caches the first successful read', async () => {
        const service = loadFreshModule();

        getItemMock.mockResolvedValue(JSON.stringify('ru'));

        await service.loadLanguage();
        await service.loadLanguage();

        expect(getItemMock).toHaveBeenCalledTimes(1);
    });

    test('saves the language and updates translations immediately', async () => {
        const service = loadFreshModule();

        await service.saveLanguage('ru');

        expect(setItemMock).toHaveBeenCalledWith(
            '@moode_remote/language',
            'ru',
        );

        expect(service.getLanguage()).toBe('ru');
        expect(service.translate('menu.genres')).toBe('Жанры');
    });

    test('repeated reads after saving do not hit the storage', async () => {
        const service = loadFreshModule();

        await service.saveLanguage('en');

        await expect(service.loadLanguage()).resolves.toBe('en');

        expect(getItemMock).not.toHaveBeenCalled();
    });

    test('interpolates parameters into templates', () => {
        const service = loadFreshModule();

        expect(
            service.translateWith('en', 'library.selectAlbum', {
                title: 'Abbey Road',
            }),
        ).toBe('Select album Abbey Road');

        expect(
            service.translateWith('ru', 'library.selectAlbum', {
                title: 'Abbey Road',
            }),
        ).toBe('Выбрать альбом Abbey Road');
    });

    test('drops missing optional parameters', () => {
        const service = loadFreshModule();

        /*
         * {details} в шаблоне err.volume.setFailed
         * не передан — хвост должен исчезнуть.
         */
        expect(service.translate('err.volume.setFailed')).toBe(
            'Failed to change the volume.',
        );

        expect(
            service.translate('err.volume.setFailed', {
                details: ' Network request failed',
            }),
        ).toBe('Failed to change the volume. Network request failed');
    });

    test('notifies subscribers when the language changes', async () => {
        const service = loadFreshModule();

        const listener = jest.fn();

        service.subscribe(listener);

        await service.saveLanguage('ru');

        expect(listener).toHaveBeenCalledTimes(1);
    });

    test('keeps translation dictionaries in sync', () => {
        const en = require('../src/i18n/translations/en').en as Record<
            string,
            string
        >;

        const ru = require('../src/i18n/translations/ru').ru as Record<
            string,
            string
        >;

        expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
    });
});
