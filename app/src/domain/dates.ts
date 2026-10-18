import type { SlotId } from './types';

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

export function weekday(k: string): number {
  return fromKey(k).getDay();
}

export function todayKey(now = new Date()): string {
  return toKey(now);
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayShort = (i: number) => WD[i];
export const weekdayLong = (i: number) => WD_LONG[i];

export function prettyDate(k: string, today = todayKey()): string {
  const diff = daysBetween(today, k);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const d = fromKey(k);
  return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function shortDate(k: string): string {
  const d = fromKey(k);
  return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

export const SLOT_LABEL: Record<SlotId, string> = {
  breakfast: 'Breakfast',
  tiffin_short: 'Short-break box',
  tiffin_lunch: 'Lunch box',
  lunch: 'Lunch',
  snack: 'Evening snack',
  dinner: 'Dinner',
};

export const SLOT_EMOJI: Record<SlotId, string> = {
  breakfast: '🍳',
  tiffin_short: '🍎',
  tiffin_lunch: '🍱',
  lunch: '🍛',
  snack: '☕',
  dinner: '🌙',
};

/** Slot ends, as minutes after midnight (used for auto-log, FR-222). */
export const SLOT_END: Record<SlotId, number> = {
  breakfast: 10 * 60 + 30,
  tiffin_short: 13 * 60,
  tiffin_lunch: 15 * 60,
  lunch: 15 * 60 + 30,
  snack: 19 * 60,
  dinner: 22 * 60 + 30,
};

export const SLOT_ORDER: SlotId[] = ['breakfast', 'tiffin_short', 'tiffin_lunch', 'lunch', 'snack', 'dinner'];

/** The next meal slot from local time (FR-201). */
export function currentSlot(now = new Date(), planSlots: SlotId[]): { date: string; slot: SlotId } {
  const mins = now.getHours() * 60 + now.getMinutes();
  const order: SlotId[] = SLOT_ORDER.filter((s) => planSlots.includes(s) && !s.startsWith('tiffin'));
  for (const s of order) {
    if (mins < SLOT_END[s] - 30) return { date: toKey(now), slot: s };
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return { date: toKey(tomorrow), slot: order[0] ?? 'breakfast' };
}

export function validHHMM(t: string): boolean {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(t ?? '');
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

/**
 * Reads a time the way people type it and returns "HH:MM", or null (1.0.2).
 * Accepts 15:30, 3:30 pm, 3.30pm, 1530, 3pm, 9 and "15 30".
 */
export function normalizeTime(input: string): string | null {
  const t = (input ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const m = /^(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.[0];
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
  } else if (h > 23) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Strict "HH:MM" (D26). Throws on anything else; check with validHHMM first. */
export function parseHHMM(t: string): { hour: number; minute: number } {
  if (!validHHMM(t)) throw new Error(`Invalid time "${t}". Use HH:MM, for example 21:00.`);
  const [h, m] = t.trim().split(':').map(Number);
  return { hour: h, minute: m };
}

/** Add minutes to a clock time, carrying into the hour (D28). Wraps at midnight. */
export function addMinutes(t: { hour: number; minute: number }, mins: number): { hour: number; minute: number } {
  const total = (((t.hour * 60 + t.minute + mins) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export function validDateKey(k: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  return toKey(fromKey(k)) === k;
}

/** Is meal (date, slot) strictly later than (date, slot)? */
export function isAfter(aDate: string, aSlot: SlotId, bDate: string, bSlot: SlotId): boolean {
  if (aDate !== bDate) return aDate > bDate;
  return SLOT_ORDER.indexOf(aSlot) > SLOT_ORDER.indexOf(bSlot);
}

// ---- Past-date logging (1.0.4) ----

/** How far back a meal can be logged or corrected. */
export const LOG_BACK_DAYS = 366;

/** A real date that isn't in the future and isn't older than a year. */
export function loggableDate(k: string, today = todayKey()): boolean {
  if (!validDateKey(k)) return false;
  const d = daysBetween(today, k);
  return d <= 0 && d >= -LOG_BACK_DAYS;
}

export const monthLong = (i: number) =>
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i];

/** A long, unambiguous date for screen readers and confirmations: "Monday 12 October 2026". */
export function longDate(k: string): string {
  const d = fromKey(k);
  return `${WD_LONG[d.getDay()]} ${d.getDate()} ${monthLong(d.getMonth())} ${d.getFullYear()}`;
}

/**
 * The days of a month laid out in Monday-first weeks; null pads the first and last week.
 * `month0` is 0..11.
 */
export function monthGrid(year: number, month0: number): (string | null)[][] {
  const first = new Date(year, month0, 1, 12);
  const days = new Date(year, month0 + 1, 0, 12).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toKey(new Date(year, month0, d, 12)));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** "oct", "october", "sept" -> 9 / 8; a word that isn't a month (or under 3 letters) -> undefined. */
function monthIndex(word: string): number | undefined {
  if (word.length < 3) return undefined;
  const full = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const i = full.findIndex((m) => m.startsWith(word));
  return i < 0 ? undefined : i;
}

/**
 * Reads a date typed by hand. Accepts 2026-10-12, "12 Oct", "12 October 2026", "Oct 12".
 * Numeric 12/10 forms are refused on purpose: India and the UK read them day-first, the US month-first.
 * A date without a year is the most recent one that isn't in the future.
 */
export function parseDateInput(input: string, today = todayKey()): string | null {
  const t = (input ?? '').trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  if (!t) return null;
  if (t === 'today') return today;
  if (t === 'yesterday') return addDays(today, -1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return validDateKey(t) ? t : null;
  let day: number | undefined;
  let mon: number | undefined;
  let year: number | undefined;
  const a = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)\.?(?: (\d{4}))?$/.exec(t);
  const b = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/.exec(t);
  if (a) [day, mon, year] = [Number(a[1]), monthIndex(a[2]), a[3] ? Number(a[3]) : undefined];
  else if (b) [day, mon, year] = [Number(b[2]), monthIndex(b[1]), b[3] ? Number(b[3]) : undefined];
  if (day === undefined || mon === undefined) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const build = (y: number) => `${y}-${pad(mon! + 1)}-${pad(day!)}`;
  if (year) return validDateKey(build(year)) ? build(year) : null;
  const y = fromKey(today).getFullYear();
  const k = build(y);
  if (!validDateKey(k)) return validDateKey(build(y - 1)) ? build(y - 1) : null;
  return k > today ? build(y - 1) : k;
}
