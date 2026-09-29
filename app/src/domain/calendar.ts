// Food calendar (FR-212): Ekadashi fasts, Navratri windows and festivals.
// 2026 dates from drikpanchang.com (New Delhi) and smartpuja.com; 2027 dates are
// approximate and editable per family.
import type { Family, Member } from './types';
import { weekday } from './dates';

export const EKADASHI: string[] = [
  '2026-01-14', '2026-01-29', '2026-02-13', '2026-02-27', '2026-03-14', '2026-03-29', '2026-04-13',
  '2026-04-27', '2026-05-13', '2026-05-26', '2026-06-11', '2026-06-25', '2026-07-10', '2026-07-25',
  '2026-08-09', '2026-08-23', '2026-09-07', '2026-09-21', '2026-10-06', '2026-10-22', '2026-11-05',
  '2026-11-20', '2026-12-04', '2026-12-20',
  '2027-01-02', '2027-01-18', '2027-02-02', '2027-02-17', '2027-03-04', '2027-03-18', '2027-04-02',
  '2027-04-16', '2027-05-02', '2027-05-16', '2027-05-31', '2027-06-14', '2027-06-30', '2027-07-13',
  '2027-07-29', '2027-08-12', '2027-08-27', '2027-09-11', '2027-09-25', '2027-10-10', '2027-10-25',
  '2027-11-09', '2027-11-23', '2027-12-09', '2027-12-23',
];

/** [start, end] inclusive */
export const NAVRATRI: [string, string][] = [
  ['2026-03-19', '2026-03-27'],
  ['2026-10-12', '2026-10-20'],
  ['2027-04-07', '2027-04-15'],
  ['2027-09-30', '2027-10-08'],
];

export interface Festival {
  date: string;
  name: string;
}

export const FESTIVALS: Festival[] = [
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-10-29', name: 'Karwa Chauth' },
  { date: '2026-11-06', name: 'Dhanteras' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-11-14', name: 'Chhath Puja' },
  { date: '2026-11-24', name: 'Kartik Purnima' },
  { date: '2026-12-25', name: 'Christmas' },
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2027-03-06', name: 'Maha Shivaratri (approx.)' },
  { date: '2027-03-10', name: 'Eid al-Fitr (approx.)' },
  { date: '2027-03-22', name: 'Holi (approx.)' },
];

export function inRange(date: string, [a, b]: [string, string]): boolean {
  return date >= a && date <= b;
}

export function isEkadashi(date: string): boolean {
  return EKADASHI.includes(date);
}

export function isNavratri(date: string): boolean {
  return NAVRATRI.some((r) => inRange(date, r));
}

export function festivalOn(date: string): Festival | undefined {
  return FESTIVALS.find((f) => f.date === date);
}

/** Does this member fast (vrat food only) on this date? */
export function memberFasts(m: Member, date: string, family?: Family): boolean {
  const wd = weekday(date);
  for (const r of m.dayRules) {
    if (r.kind === 'ekadashi_fast' && isEkadashi(date)) return true;
    if (r.kind === 'navratri_fast' && isNavratri(date)) return true;
    if (r.kind === 'weekday_fast' && r.weekdays?.includes(wd)) return true;
  }
  if (family?.customFastDates.includes(date) && m.dayRules.length > 0) return true;
  return false;
}

/** Is non-veg (and egg) off for this member today? */
export function memberNoNonVeg(m: Member, date: string): boolean {
  const wd = weekday(date);
  return m.dayRules.some((r) => r.kind === 'weekday_no_nonveg' && r.weekdays?.includes(wd));
}

/** Short labels for the calendar and the "Rules applied today" banner. */
export function dayNotes(family: Family, date: string): string[] {
  const notes: string[] = [];
  const f = festivalOn(date);
  if (f) notes.push(f.name);
  if (isEkadashi(date)) notes.push('Ekadashi');
  if (isNavratri(date)) notes.push('Navratri');
  for (const m of family.members) {
    if (memberFasts(m, date, family)) notes.push(`${m.name} fasting`);
    else if (memberNoNonVeg(m, date)) notes.push(`${m.name}: no non-veg`);
  }
  return notes;
}
