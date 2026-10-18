// "Our food week" (1.0.4): private, positive stats built from meals already logged.
// Decided with Utkarsh (17 Oct 2026): fun stats, not a reports tab; neutral to
// polite tone (ordering in is stated plainly, never shamed); "protein-packed" means
// food groups only, no grams or health claims; the recap is never shared.
import { dishCuisine } from './cuisines';
import { addDays, daysBetween, shortDate, todayKey, weekday } from './dates';
import { dishById } from './recommender';
import type { Cuisine, Family, FoodGroup, MealEntry } from './types';

/** Monday of the week that contains `k`. */
export function weekStart(k: string): string {
  return addDays(k, -((weekday(k) + 6) % 7));
}

const PROTEIN: FoodGroup[] = ['pulse', 'egg_meat', 'dairy'];

export interface WeekStats {
  start: string;
  /** last day counted: Sunday, or today for the current week */
  end: string;
  meals: number;
  homeCooked: number;
  orderedIn: number;
  rice: number;
  roti: number;
  veg: number;
  egg: number;
  nonveg: number;
  /** meals with dal/beans, eggs/meat/fish or dairy (food groups only) */
  protein: number;
  /** days with at least one greens dish */
  greensDays: number;
  /** days with a millet dish */
  milletDays: number;
  distinctDishes: number;
  /** dishes logged for the first time ever this week */
  firsts: string[];
  cuisines: Partial<Record<Cuisine, number>>;
}

/** Meals that count: confirmed, so plans the family hasn't confirmed don't inflate stats. */
const counted = (f: Family) => f.entries.filter((e) => e.confirmed);

function isOrderedIn(e: MealEntry) {
  return !!e.orderedIn || e.via === 'order';
}

export function weekStats(f: Family, start: string, today = todayKey()): WeekStats {
  const sunday = addDays(start, 6);
  const end = sunday < today ? sunday : today;
  const all = counted(f);
  const inWeek = all.filter((e) => e.date >= start && e.date <= end);
  const before = new Set(all.filter((e) => e.date < start).flatMap((e) => e.dishIds));
  const s: WeekStats = { start, end, meals: inWeek.length, homeCooked: 0, orderedIn: 0, rice: 0, roti: 0, veg: 0, egg: 0, nonveg: 0, protein: 0, greensDays: 0, milletDays: 0, distinctDishes: 0, firsts: [], cuisines: {} };
  const greens = new Set<string>();
  const millet = new Set<string>();
  const dishes = new Set<string>();
  const firsts = new Set<string>();
  for (const e of inWeek) {
    const ds = e.dishIds.map((id) => dishById(f, id)).filter((d) => !!d);
    if (isOrderedIn(e)) s.orderedIn++;
    else s.homeCooked++;
    if (ds.some((d) => d.base === 'rice')) s.rice++;
    if (ds.some((d) => d.base === 'roti')) s.roti++;
    if (ds.some((d) => d.diet === 'nonveg')) s.nonveg++;
    else if (ds.some((d) => d.diet === 'egg')) s.egg++;
    else if (ds.length) s.veg++;
    const groups = new Set(ds.flatMap((d) => d.groups));
    if (PROTEIN.some((g) => groups.has(g))) s.protein++;
    if (groups.has('greens')) greens.add(e.date);
    if (groups.has('millet')) millet.add(e.date);
    if (ds[0]) {
      const c = dishCuisine(ds[0]);
      s.cuisines[c] = (s.cuisines[c] ?? 0) + 1;
    }
    for (const id of e.dishIds) {
      dishes.add(id);
      if (!before.has(id)) firsts.add(id);
    }
  }
  s.greensDays = greens.size;
  s.milletDays = millet.size;
  s.distinctDishes = dishes.size;
  s.firsts = [...firsts];
  return s;
}

