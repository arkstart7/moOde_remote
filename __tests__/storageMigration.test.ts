import AsyncStorage from '@react-native-async-storage/async-storage';

import { readMigratedStorageValue } from '../src/services/storageMigration';

describe('storageMigration', () => {
    const getItemMock = AsyncStorage.getItem as jest.Mock;
    const setItemMock = AsyncStorage.setItem as jest.Mock;
    const removeItemMock = AsyncStorage.removeItem as jest.Mock;

    beforeEach(() => {
        getItemMock.mockReset();

        setItemMock.mockReset();

        setItemMock.mockResolvedValue(undefined);

        removeItemMock.mockReset();

        removeItemMock.mockResolvedValue(undefined);
    });

    test('returns value stored under the new key without migration', async () => {
        getItemMock.mockImplementation(async (key: string) =>
            key === 'new' ? 'value' : null,
        );

        await expect(readMigratedStorageValue('new', 'legacy')).resolves.toBe(
            'value',
        );

        expect(setItemMock).not.toHaveBeenCalled();

        expect(removeItemMock).not.toHaveBeenCalled();
    });

    test('copies legacy value to the new key and removes the legacy key', async () => {
        getItemMock.mockImplementation(async (key: string) =>
            key === 'legacy' ? 'legacy-value' : null,
        );

        await expect(readMigratedStorageValue('new', 'legacy')).resolves.toBe(
            'legacy-value',
        );

        expect(setItemMock).toHaveBeenCalledWith('new', 'legacy-value');

        expect(removeItemMock).toHaveBeenCalledWith('legacy');
    });

    test('returns null when neither key has a value', async () => {
        getItemMock.mockResolvedValue(null);

        await expect(
            readMigratedStorageValue('new', 'legacy'),
        ).resolves.toBeNull();

        expect(setItemMock).not.toHaveBeenCalled();
    });

    test('returns null when reading the new key fails', async () => {
        getItemMock.mockRejectedValue(new Error('storage error'));

        await expect(
            readMigratedStorageValue('new', 'legacy'),
        ).resolves.toBeNull();
    });
});
