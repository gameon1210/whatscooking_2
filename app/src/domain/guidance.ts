import { checkMember, plateEaters } from './rules';
import type { Family, PlannedMeal } from './types';
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
