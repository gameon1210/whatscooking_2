import type { Cuisine, Dish, SlotId } from './types';
import { dishCuisine } from './cuisines';

export type DishShelf = 'all' | 'recent' | 'own' | Cuisine;
export const DISH_PAGE_SIZE = 40;

/** Suggestions are a head start; they must never replace the full meal catalogue. */
export function browseDishes(dishes: Dish[], slot: SlotId, shelf: DishShelf, recent: string[], picked: string[], suggested: string[]): Dish[] {
  const omitted = new Set([...picked, ...(shelf === 'all' ? suggested : [])]);
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const pool = shelf === 'recent' ? recent.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []) : dishes.filter((d) => {
    if (shelf === 'own') return !!d.custom;
    return d.slots.includes(slot) && (shelf === 'all' || dishCuisine(d) === shelf);
  }).sort((a, b) => a.name.localeCompare(b.name));
  return pool.filter((d) => !omitted.has(d.id));
}
