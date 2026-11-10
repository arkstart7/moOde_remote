/**
 * @file AppText.tsx
 * @description Компонент оборачивает Text и применяет стили по умолчанию.
 */
import { Text, TextProps } from 'react-native';
import { typography } from '../theme/typography';

export default function AppText(props: TextProps) {
    return <Text {...props} style={[typography.regularText, props.style]} />;
}
