// Hard rules (FR-211, FR-212): never overridden by score.
import type { Diet, Dish, Family, Member, SlotId } from './types';
import { memberFasts, memberNoNonVeg } from './calendar';
import { weekday } from './dates';

const DIET_RANK: Record<Diet, number> = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };

export function dietAllows(memberDiet: Diet, dishDiet: Diet): boolean {
  if (memberDiet === 'vegan') return dishDiet === 'vegan';
  return DIET_RANK[dishDiet] <= DIET_RANK[memberDiet];
}

function mentions(dish: Dish, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (!w) return false;
  const hay = [dish.name, ...dish.ingredients, ...dish.veg, ...dish.aliases].join(' ').toLowerCase();
  return hay.includes(w);
}

export interface RuleCheck {
  ok: boolean;
  reason?: string;
}

/** Can this member eat this dish on this date? */
export function checkMember(dish: Dish, m: Member, date: string, family?: Family): RuleCheck {
  if (!dietAllows(m.diet, dish.diet)) return { ok: false, reason: `${m.name} is ${m.diet}` };
  if (m.jain && !dish.jainOk) return { ok: false, reason: `${m.name} is Jain` };
  if (m.noOnionGarlic && dish.onionGarlic) return { ok: false, reason: `${m.name}: no onion-garlic` };
  for (const x of [...m.allergies, ...m.exclusions]) {
    if (mentions(dish, x)) return { ok: false, reason: `${m.name} avoids ${x}` };
  }
  if (memberFasts(m, date, family) && !dish.vratOk) return { ok: false, reason: `${m.name} is fasting` };
  if (memberNoNonVeg(m, date) && (dish.diet === 'nonveg' || dish.diet === 'egg'))
    return { ok: false, reason: `${m.name}: no non-veg today` };
  return { ok: true };
}

export function slotFits(dish: Dish, slot: SlotId): boolean {
  if (!dish.slots.includes(slot)) return false;
  if (slot === 'tiffin_short' && !dish.portable) return false;
  if (slot === 'tiffin_lunch' && !dish.portable) return false;
  return true;
}

export function isHidden(family: Family, dishId: string, date: string): boolean {
  return family.hidden.some((h) => h.dishId === dishId && (!h.until || h.until >= date));
}

/** Who eats this slot. Tiffins are for one child. */
export function eatersFor(family: Family, slot: SlotId, memberId?: string): Member[] {
  if (memberId) return family.members.filter((m) => m.id === memberId);
  return family.members.filter((m) => m.eatsAtHome && m.roles.includes('eater'));
}

/** Children who need tiffins on this date (FR-265). */
export function tiffinKids(family: Family, date: string): { member: Member; slots: SlotId[] }[] {
  const wd = weekday(date);
  const out: { member: Member; slots: SlotId[] }[] = [];
  for (const m of family.members) {
    const s = m.school;
    if (!s) continue;
    if (!s.schoolDays.includes(wd)) continue;
    if (s.holidays.includes(date)) continue;
    const slots: SlotId[] = [];
    if (s.shortBreak) slots.push('tiffin_short');
    if (s.lunchBox) slots.push('tiffin_lunch');
    if (slots.length) out.push({ member: m, slots });
  }
  return out;
}
