module.exports = {
    preset: '@react-native/jest-preset',
    setupFiles: ['<rootDir>/jest.setup.ts'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|lucide-react-native|react-native-fs|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-svg)/)',
    ],
};