/** Days in a row, up to today (or yesterday, if today has nothing yet), with a home-cooked meal. */
export function homeStreak(f: Family, today = todayKey()): number {
  const days = new Set(counted(f).filter((e) => !isOrderedIn(e)).map((e) => e.date));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface Badge {
  memberId: string;
  emoji: string;
  title: string;
  detail: string;
}

/** Positive-only, per person, from this week's reactions. Nobody gets a "worst" badge. */
export function badges(f: Family, start: string, end: string): Badge[] {
  const out: Badge[] = [];
  const inWeek = counted(f).filter((e) => e.date >= start && e.date <= end);
  const tally = (kind: string) => {
    const m = new Map<string, number>();
    for (const e of inWeek) for (const r of e.reactions) if (r.kind === kind) m.set(r.memberId, (m.get(r.memberId) ?? 0) + 1);
    return m;
  };
  const name = (id: string) => f.members.find((m) => m.id === id)?.name.split(' ')[0];
  for (const [id, n] of tally('tiffin_empty')) if (n >= 2 && name(id)) out.push({ memberId: id, emoji: '🍱', title: 'Clean-box champion', detail: `${name(id)} brought back ${n} empty boxes` });
  const loved = [...tally('loved')].sort((a, b) => b[1] - a[1]);
  if (loved[0] && loved[0][1] >= 2 && name(loved[0][0])) out.push({ memberId: loved[0][0], emoji: '😍', title: 'Biggest fan', detail: `${name(loved[0][0])} loved ${loved[0][1]} meals` });
  // Tried something new and liked it.
  const before = new Set(counted(f).filter((e) => e.date < start).flatMap((e) => e.dishIds));
  const tried = new Map<string, number>();
  for (const e of inWeek)
    if (e.dishIds.some((id) => !before.has(id)))
      for (const r of e.reactions) if (r.kind === 'loved' || r.kind === 'ok' || r.kind === 'tiffin_empty') tried.set(r.memberId, (tried.get(r.memberId) ?? 0) + 1);
  for (const [id, n] of tried) if (name(id) && !out.some((b) => b.memberId === id)) out.push({ memberId: id, emoji: '🧭', title: 'Explorer', detail: `${name(id)} enjoyed ${n} new dish${n > 1 ? 'es' : ''}` });
  return out.slice(0, 4);
}

export interface Highlight {
  key: string;
  text: string;
}

const change = (now: number, then: number) => (now === then ? 'same as last week' : now > then ? `${now - then} more than last week` : `${then - now} fewer than last week`);
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** One line each; neutral wording. Only stats with something in them. */
export function highlights(now: WeekStats, last: WeekStats, streak: number): Highlight[] {
  const h: Highlight[] = [];
  if (!now.meals) return h;
  if (now.rice || now.roti) h.push({ key: 'base', text: `Rice ${now.rice} · Roti ${now.roti} of ${plural(now.meals, 'meal')}` });
  h.push({ key: 'variety', text: `${plural(now.distinctDishes, 'different dish', 'different dishes')}${now.firsts.length ? `, ${now.firsts.length} new to the family` : ''}` });
  if (now.protein) h.push({ key: 'protein', text: `${plural(now.protein, 'protein-packed meal')} (dal, beans, paneer, eggs or meat)` });
  if (now.greensDays) h.push({ key: 'greens', text: `Greens on ${plural(now.greensDays, 'day')} (${change(now.greensDays, last.greensDays)})` });
  h.push({ key: 'out', text: now.orderedIn ? `Ordered in ${plural(now.orderedIn, 'time')} · cooked at home ${now.homeCooked}` : `All ${plural(now.homeCooked, 'meal')} cooked at home` });
  if (streak >= 3) h.push({ key: 'streak', text: `${streak} days in a row with a home-cooked meal` });
  if (now.milletDays) h.push({ key: 'millet', text: `Millets on ${plural(now.milletDays, 'day')}` });
  const cs = Object.keys(now.cuisines);
  if (cs.length > 1) h.push({ key: 'cuisines', text: `${cs.length} cuisines this week` });
  return h;
}

export interface Nudge {
  text: string;
  /** a word to put in the Today search / suggestion context, if any */
  hint?: 'roti' | 'rice' | 'greens' | 'new';
}

/** A stat that leads into tonight's decision (decided: stats lead into a suggestion). */
export function nudge(now: WeekStats): Nudge | null {
  if (now.meals < 4) return null;
  if (now.rice >= 4 && now.rice >= now.roti * 2) return { text: `Rice ${now.rice} of ${now.meals} so far. Roti tonight?`, hint: 'roti' };
  if (now.roti >= 4 && now.roti >= now.rice * 2) return { text: `Roti ${now.roti} of ${now.meals} so far. Rice tonight?`, hint: 'rice' };
  if (now.greensDays <= 1) return { text: `Greens on ${plural(now.greensDays, 'day')} so far. Palak, methi or saag tonight?`, hint: 'greens' };
  if (now.meals >= 7 && !now.firsts.length) return { text: 'All familiar favourites this week. Fancy something new tonight?', hint: 'new' };
  return null;
}

export interface FoodWeek {
  now: WeekStats;
  last: WeekStats;
  /** oldest first, the current week last */
  weeks: WeekStats[];
  streak: number;
  highlights: Highlight[];
  badges: Badge[];
  nudge: Nudge | null;
  isSunday: boolean;
}

/** Everything the recap screen and the home card show. `offset` 0 = this week, -1 = last week. */
export function foodWeek(f: Family, today = todayKey(), offset = 0): FoodWeek {
  const thisStart = weekStart(today);
  const start = addDays(thisStart, 7 * offset);
  const now = weekStats(f, start, today);
  const last = weekStats(f, addDays(start, -7), today);
  const weeks = [-3, -2, -1, 0].map((i) => weekStats(f, addDays(thisStart, 7 * i), today));
  const streak = homeStreak(f, today);
  return { now, last, weeks, streak, highlights: highlights(now, last, offset === 0 ? streak : 0), badges: badges(f, now.start, now.end), nudge: offset === 0 ? nudge(now) : null, isSunday: weekday(today) === 0 };
}

/** "This week", "Last week" or "Week of 28 Sep" */
export function weekLabel(s: WeekStats, today = todayKey()): string {
  const sunday = addDays(s.start, 6);
  if (daysBetween(s.start, today) >= 0 && daysBetween(today, sunday) >= 0) return 'This week';
  if (daysBetween(sunday, today) >= 1 && daysBetween(sunday, today) <= 7) return 'Last week';
  return `Week of ${shortDate(s.start).slice(4)}`;
}
