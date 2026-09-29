import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    bg: '#FFF8F1',
    card: '#FFFFFF',
    cardAlt: '#FFF1E4',
    text: '#1F1A17',
    muted: '#6B625B',
    border: '#EADFD5',
    primary: '#C2410C',
    primaryText: '#FFFFFF',
    primarySoft: '#FFE3CC',
    good: '#2B8A3E',
    goodSoft: '#E3F5E6',
    warn: '#B35C00',
    warnSoft: '#FFF0D6',
    bad: '#C92A2A',
    badSoft: '#FFE3E3',
    chip: '#F4E9DF',
  },
  dark: {
    bg: '#14100D',
    card: '#1F1915',
    cardAlt: '#2A211B',
    text: '#F6EFE8',
    muted: '#B3A89E',
    border: '#3A302A',
    primary: '#FF8A3D',
    primaryText: '#1A0E05',
    primarySoft: '#4A2A14',
    good: '#69DB7C',
    goodSoft: '#1E3323',
    warn: '#FFB454',
    warnSoft: '#3A2A12',
    bad: '#FF8787',
    badSoft: '#3D1F1F',
    chip: '#2E251F',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  const s = useColorScheme();
  return s === 'dark' ? palette.dark : palette.light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
