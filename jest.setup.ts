import type React from 'react';

jest.mock('react-native-gesture-handler', () => ({
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
        children,
}));

jest.mock('lucide-react-native', () => {
    const { View } = require('react-native');

    return {
        CirclePlay: View,
        CirclePause: View,
        ChevronRight: View,
        ChevronLeft: View,
        Settings: View,
        Volume: View,
    };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
    CachesDirectoryPath: '/cache',
    exists: jest.fn(() => Promise.resolve(false)),
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
}));
