/**
 * @file Dropdown.tsx
 * @description Универсальный выпадающий список без внешних зависимостей.
 *
 * Кнопка с текущим значением и шевроном раскрывает список
 * вариантов. Выбранный вариант отмечается галочкой.
 *
 * Компонент использует theme-цвета через useTheme(),
 * поэтому корректно работает и в светлой, и в темной теме.
 */

import React, { useState } from 'react';

import { Pressable, StyleSheet, View } from 'react-native';

import { Check, ChevronDown, ChevronUp } from 'lucide-react-native';

import AppText from './AppText';

import { useTheme } from '../theme/useTheme';

export interface DropdownOption<T extends string> {
    value: T;

    label: string;
}

interface DropdownProps<T extends string> {
    options: readonly DropdownOption<T>[];

    value: T | null;

    onSelect: (value: T) => void;

    /** Подпись для доступности кнопки-триггера. */
    accessibilityLabel: string;
}

export default function Dropdown<T extends string>({
    options,
    value,
    onSelect,
    accessibilityLabel,
}: DropdownProps<T>) {
    const theme = useTheme();

    const [open, setOpen] = useState(false);

    const selectedOption = options.find(option => option.value === value);

    const handleSelect = (optionValue: T) => {
        setOpen(false);

        if (optionValue !== value) {
            onSelect(optionValue);
        }
    };

    return (
        <View>
            {/* Кнопка-триггер */}

            <Pressable
                style={[
                    styles.trigger,
                    {
                        borderColor: theme.borderInput,
                        backgroundColor: theme.background,
                    },
                ]}
                onPress={() => {
                    setOpen(previous => !previous);
                }}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ expanded: open }}
            >
                <AppText
                    style={[styles.triggerText, { color: theme.textPrimary }]}
                >
                    {selectedOption?.label ?? ''}
                </AppText>

                {open ? (
                    <ChevronUp
                        size={20}
                        color={theme.textSecondary}
                        strokeWidth={2}
                    />
                ) : (
                    <ChevronDown
                        size={20}
                        color={theme.textSecondary}
                        strokeWidth={2}
                    />
                )}
            </Pressable>

            {/* Список вариантов */}

            {open && (
                <View
                    style={[
                        styles.options,
                        {
                            borderColor: theme.borderInput,
                            backgroundColor: theme.background,
                        },
                    ]}
                >
                    {options.map(option => {
                        const isSelected = option.value === value;

                        const optionStyle = [
                            styles.option,
                            {
                                backgroundColor: isSelected
                                    ? theme.textSecondary
                                    : 'transparent',
                            },
                        ];

                        const optionTextStyle = [
                            styles.optionText,
                            {
                                color: isSelected
                                    ? theme.background
                                    : theme.textPrimary,
                            },
                            isSelected && styles.optionTextActive,
                        ];

                        return (
                            <Pressable
                                key={option.value}
                                style={optionStyle}
                                onPress={() => {
                                    handleSelect(option.value);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={option.label}
                                accessibilityState={{ selected: isSelected }}
                            >
                                <AppText style={optionTextStyle}>
                                    {option.label}
                                </AppText>

                                {isSelected && (
                                    <Check
                                        size={16}
                                        color={theme.background}
                                        strokeWidth={2}
                                    />
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    trigger: {
        height: 48,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    triggerText: {
        fontSize: 18,
    },

    options: {
        marginTop: 4,
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },

    option: {
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    optionText: {
        fontSize: 16,
    },

    optionTextActive: {
        fontWeight: '700',
    },
});
