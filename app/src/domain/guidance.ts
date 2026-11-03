import { avoidHit } from './allergens';
import { checkMember, isEater, plateEaters } from './rules';
import type { Diet, Dish, Family, PlannedMeal } from './types';
import { dishById } from './recommender';

/** Required preparation changes stay visible for every ranked alternative. */
export function preparationNotes(family: Family, plate: Pick<PlannedMeal, 'date' | 'slot' | 'memberId' | 'forMemberIds'>, ids: string[]): string[] {
  const eaters = plateEaters(family, plate);
  return ids.flatMap((id) => {
    const dish = dishById(family, id);
    if (!dish) return [];
    const mild = eaters.filter((m) => checkMember(dish, m, plate.date, family).mild);
    return mild.length ? [`${dish.name}: make it mild for ${mild.map((m) => m.name.split(' ')[0]).join(', ')}`] : [];
  });
}

export const ORDER_DIET_LABEL: Record<Diet, string> = {
  vegan: 'Vegan',
  veg: 'Vegetarian',
  egg: 'Contains egg',
  nonveg: 'Non-veg',
};

export function orderWarnings(family: Family, dish: Dish, date: string): { text: string; tone: 'warn' | 'bad' }[] {
  const notes: { text: string; tone: 'warn' | 'bad' }[] = [];
  if (dish.unverified) notes.push({ text: 'Diet and ingredients need confirmation', tone: 'warn' });
  for (const person of family.members.filter(isEater)) {
    const allergies = [...new Set(person.allergies.map((item) => avoidHit(dish, item, true)).filter(Boolean))];
    if (allergies.length) notes.push({ text: `Allergy warning for ${person.name}: ${allergies.join(', ')}`, tone: 'bad' });
    const rule = checkMember(dish, person, date, family);
    if (rule.mild) notes.push({ text: `Ask for it mild for ${person.name}`, tone: 'warn' });
    if (rule.reason && !rule.reason.includes('is allergic to') && !rule.reason.includes('diet not confirmed yet')) {
      notes.push({ text: rule.reason, tone: 'warn' });
    }
  }
  return [...new Map(notes.map((note) => [note.text, note])).values()];
}
