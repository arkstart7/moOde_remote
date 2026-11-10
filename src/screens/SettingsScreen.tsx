/**
 * @file SettingsScreen.tsx
 * @description
 * Экран настроек приложения.
 *
 * Settings имеет два режима.
 *
 * ============================================================
 * 1. Режим запуска приложения
 * ============================================================
 *
 * StartScreen
 *     │
 *     ▼
 * Settings (fromStart=true)
 *     │
 *     │ Back
 *     ▼
 * StartScreen
 *
 * В этом режиме Settings:
 *
 * - НЕ проверяет настройки;
 * - НЕ сохраняет настройки;
 * - НЕ загружает Library;
 * - возвращает управление StartScreen.
 *
 * StartScreen после этого заново выполняет весь процесс запуска.
 *
 *
 * ============================================================
 * 2. Обычный режим
 * ============================================================
 *
 * Main
 *   │
 *   ▼
 * Settings
 *   │
 *   └── Back
 *        │
 *        ├── проверка не нужна
 *        │       └── goBack()
 *        │
 *        └── проверка нужна
 *                │
 *                ▼
 *          validateSettings()
 *                │
 *                ├── ошибки
 *                │      └── остаёмся в Settings
 *                │
 *                └── успешно
 *                       │
 *                       ▼
 *                  saveSettings()
 *                       │
 *                       ▼
 *                    goBack()
 *
 * В обычном режиме Library здесь НЕ загружается.
 * Загрузка Library выполняется только StartScreen.
 */

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Dropdown, SettingsHeaderLeft } from '../components';

import {
    AppSettings,
    loadSettings,
    saveSettings,
} from '../services/settingsService';

import { validateSettings } from '../services/settingsValidator';

import { RootStackParamList } from '../types/navigation';

import { colors } from '../theme/colors';

import {
    getThemeMode,
    saveTheme,
    subscribe as subscribeTheme,
} from '../theme/themeService';

import { ThemeMode, THEME_MODES } from '../theme/themeMode';

import { useTheme, useResolvedTheme } from '../theme/useTheme';

