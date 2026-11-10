/**
 * @file Icons.tsx
 * @description Этот файл содержит компоненты иконок, используемые в приложении.
 * Каждая иконка представляет собой оболочку для соответствующей иконки из библиотеки
 * lucide-react-native с предопределенными свойствами размера и цвета.
 */
import {
    CirclePlay,
    CirclePause,
    ChevronRight,
    ChevronLeft,
    Settings,
    Volume,
    Home,
    Tags,
    Users,
    Disc3,
    ListMusic,
    SquareLibrary,
} from 'lucide-react-native';

import { colors } from '../theme/colors';

const PLAYBACK_CONTROL_SIZE = 45;
const PLAYBACK_CONTROL_SIZE_LARGE = 70;
const VOLUME_CONTROL_SIZE = 50;
const NAVIGATION_ICON_SIZE = 24;

export const PlayIcon = (props: React.ComponentProps<typeof CirclePlay>) => {
    return (
        <CirclePlay
            size={PLAYBACK_CONTROL_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const PlayIconLarge = (
    props: React.ComponentProps<typeof CirclePlay>,
) => {
    return <PlayIcon size={PLAYBACK_CONTROL_SIZE_LARGE} {...props} />;
};

export const PauseIcon = (props: React.ComponentProps<typeof CirclePause>) => {
    return (
        <CirclePause
            size={PLAYBACK_CONTROL_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const PauseIconLarge = (
    props: React.ComponentProps<typeof CirclePause>,
) => {
    return <PauseIcon size={PLAYBACK_CONTROL_SIZE_LARGE} {...props} />;
};

export const NextIcon = (props: React.ComponentProps<typeof ChevronRight>) => {
    return (
        <ChevronRight
            size={PLAYBACK_CONTROL_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NextIconLarge = (props: React.ComponentProps<typeof NextIcon>) => {
    return <NextIcon size={PLAYBACK_CONTROL_SIZE_LARGE} {...props} />;
};

export const PreviousIcon = (
    props: React.ComponentProps<typeof ChevronLeft>,
) => {
    return (
        <ChevronLeft
            size={PLAYBACK_CONTROL_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const PreviousIconLarge = (
    props: React.ComponentProps<typeof PreviousIcon>,
) => {
    return <PreviousIcon size={PLAYBACK_CONTROL_SIZE_LARGE} {...props} />;
};

export const VolumeIcon = (props: React.ComponentProps<typeof Volume>) => {
    return (
        <Volume
            size={VOLUME_CONTROL_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const VolumeIconPale = (props: React.ComponentProps<typeof Volume>) => {
    return <VolumeIcon color={colors.lowLighting} {...props} />;
};

export const SettingsIcon = (props: React.ComponentProps<typeof Settings>) => {
    return (
        <Settings
            size={30}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavHomeIcon = (props: React.ComponentProps<typeof Home>) => {
    return (
        <Home
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavGenresIcon = (props: React.ComponentProps<typeof Tags>) => {
    return (
        <Tags
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavArtistsIcon = (props: React.ComponentProps<typeof Users>) => {
    return (
        <Users
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavAlbumsIcon = (props: React.ComponentProps<typeof Disc3>) => {
    return (
        <Disc3
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavTracksIcon = (
    props: React.ComponentProps<typeof ListMusic>,
) => {
    return (
        <ListMusic
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavPlaylistsIcon = (
    props: React.ComponentProps<typeof SquareLibrary>,
) => {
    return (
        <SquareLibrary
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};

export const NavSettingsIcon = (
    props: React.ComponentProps<typeof Settings>,
) => {
    return (
        <Settings
            size={NAVIGATION_ICON_SIZE}
            color={colors.iconNormal}
            strokeWidth={2}
            {...props}
        />
    );
};
