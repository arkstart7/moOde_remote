/**
 * @file colors.ts
 * @description Палитры цветов тёмной и светлой темы.
 */
export type ThemeColors = {
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    highLighting: string;
    lowLighting: string;
    volumeActive: string;
    volumePassive: string;
    volumeIcon: string;
    background: string;
    backgroundTitle: string;
    borderInput: string;
    iconNormal: string;
    navigationBarSurface: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    onSurfaceVariant: string;
    onHighlight: string;
};

export const darkColors: ThemeColors = {
    textPrimary: 'white',
    textSecondary: 'silver',
    textTertiary: 'darkgrey',
    highLighting: 'chocolate',
    lowLighting: 'dimgray',
    volumeActive: 'white',
    volumePassive: '#cc9966',
    volumeIcon: 'dimgray',
    background: '#2e3337',
    backgroundTitle: '#373e43',
    borderInput: 'dimgray',
    iconNormal: 'white',
    navigationBarSurface: '#373e43',
    secondaryContainer: 'chocolate',
    onSecondaryContainer: 'white',
    onSurfaceVariant: 'silver',
    onHighlight: 'white',
} as const;

export const lightColors: ThemeColors = {
    textPrimary: '#23282c',
    textSecondary: '#5a6167',
    textTertiary: '#8a9095',
    highLighting: 'chocolate',
    lowLighting: '#c8ccd0',
    volumeActive: '#23282c',
    volumePassive: '#d9a677',
    volumeIcon: '#8a9095',
    background: '#e7e7e7',
    backgroundTitle: '#d4d4d4',
    borderInput: '#b6bcc1',
    iconNormal: '#23282c',
    navigationBarSurface: '#e7e7e7',
    secondaryContainer: 'chocolate',
    onSecondaryContainer: 'white',
    onSurfaceVariant: '#4a4f54',
    onHighlight: 'white',
} as const;

/*
 * Палитра тёмной темы осталась доступной под прежним
 * именем: экраны, еще не переведенные на useTheme(),
 * продолжают использовать её напрямую.
 */
export const colors: ThemeColors = darkColors;
