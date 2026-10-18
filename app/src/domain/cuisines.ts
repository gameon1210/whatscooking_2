// World cuisines (1.0.4). A cuisine is a label on each dish; a family ticks the
// cuisines it cooks and suggestions draw only from those (plus anything it has
// already cooked, and its own dishes).
import type { Cuisine, Dish, Family } from './types';

export const CUISINES: { id: Cuisine; label: string; emoji: string }[] = [
  { id: 'indian', label: 'Indian', emoji: '🍛' },
  { id: 'indo_chinese', label: 'Indo-Chinese', emoji: '🥡' },
  { id: 'italian', label: 'Italian', emoji: '🍝' },
  { id: 'continental', label: 'British & Continental', emoji: '🥧' },
  { id: 'mexican', label: 'Mexican', emoji: '🌮' },
  { id: 'chinese', label: 'Chinese', emoji: '🥢' },
  { id: 'thai', label: 'Thai', emoji: '🍜' },
  { id: 'japanese', label: 'Japanese', emoji: '🍙' },
  { id: 'korean', label: 'Korean', emoji: '🥘' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🧆' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
];

export const CUISINE_LABEL = Object.fromEntries(CUISINES.map((c) => [c.id, c.label])) as Record<Cuisine, string>;

/**
 * What families that haven't chosen get: Indian plus the cuisines most Indian homes
 * already cook (pasta, noodles, soup and toast), so older households lose nothing.
 */
export const DEFAULT_CUISINES: Cuisine[] = ['indian', 'indo_chinese', 'italian', 'continental'];

export const dishCuisine = (d: Dish): Cuisine => d.cuisine ?? 'indian';

export function familyCuisines(f: Family): Cuisine[] {
  const c = f.settings.cuisines;
  return c && c.length ? c : DEFAULT_CUISINES;
}

/** Can this dish be suggested to this family? Its own dishes always can. */
export function cuisineFits(d: Dish, f: Family): boolean {
  if (d.custom) return true;
  return familyCuisines(f).includes(dishCuisine(d));
}

/** Does the family cook Indian food (and so need the North/South choice)? */
export const cooksIndian = (f: { settings: { cuisines?: Cuisine[] } }) => !f.settings.cuisines?.length || f.settings.cuisines.includes('indian');

/** "South Indian, Italian + 2 more" for headers. */
export function kitchenLabel(f: Family): string {
  return cuisineSummary(familyCuisines(f), f.region);
}

export function cuisineSummary(list: Cuisine[], region: Family['region'] = 'general'): string {
  const names = list.map((c) => (c === 'indian' && region !== 'general' ? (region === 'north' ? 'North Indian' : 'South Indian') : CUISINE_LABEL[c]));
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} + ${names.length - 2} more`;
}
