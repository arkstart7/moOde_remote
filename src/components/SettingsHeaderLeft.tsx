/**
 * @file SettingsHeaderLeft.tsx
 * @description Компонент/фабрика для header-кнопки в SettingsScreen,
 * которая получает onPress и disabled через props.
 */
import React from 'react';

import SettingsBackButton from './SettingsBackButton';

export interface SettingsHeaderLeftProps {
    onPress: () => void;
    disabled?: boolean;
}

export default function SettingsHeaderLeft({
    onPress,
    disabled = false,
}: SettingsHeaderLeftProps) {
    return <SettingsBackButton onPress={onPress} disabled={disabled} />;
}