import {
    describeError,
    ErrorDescriptor,
    formatError,
    LANGUAGES,
    Language,
    saveLanguage,
    useTranslation,
} from '../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation, route }: Props) {
    const theme = useTheme();

    /*
     * Иконки статус-бара должны читаться на фоне экрана:
     * на светлой теме — темные, на темной — светлые.
     */
    const resolvedTheme = useResolvedTheme();

    const { t, language: currentLanguage } = useTranslation();

    /*
     * Размеры экрана: в ландшафте (ширина больше высоты)
     * контент настроек делится на две колонки.
     */
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const isLandscape = screenWidth > screenHeight;
    /*
     * ========================================================
     * Settings fields
     * ========================================================
     */

    const [foobarUrl, setFoobarUrl] = useState('');

    const [foobarPort, setFoobarPort] = useState('');

    /*
     * ========================================================
     * Errors
     * ========================================================
     *
     * При открытии Settings из StartScreen
     * здесь уже могут находиться ошибки,
     * переданные через route.params.
     */

    const [errors, setErrors] = useState<ErrorDescriptor[]>(
        route.params?.errors ?? [],
    );

    /*
     * ========================================================
     * Checking
     * ========================================================
     *
     * В обычном режиме означает,
     * что выполняется:
     *
     * validateSettings()
     * +
     * saveSettings()
     */

    const [checking, setChecking] = useState(false);

    /*
     * ========================================================
     * Последние сохранённые настройки
     * ========================================================
     *
     * Используются для определения,
     * изменил ли пользователь настройки.
     */

    const savedSettingsRef = useRef<AppSettings | null>(null);

    /*
     * ========================================================
     * Определяем режим Settings
     * ========================================================
     *
     * true:
     *
     * StartScreen → Settings
     *
     * false:
     *
     * Main / другой экран → Settings
     */

    const fromStart = route.params?.fromStart === true;

    /*
     * ========================================================
     * Загрузка сохранённых настроек
     * ========================================================
     *
     * Здесь только заполняем форму.
     *
     * validateSettings() здесь НЕ вызывается.
     */

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const settings = await loadSettings();

                if (cancelled) {
                    return;
                }

                /*
                 * Запоминаем последние сохранённые
                 * настройки.
                 */

                savedSettingsRef.current = settings;

                /*
                 * Если настроек нет,
                 * оставляем пустую форму.
                 */

                if (!settings) {
                    return;
                }

                setFoobarUrl(settings.foobarUrl);

                setFoobarPort(settings.foobarPort);
            } catch (error) {
                console.error('Failed to load settings:', error);

                if (!cancelled) {
                    setErrors([{ code: 'err.settings.loadFailed' }]);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    /*
     * ========================================================
     * Требуется ли проверка
     * ========================================================
     *
     * Этот метод используется ТОЛЬКО
     * в обычном режиме Settings.
     *
     * В fromStart режиме он вообще
     * не вызывается.
     */

    const settingsNeedValidation = useCallback(() => {
        const url = foobarUrl.trim();

        const port = foobarPort.trim();

        /*
         * Есть ошибки.
         *
         * Нужно выполнить повторную проверку.
         */

        if (errors.length > 0) {
            return true;
        }

        /*
         * Есть пустое поле.
         */

        if (!url || !port) {
            return true;
        }

        const saved = savedSettingsRef.current;

        /*
         * Сохранённых настроек нет.
         */

        if (!saved) {
            return true;
        }

        /*
         * Пользователь изменил
         * хотя бы одно поле.
         */

        return url !== saved.foobarUrl || port !== saved.foobarPort;
    }, [foobarUrl, foobarPort, errors]);

    /*
     * ========================================================
     * Проверка и сохранение настроек
     * ========================================================
     *
     * Используется ТОЛЬКО в обычном режиме.
     *
     * Здесь:
     *
     * validateSettings()
     *     ↓
     * saveSettings()
     *     ↓
     * goBack()
     *
     * Library НЕ загружается.
     */

    const checkSettings = useCallback(async () => {
        if (checking) {
            return;
        }

        setChecking(true);

        setErrors([]);

        const settings: AppSettings = {
            foobarUrl: foobarUrl.trim(),

            foobarPort: foobarPort.trim(),
        };

        try {
            /*
             * ==================================================
             * 1. Проверяем настройки
             * ==================================================
             */

            const validationResult = await validateSettings(settings);

            /*
             * Ошибки.
             *
             * Остаёмся в Settings.
             */

            if (validationResult.errors.length > 0) {
                setErrors(validationResult.errors);

                setChecking(false);

                return;
            }

            /*
             * ==================================================
             * 2. Сохраняем настройки
             * ==================================================
             *
             * Library здесь НЕ загружается.
             */

            await saveSettings(settings);

            /*
             * Эти настройки теперь считаются
             * сохранёнными.
             */

            savedSettingsRef.current = settings;

            setErrors([]);

            setChecking(false);

            /*
             * ==================================================
             * 3. Возвращаемся назад
             * ==================================================
             */

            navigation.goBack();
        } catch (error) {
            console.error('Failed to validate or save settings:', error);

            setErrors([
                error instanceof Error
                    ? describeError(error)
                    : { code: 'settings.checkOrSaveFailed' },
            ]);

            setChecking(false);
        }
    }, [foobarUrl, foobarPort, checking, navigation]);

    /*
     * ========================================================
     * Выбор языка интерфейса
     * ========================================================
     *
     * Язык сохраняется мгновенно и не зависит от режима
     * экрана: в режиме fromStart форма подключения
     * не сохраняется, а язык — сохраняется.
     */

    const handleLanguageChange = useCallback((language: Language) => {
        saveLanguage(language).catch(error => {
            console.error('Failed to change language:', error);
        });
    }, []);

    /*
     * ========================================================
     * Выбор темы интерфейса
     * ========================================================
     *
     * Тема сохраняется мгновенно и не зависит от режима
     * экрана — по аналогии с языком интерфейса.
     */

    const currentThemeMode = useSyncExternalStore(
        subscribeTheme,
        getThemeMode,
        getThemeMode,
    );

    const handleThemeChange = useCallback((mode: ThemeMode) => {
        saveTheme(mode).catch(error => {
            console.error('Failed to change theme:', error);
        });
    }, []);

    /*
     * Подпись кнопки режима темы.
     */

    const getThemeModeLabel = useCallback(
        (mode: ThemeMode) => {
            if (mode === 'light') {
                return t('settings.themeLight');
            }

            if (mode === 'dark') {
                return t('settings.themeDark');
            }

            return t('settings.themeSystem');
        },
        [t],
    );

    /*
     * Подпись варианта языка: собственные названия
     * языков берутся из словаря текущего языка.
     */

    const getLanguageLabel = useCallback(
        (language: Language) => {
            switch (language) {
                case 'en':
                    return t('settings.languageEn');

                case 'ru':
                    return t('settings.languageRu');

                case 'de':
                    return t('settings.languageDe');

                case 'fr':
                    return t('settings.languageFr');

                case 'es':
                    return t('settings.languageEs');

                default:
                    return t('settings.languageZh');
            }
        },
        [t],
    );

    const languageOptions = useMemo(
        () =>
            LANGUAGES.map(language => ({
                value: language,
                label: getLanguageLabel(language),
            })),
        [getLanguageLabel],
    );

    /*
     * ========================================================
     * Back
     * ========================================================
     */

    const handleBack = useCallback(() => {
        /*
         * ==================================================
         * Режим запуска
         * ==================================================
         *
         * StartScreen → Settings
         *
         * Сначала проверяем и сохраняем
         * введённые настройки. После успешного
         * сохранения checkSettings() возвращает
         * управление StartScreen.
         *
         * loadSettings()
         * validateSettings()
         * loadLibrary()
         * loadPlaylist()
         * Main
         */

        if (fromStart) {
            checkSettings();
            return;
        }

        /*
         * ==================================================
         * Обычный режим
         * ==================================================
         */

        /*
         * Проверка не нужна.
         *
         * Просто возвращаемся
         * на предыдущий экран.
         */

        if (!settingsNeedValidation()) {
            navigation.goBack();

            return;
        }

        /*
         * Нужно проверить настройки.
         *
         * checkSettings():
         *
         * validateSettings()
         *     ↓
         * saveSettings()
         *     ↓
         * goBack()
         */

        checkSettings();
    }, [fromStart, settingsNeedValidation, checkSettings, navigation]);

    /*
     * ========================================================
     * Header Back button
     * ========================================================
     */

    const renderHeaderLeft = useCallback(
        () => <SettingsHeaderLeft onPress={handleBack} disabled={checking} />,
        [handleBack, checking],
    );

    /*
     * Устанавливаем кнопку Back
     * в Navigation header.
     */

    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: renderHeaderLeft,
        });
    }, [navigation, renderHeaderLeft]);

    /*
     * ========================================================
     * Render
     * ========================================================
     */

    const connectionForm = (
        <>
            {/* Форма настроек */}

            <View style={styles.form}>
                {/* URL */}

                <AppText style={[styles.label, { color: theme.textPrimary }]}>
                    {t('settings.urlLabel')}
                </AppText>

                <TextInput
                    style={[
                        styles.input,
                        {
                            borderColor: theme.borderInput,
                            color: theme.textPrimary,
                            backgroundColor: theme.background,
                        },
                    ]}
                    value={foobarUrl}
                    onChangeText={setFoobarUrl}
                    placeholder="192.168.1.100"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />

                {/* Порт */}

                <AppText style={[styles.label, { color: theme.textPrimary }]}>
                    {t('settings.portLabel')}
                </AppText>

                <TextInput
                    style={[
                        styles.input,
                        {
                            borderColor: theme.borderInput,
                            color: theme.textPrimary,
                            backgroundColor: theme.background,
                        },
                    ]}
                    value={foobarPort}
                    onChangeText={setFoobarPort}
                    placeholder="8880"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                />
            </View>
        </>
    );

    const statusBlock = (
        <>
            {/* Сообщение о проверке */}

            {checking && (
                <AppText
                    style={[styles.checking, { color: theme.textSecondary }]}
                >
                    {t('settings.checking')}
                </AppText>
            )}

            {/* Ошибки */}

            {errors.length > 0 && (
                <View style={styles.errors}>
                    {errors.map((error, index) => (
                        <AppText
                            key={`${error.code}-${index}`}
                            style={[
                                styles.error,
                                { color: theme.textSecondary },
                            ]}
                        >
                            • {formatError(error, t)}
                        </AppText>
                    ))}
                </View>
            )}
        </>
    );

    const languageSection = (
        <>
            {/* Язык интерфейса */}

            <View style={styles.languageSection}>
                <AppText style={[styles.label, { color: theme.textPrimary }]}>
                    {t('settings.language')}
                </AppText>

                <Dropdown
                    options={languageOptions}
                    value={currentLanguage}
                    onSelect={handleLanguageChange}
                    accessibilityLabel={t('settings.language')}
                />
            </View>
        </>
    );

    const themeSection = (
        <>
            {/* Тема интерфейса */}

            <View style={styles.languageSection}>
                <AppText style={[styles.label, { color: theme.textPrimary }]}>
                    {t('settings.theme')}
                </AppText>

                <View style={styles.languageRow}>
                    {THEME_MODES.map(mode => (
                        <Pressable
                            key={mode}
                            style={[
                                styles.languageButton,
                                {
                                    borderColor:
                                        mode === currentThemeMode
                                            ? theme.textPrimary
                                            : theme.borderInput,
                                },
                            ]}
                            onPress={() => {
                                handleThemeChange(mode);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={getThemeModeLabel(mode)}
                        >
                            <AppText
                                style={[
                                    styles.languageButtonText,
                                    {
                                        color:
                                            mode === currentThemeMode
                                                ? theme.textPrimary
                                                : theme.textSecondary,
                                    },
                                    mode === currentThemeMode &&
                                        styles.languageButtonTextActive,
                                ]}
                            >
                                {getThemeModeLabel(mode)}
                            </AppText>
                        </Pressable>
                    ))}
                </View>
            </View>
        </>
    );

    return (
        <>
            <StatusBar
                barStyle={
                    resolvedTheme === 'light' ? 'dark-content' : 'light-content'
                }
                backgroundColor={theme.background}
            />

            <SafeAreaView
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                ]}
            >
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.content,
                            isLandscape && styles.contentLandscape,
                        ]}
                        contentInsetAdjustmentBehavior="never"
                        keyboardShouldPersistTaps="handled"
                    >
                        {isLandscape ? (
                            <View style={styles.landscapeRow}>
                                <View style={styles.landscapeColumn}>
                                    {connectionForm}

                                    {statusBlock}
                                </View>

                                <View style={styles.landscapeColumn}>
                                    {languageSection}

                                    {themeSection}
                                </View>
                            </View>
                        ) : (
                            <>
                                {/* Форма настроек */}

                                <View style={styles.form}>
                                    {/* URL */}

                                    <AppText
                                        style={[
                                            styles.label,
                                            styles.labelFirst,
                                            { color: theme.textPrimary },
                                        ]}
                                    >
                                        {t('settings.urlLabel')}
                                    </AppText>

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: theme.borderInput,
                                                color: theme.textPrimary,
                                                backgroundColor:
                                                    theme.background,
                                            },
                                        ]}
                                        value={foobarUrl}
                                        onChangeText={setFoobarUrl}
                                        placeholder="192.168.1.100"
                                        placeholderTextColor={
                                            theme.textSecondary
                                        }
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="url"
                                    />

                                    {/* Порт */}

                                    <AppText
                                        style={[
                                            styles.label,
                                            { color: theme.textPrimary },
                                        ]}
                                    >
                                        {t('settings.portLabel')}
                                    </AppText>

                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                borderColor: theme.borderInput,
                                                color: theme.textPrimary,
                                                backgroundColor:
                                                    theme.background,
                                            },
                                        ]}
                                        value={foobarPort}
                                        onChangeText={setFoobarPort}
                                        placeholder="8880"
                                        placeholderTextColor={
                                            theme.textSecondary
                                        }
                                        keyboardType="numeric"
                                    />
                                </View>

                                {/* Сообщение о проверке */}

                                {checking && (
                                    <AppText
                                        style={[
                                            styles.checking,
                                            { color: theme.textSecondary },
                                        ]}
                                    >
                                        {t('settings.checking')}
                                    </AppText>
                                )}

                                {/* Ошибки */}

                                {errors.length > 0 && (
                                    <View style={styles.errors}>
                                        {errors.map((error, index) => (
                                            <AppText
                                                key={`${error.code}-${index}`}
                                                style={[
                                                    styles.error,
                                                    {
                                                        color: theme.textSecondary,
                                                    },
                                                ]}
                                            >
                                                • {formatError(error, t)}
                                            </AppText>
                                        ))}
                                    </View>
                                )}

                                {/* Язык интерфейса */}

                                <View style={styles.languageSection}>
                                    <AppText
                                        style={[
                                            styles.label,
                                            { color: theme.textPrimary },
                                        ]}
                                    >
                                        {t('settings.language')}
                                    </AppText>

                                    <Dropdown
                                        options={languageOptions}
                                        value={currentLanguage}
                                        onSelect={handleLanguageChange}
                                        accessibilityLabel={t(
                                            'settings.language',
                                        )}
                                    />
                                </View>
                                {/* Тема интерфейса */}

                                <View style={styles.languageSection}>
                                    <AppText
                                        style={[
                                            styles.label,
                                            { color: theme.textPrimary },
                                        ]}
                                    >
                                        {t('settings.theme')}
                                    </AppText>

                                    <View style={styles.languageRow}>
                                        {THEME_MODES.map(mode => (
                                            <Pressable
                                                key={mode}
                                                style={[
                                                    styles.languageButton,
                                                    {
                                                        borderColor:
                                                            mode ===
                                                            currentThemeMode
                                                                ? theme.textPrimary
                                                                : theme.borderInput,
                                                    },
                                                ]}
                                                onPress={() => {
                                                    handleThemeChange(mode);
                                                }}
                                                accessibilityRole="button"
                                                accessibilityLabel={getThemeModeLabel(
                                                    mode,
                                                )}
                                            >
                                                <AppText
                                                    style={[
                                                        styles.languageButtonText,
                                                        {
                                                            color:
                                                                mode ===
                                                                currentThemeMode
                                                                    ? theme.textPrimary
                                                                    : theme.textSecondary,
                                                        },
                                                        mode ===
                                                            currentThemeMode &&
                                                            styles.languageButtonTextActive,
                                                    ]}
                                                >
                                                    {getThemeModeLabel(mode)}
                                                </AppText>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    keyboardAvoidingView: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 24,
        paddingTop: 0,
        paddingBottom: 40,
    },

    /*
     * Ландшафтная разметка: подключение слева,
     * язык и тема справа.
     */
    landscapeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 32,
    },

    landscapeColumn: {
        flex: 1,
    },

    contentLandscape: {
        paddingBottom: 24,
    },

    form: {
        width: '100%',
    },

    label: {
        marginTop: 18,
        marginBottom: 8,
        fontSize: 18,
    },

    /* Первый лейбл формы: без верхнего отступа,
     * чтобы контент был ближе к заголовку экрана. */
    labelFirst: {
        marginTop: 0,
    },

    input: {
        height: 48,
        borderWidth: 1,
        borderColor: colors.borderInput,
        borderRadius: 8,
        paddingHorizontal: 14,
        color: colors.textPrimary,
        backgroundColor: colors.background,
        fontSize: 18,
    },

    checking: {
        marginTop: 24,
        fontSize: 16,
    },

    errors: {
        marginTop: 24,
    },

    error: {
        marginBottom: 10,
        fontSize: 16,
    },

    languageSection: {
        marginTop: 32,
    },

    languageRow: {
        flexDirection: 'row',
        gap: 12,
    },

    languageButton: {
        borderWidth: 1,
        borderColor: colors.borderInput,
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 18,
    },

    languageButtonActive: {
        borderColor: colors.textPrimary,
    },

    languageButtonText: {
        fontSize: 16,
        color: colors.textSecondary,
    },

    languageButtonTextActive: {
        fontWeight: '700',
    },
});
