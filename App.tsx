/**
 * @file App.tsx
 * @description Корневой компонент приложения.
 *
 * При монтировании загружается сохраненный язык
 * (или определяется системная локаль): после загрузки
 * все экраны с useTranslation() перерисовываются
 * на выбранном языке.
 */

import { useEffect } from 'react';

import { StyleSheet } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from './src/navigation/RootNavigator';

import { loadLanguage } from './src/i18n';

import { loadTheme } from './src/theme/themeService';

export default function App() {
    useEffect(() => {
        loadLanguage().catch(error => {
            console.error('Failed to initialize language:', error);
        });

        loadTheme().catch(error => {
            console.error('Failed to initialize theme:', error);
        });
    }, []);

    return (
        <GestureHandlerRootView style={styles.root}>
            <RootNavigator />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});
