import { shoppingIngredients } from './allergens';
import type { ChipId, Dish } from './types';

export const MEAL_NUDGES: Record<ChipId, { label: string; description: string }> = {
  quick: { label: 'Quick & easy', description: 'Dishes marked quick to make, typically under 20 minutes.' },
  low_energy: { label: 'Low-energy day', description: 'Quick dishes with up to five listed ingredients.' },
  leftovers: { label: 'Use leftovers', description: 'Dishes you can make with recent leftovers from your kitchen.' },
  guests: { label: 'Guests over', description: 'Weekend favourites and dishes you can put out to share.' },
  rainy: { label: 'Rainy-day comfort', description: 'Comfort dishes, soups, and stews.' },
  sick: { label: 'Something light', description: 'Mild dishes marked light or soft.' },
  sunday: { label: 'Make it special', description: 'Weekend favourites and dishes worth a little extra prep.' },
};

export function matchesMealNudge(dish: Dish, nudge: ChipId, leftoverDishes: ReadonlySet<string>): boolean {
  switch (nudge) {
    case 'quick': return dish.effort === 1;
    case 'low_energy': return dish.effort === 1 && shoppingIngredients(dish).length <= 5;
    case 'leftovers': return leftoverDishes.has(dish.id);
    case 'guests': return !!dish.weekendy || (dish.effort >= 2 && !!dish.comfort);
    case 'rainy': return !!dish.comfort || /\b(soup|stew|rasam)\b/i.test(dish.name);
    case 'sick': return dish.spice <= 1 && !!(dish.light || dish.soft);
    case 'sunday': return !!dish.weekendy || dish.effort === 3;
  }
}
