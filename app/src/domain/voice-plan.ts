import { checkPlan, findPlanned, recordEvent, upsertPlan } from './actions';
import { addDays, SLOT_END, SLOT_LABEL, todayKey, validDateKey, weekday } from './dates';
import { plateEaters } from './rules';
import type { Family } from './types';

export const VOICE_PLAN_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
type PlanSlot = typeof VOICE_PLAN_SLOTS[number];
export type SpokenMeal = { date: string; slot: PlanSlot; dish: string };
export type VoicePlanResult = { meals: SpokenMeal[]; issues: string[] };

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const HINDI_DAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const SLOT_WORDS: Record<string, PlanSlot> = {
  breakfast: 'breakfast', nashta: 'breakfast', 'नाश्ता': 'breakfast',
  lunch: 'lunch', dopahar: 'lunch', 'दोपहर': 'lunch',
  snack: 'snack', snacks: 'snack', 'नाश्ते': 'snack',
  dinner: 'dinner', supper: 'dinner', raat: 'dinner', 'रात': 'dinner',
};
const DAY_WORDS = ['today', 'tomorrow', 'aaj', 'आज', 'कल', ...DAYS, ...HINDI_DAYS];
const MARKERS = new RegExp(`(^|[\\s,:])(${[...DAY_WORDS, ...Object.keys(SLOT_WORDS), '\\d{4}-\\d{2}-\\d{2}'].join('|')})(?=$|[\\s,:])`, 'giu');
const MAX_MEALS = 28;

function spokenDate(word: string, start: string, today: string): string {
  if (word === 'today' || word === 'aaj' || word === 'आज') return today;
  if (word === 'tomorrow' || word === 'कल') return addDays(today, 1);
  const day = Math.max(DAYS.indexOf(word), HINDI_DAYS.indexOf(word));
  return day >= 0 ? addDays(start, (day - weekday(start) + 7) % 7) : word;
}

function resolveMeals(meals: unknown[], start: string, end: string, issues: string[]): VoicePlanResult {
  const bySlot = new Map<string, SpokenMeal>();
  for (const value of meals.slice(0, MAX_MEALS)) {
    if (!value || typeof value !== 'object') continue;
    const meal = value as Partial<SpokenMeal>;
    if (typeof meal.date !== 'string' || !validDateKey(meal.date) || !meal.slot || !VOICE_PLAN_SLOTS.includes(meal.slot) || typeof meal.dish !== 'string' || !meal.dish.trim()) {
      issues.push('A meal was missing a valid date, meal name or dish.');
      continue;
    }
    if (meal.date < start || meal.date > end) {
      issues.push(`${meal.dish.trim().slice(0, 100)} is outside the selected dates.`);
      continue;
    }
    const key = `${meal.date}:${meal.slot}`;
    if (bySlot.has(key)) issues.push(`Used the last dish mentioned for ${meal.date} ${SLOT_LABEL[meal.slot].toLowerCase()}.`);
    bySlot.set(key, { date: meal.date, slot: meal.slot, dish: meal.dish.trim().slice(0, 120) });
  }
  if (meals.length > MAX_MEALS) issues.push('Review up to 28 meals at a time.');
  return { meals: [...bySlot.values()], issues: [...new Set(issues)] };
}

export function reviewAiPlan(value: unknown, start: string, end: string): VoicePlanResult {
  const meals = value && typeof value === 'object' && 'meals' in value ? value.meals : null;
  return resolveMeals(Array.isArray(meals) ? meals : [], start, end, []);
}

/** A simple parser for a day or multiple dates, without a Gemini key. */
export function parseSpokenPlan(text: string, start: string, end: string, today: string): VoicePlanResult {
  const meals: SpokenMeal[] = [];
  const issues: string[] = [];
  let date = start;
  for (const line of text.normalize('NFC').split(/[\n;.!?।]+/).map((part) => part.trim()).filter(Boolean)) {
    let slot: PlanSlot | undefined;
    let cursor = 0;
    const addMeal = (to: number) => {
      if (!slot) return;
      const dish = line.slice(cursor, to).replace(/^[\s,:-]*(?:for\s+|is\s+)?/i, '').replace(/(?:\s+(?:and then|and|then|aur))?[\s,:-]*$/i, '').trim();
      if (dish) meals.push({ date, slot, dish });
      else issues.push(`Say a dish after ${SLOT_LABEL[slot].toLowerCase()}.`);
    };
    for (const marker of line.matchAll(MARKERS)) {
      addMeal(marker.index);
      const word = marker[2].toLowerCase();
      slot = SLOT_WORDS[word];
      if (!slot) date = spokenDate(word, start, today);
      cursor = marker.index + marker[0].length;
    }
    addMeal(line.length);
  }
  if (!meals.length && !issues.length) issues.push('Include a meal name and a dish, for example “breakfast poha”.');
  return resolveMeals(meals, start, end, issues);
}

export type VoicePlanChoice = Pick<SpokenMeal, 'date' | 'slot'> & { dishId: string; replacePlanId?: string };

export function voicePlanProblem(family: Family, choice: VoicePlanChoice, now = new Date()): string | undefined {
  const { date, slot, dishId } = choice;
  const today = todayKey(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (!validDateKey(date) || date < today || (date === today && minutes >= SLOT_END[slot])) return 'This meal time has passed. Use Log to record what you ate.';
  if (!family.settings.planSlots.includes(slot)) return `Enable ${SLOT_LABEL[slot].toLowerCase()} in Settings under Planning to save this meal.`;
  const existing = findPlanned(family, date, slot);
  if (existing?.status === 'cooked' || existing?.status === 'ordered_in') return 'This meal is already logged.';
  const people = plateEaters(family, { date, slot, forMemberIds: existing?.forMemberIds });
  if (!people.length) return 'Everyone already has a separate plate, or no one is eating this meal.';
  return checkPlan(family, date, slot, [dishId], { forMemberIds: people.map((person) => person.id) }).problems[0]?.reason;
}

/** Check the whole selection before saving. Existing meals need explicit consent. */
export function saveSpokenPlan(family: Family, choices: VoicePlanChoice[], now = new Date()) {
  const slots = new Set<string>();
  for (const choice of choices) {
    const key = `${choice.date}:${choice.slot}`;
    if (slots.has(key)) throw new Error('Choose one dish for each meal.');
    slots.add(key);
    const issue = voicePlanProblem(family, choice, now);
    if (issue) throw new Error(issue);
    const existing = findPlanned(family, choice.date, choice.slot);
    if (existing && existing.status !== 'skipped' && existing.id !== choice.replacePlanId) throw new Error('A meal was already planned. Review the replacement first.');
  }
  for (const { date, slot, dishId } of choices) {
    upsertPlan(family, date, slot, [dishId], { source: 'calendar', pinned: true });
    recordEvent(family, date, slot, dishId, 'accepted');
  }
}
