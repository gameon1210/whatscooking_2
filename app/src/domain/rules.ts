// Hard rules (FR-211, FR-212): never overridden by score. Every path that suggests
// or saves a plan goes through checkMember / checkPlan.
import { avoidHit } from './allergens';
import { memberFasts, memberNoNonVeg } from './calendar';
import { weekday } from './dates';
import type { AgeBand, Diet, Dish, Family, Member, PlannedMeal, SlotId } from './types';

const DIET_RANK: Record<Diet, number> = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };

export function dietAllows(memberDiet: Diet, dishDiet: Diet): boolean {
  return DIET_RANK[dishDiet] <= DIET_RANK[memberDiet];
}

export interface RuleCheck {
  ok: boolean;
  reason?: string;
  /** allowed only as the milder version */
  mild?: boolean;
}

/** Spice is a hard rule: a hotter dish is allowed only one step up, cooked mild. */
export function spiceCheck(dish: Dish, m: Member): { ok: boolean; mild: boolean } {
  if (dish.spice <= m.spice) return { ok: true, mild: false };
  const mildOk = dish.mildOk ?? dish.spice <= 2;
  if (mildOk && dish.spice - 1 <= m.spice) return { ok: true, mild: true };
  return { ok: false, mild: false };
}

/** Can this member eat this dish on this date? */
export function checkMember(dish: Dish, m: Member, date: string, family?: Family): RuleCheck {
  if (dish.unverified && m.diet !== 'nonveg') return { ok: false, reason: `${dish.name}: diet not confirmed yet` };
  if (!dietAllows(m.diet, dish.diet)) return { ok: false, reason: `${m.name} is ${m.diet}` };
  if (m.jain && (!dish.jainOk || dish.unverified)) return { ok: false, reason: `${m.name} is Jain` };
  if (m.noOnionGarlic && (dish.onionGarlic || dish.unverified)) return { ok: false, reason: `${m.name}: no onion-garlic` };
  for (const x of m.allergies) {
    const hit = avoidHit(dish, x, true);
    if (hit) return { ok: false, reason: `${m.name} is allergic to ${hit}` };
  }
  for (const x of m.exclusions) {
    const hit = avoidHit(dish, x, false);
    if (hit) return { ok: false, reason: `${m.name} avoids ${hit}` };
  }
  if (memberFasts(m, date, family) && !dish.vratOk) return { ok: false, reason: `${m.name} is fasting` };
  if (memberNoNonVeg(m, date, family) && (dish.diet === 'nonveg' || dish.diet === 'egg'))
    return { ok: false, reason: `${m.name}: no non-veg today` };
  const sp = spiceCheck(dish, m);
  if (!sp.ok) return { ok: false, reason: `Too spicy for ${m.name}` };
  return { ok: true, mild: sp.mild };
}

/** Does the dish suit the slot? The short-break box needs dry finger food (FR-265). */
export function slotFits(dish: Dish, slot: SlotId): boolean {
  if (!dish.slots.includes(slot)) return false;
  return boxFits(dish, slot);
}

/** Box fit only, for dishes the planner picks by hand. */
export function boxFits(dish: Dish, slot: SlotId): boolean {
  if (slot === 'tiffin_short') return !!dish.portable && !!dish.dry;
  if (slot === 'tiffin_lunch') return !!dish.portable;
  return true;
}

export function isHidden(family: Family, dishId: string, date: string): boolean {
  return family.hidden.some((h) => h.dishId === dishId && (!h.until || h.until >= date));
}

export const isEater = (m: Member) => m.eatsAtHome && m.roles.includes('eater');

/** Who eats this slot. Tiffins are for one child. */
export function eatersFor(family: Family, slot: SlotId, memberId?: string): Member[] {
  if (memberId) return family.members.filter((m) => m.id === memberId);
  return family.members.filter(isEater);
}

/**
 * Who a saved plate is for (FR-213). A plate with `forMemberIds` is for exactly
 * those people. The family plate is for every eater who isn't fasting that day
 * and isn't covered by another plate in the same slot.
 */
export function plateEaters(family: Family, p: Pick<PlannedMeal, 'date' | 'slot' | 'memberId' | 'forMemberIds'>): Member[] {
  const ids = p.forMemberIds?.length ? p.forMemberIds : p.memberId ? [p.memberId] : null;
  if (ids) return family.members.filter((m) => ids.includes(m.id));
  const taken = new Set<string>();
  for (const o of family.planned) {
    if (o.date !== p.date || o.slot !== p.slot || o.status === 'skipped') continue;
    for (const id of o.forMemberIds?.length ? o.forMemberIds : o.memberId ? [o.memberId] : []) taken.add(id);
  }
  return family.members.filter((m) => isEater(m) && !taken.has(m.id) && !memberFasts(m, p.date, family));
}

const PORTION: Record<AgeBand, number> = { toddler: 0.4, child: 0.6, teen: 1, adult: 1, senior: 0.8 };

/** Adult-equivalent portions for a set of eaters (FR-210 / FR-232). */
export function portions(members: Member[]): number {
  return Math.round(members.reduce((n, m) => n + PORTION[m.ageBand], 0) * 100) / 100 || 1;
}

export interface PlanProblem {
  dishId: string;
  reason: string;
}

/** Hard-rule problems for putting this dish on this plate (D05). */
export function checkDishForPlate(family: Family, dish: Dish, date: string, slot: SlotId, eaters: Member[]): string | null {
  if (!boxFits(dish, slot)) return slot === 'tiffin_short' ? `${dish.name} isn’t dry finger food for the short-break box` : `${dish.name} doesn’t travel well in a lunch box`;
  for (const m of eaters) {
    const c = checkMember(dish, m, date, family);
    if (!c.ok) return c.reason ?? `Doesn’t fit ${m.name}’s rules`;
  }
  return null;
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

/**
 * The cook on duty for a date and slot (FR-235). Days and slots left unset mean
 * "always"; an explicitly empty list means "never" (D35).
 */
export function cookOnDuty(family: Family, date: string, slot?: SlotId): Member | undefined {
  const wd = weekday(date);
  return family.members.find(
    (m) =>
      m.roles.includes('cook') &&
      !m.optedOut &&
      (m.cookDays === undefined || m.cookDays.includes(wd)) &&
      !(m.leaveDates ?? []).includes(date) &&
      (slot === undefined || m.cookSlots === undefined || m.cookSlots.includes(slot)),
  );
}

/** Any active cook, on duty or not (for "add a cook" prompts). */
export function anyCook(family: Family): Member | undefined {
  return family.members.find((m) => m.roles.includes('cook') && !m.optedOut);
}
