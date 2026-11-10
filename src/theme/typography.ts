/**
 * @file typography.ts
 * @description Этот файл определяет стили типографики, используемые в приложении.  Он включает стили для текста в меню, заголовков, обычного текста, жирного текста и заголовков навигации.  Каждый стиль определяет семейство, размер и цвет шрифта, чтобы обеспечить единообразие типографики во всем приложении.
 * @version 1.0.0
 */
import { colors } from './colors';

export const typography = {
    menu: {
        fontFamily: 'Inter-Regular',
        fontSize: 18,
        color: colors.textSecondary,
    },

    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
    },

    regularText: {
        fontFamily: 'Inter-Regular',
        fontSize: 18,
        color: colors.textPrimary,
    },

    boldText: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: colors.textPrimary,
    },

    smallText: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        lineHeight: 20,
        color: colors.textPrimary,
    },

    smallText2: {
        fontFamily: 'Inter-Regular',
        fontSize: 16,
        lineHeight: 20,
        color: colors.textSecondary,
    },

    navigationTitle: {
        fontFamily: 'Inter-Medium',
        fontSize: 18,
    },
};
