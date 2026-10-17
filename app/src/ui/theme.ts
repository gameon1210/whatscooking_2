import { Platform, useColorScheme } from 'react-native';

import type { KitchenTheme } from '@/domain/types';
import { useStore } from '@/state/store';

export const palette = {
  light: {
    bg: '#FBF7F0',
    card: '#FFFFFF',
    cardAlt: '#F4ECE0',
    text: '#282D24',
    muted: '#706E63',
    border: '#E7E2D6',
    primary: '#A34329',
    primaryText: '#FFFFFF',
    primarySoft: '#F7E5D8',
    good: '#3D674C',
    goodSoft: '#ECF3E9',
    warn: '#8F590F',
    warnSoft: '#FBF0D7',
    bad: '#AB3036',
    badSoft: '#FBE8E8',
    chip: '#F0ECE4',
  },
  dark: {
    bg: '#201C19',
    card: '#2C2621',
    cardAlt: '#352D26',
    text: '#FAF4EB',
    muted: '#C5B5A3',
    border: '#4A3F35',
    primary: '#F0BA87',
    primaryText: '#291C11',
    primarySoft: '#4B3829',
    good: '#A9C99B',
    goodSoft: '#2C3929',
    warn: '#F3CA85',
    warnSoft: '#443624',
    bad: '#FFADAF',
    badSoft: '#492C2C',
    chip: '#3A3129',
  },
};

export type Colors = typeof palette.light;

const sage: Colors = { ...palette.light, bg: '#F3F6F0', cardAlt: '#EAF0E4', text: '#24382A', muted: '#5E6E5D', border: '#DCE4D7', primary: '#365F43', primarySoft: '#E0EBD9', chip: '#E8EEE2' };
const rose: Colors = { ...palette.light, bg: '#FCF4F3', cardAlt: '#F8E9E8', text: '#3E2930', muted: '#7B6168', border: '#EBDDDC', primary: '#963F59', primarySoft: '#F7DEE5', chip: '#F4E6E8' };
export const KITCHEN_THEMES: { id: Exclude<KitchenTheme, 'system'>; name: string; note: string; colors: Colors }[] = [
  { id: 'saffron', name: 'Sunday saffron', note: 'Warm & sunlit', colors: palette.light },
  { id: 'sage', name: 'Garden sage', note: 'Fresh & grounded', colors: sage },
  { id: 'rose', name: 'Berry breakfast', note: 'A little playful', colors: rose },
  { id: 'cocoa', name: 'Cocoa evenings', note: 'Cosy after dark', colors: palette.dark },
];

export function useKitchenTheme(): KitchenTheme {
  return useStore((s) => (s.activeId ? s.families[s.activeId]?.settings.home?.theme : undefined) ?? 'saffron');
}

export function useColors(): Colors {
  const scheme = useColorScheme();
  const selected = useKitchenTheme();
  return selected === 'system' ? (scheme === 'dark' ? palette.dark : palette.light) : (KITCHEN_THEMES.find((t) => t.id === selected)?.colors ?? palette.light);
}

export const editorialFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 };
