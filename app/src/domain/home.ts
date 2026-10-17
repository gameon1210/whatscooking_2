import type { HomePreferences, KitchenCover, KitchenTheme } from './types';

export const HOME_DEFAULTS: HomePreferences = {
  theme: 'saffron', cover: 'table', photoPosition: 'center', headline: 'Good food. Better together.',
  showFamily: true, showWeather: true, showPantry: true, showTomorrow: true, showMemories: true,
};
const THEMES: KitchenTheme[] = ['saffron', 'sage', 'rose', 'cocoa', 'system'];
const COVERS: KitchenCover[] = ['table', 'garden', 'photo'];

/** Resolve old backups and partially saved preferences without mutating a family. */
export function homePreferences(value?: Partial<HomePreferences> | null): HomePreferences {
  const photoUri = typeof value?.photoUri === 'string' && /^(data:image\/(jpeg|png|webp);base64,|file:\/\/|content:\/\/)/i.test(value.photoUri) ? value.photoUri : undefined;
  const cover = COVERS.includes(value?.cover as KitchenCover) ? value!.cover! : HOME_DEFAULTS.cover;
  const result: HomePreferences = {
    ...HOME_DEFAULTS,
    theme: THEMES.includes(value?.theme as KitchenTheme) ? value!.theme! : HOME_DEFAULTS.theme,
    cover: cover === 'photo' && !photoUri ? 'table' : cover,
    photoUri,
    photoPosition: value?.photoPosition === 'top' || value?.photoPosition === 'bottom' ? value.photoPosition : 'center',
    headline: typeof value?.headline === 'string' && value.headline.trim() ? value.headline.trim().slice(0, 70) : HOME_DEFAULTS.headline,
  };
  for (const key of ['showFamily', 'showWeather', 'showPantry', 'showTomorrow', 'showMemories'] as const) if (typeof value?.[key] === 'boolean') result[key] = value[key]!;
  return result;
}
