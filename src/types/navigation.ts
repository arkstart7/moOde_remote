/**
 * @file navigation.ts
 * @description Типы параметров навигации приложения.
 */

import { ErrorDescriptor } from '../i18n';

export type RootStackParamList = {
    Start: undefined;
    Main: undefined;
    Genres: undefined;
    Artists: undefined;
    Albums: undefined;
    Playlist: undefined;
    Tracks: undefined;
    Settings: {
        errors?: ErrorDescriptor[];
        fromStart?: boolean;
    };
};
