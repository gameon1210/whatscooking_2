// 1.0.4: past-date logging, the food-calendar switch, world cuisines and "Our food week".
import { editEntry, logMeal, toggleReaction } from '@/domain/actions';
import { canonicalAllergens } from '@/domain/allergens';
import { dayNotes, foodCalendarOn, memberFasts, memberNoNonVeg } from '@/domain/calendar';
import { CATALOG, makeCustomDish } from '@/domain/catalog';
import { cuisineFits, DEFAULT_CUISINES, dishCuisine, familyCuisines } from '@/domain/cuisines';
import { addDays, loggableDate, monthGrid, parseDateInput } from '@/domain/dates';
import { newFamily, newMember } from '@/domain/family';
import { GLOBAL_DISHES } from '@/domain/global-catalog';
import { foodWeek, homeStreak, nudge, weekStart, weekStats } from '@/domain/insights';
import { similarDishes } from '@/domain/parse';
import { recommend } from '@/domain/recommender';
import { checkMember } from '@/domain/rules';
import type { Family } from '@/domain/types';

const TODAY = '2026-10-17'; // a Saturday
const EKADASHI = '2026-10-22';

function family(): Family {
  const f = newFamily('Test home', 'general');
  f.members = [newMember('Priya', { id: 'p', roles: ['planner', 'eater'], diet: 'nonveg' }), newMember('Aarav', { id: 'a', ageBand: 'child', diet: 'nonveg' })];
  return f;
}

describe('picking any past day (1.0.4)', () => {
  test('typed dates: ISO, day-month, month-day, today/yesterday', () => {
    expect(parseDateInput('2026-10-12', TODAY)).toBe('2026-10-12');
    expect(parseDateInput('12 Oct', TODAY)).toBe('2026-10-12');
    expect(parseDateInput('12th October 2025', TODAY)).toBe('2025-10-12');
    expect(parseDateInput('Oct 3', TODAY)).toBe('2026-10-03');
    expect(parseDateInput('sept 30', TODAY)).toBe('2026-09-30');
    expect(parseDateInput('yesterday', TODAY)).toBe('2026-10-16');
  });
  test('a day-month without a year that is still ahead means last year', () => {
    expect(parseDateInput('25 Dec', TODAY)).toBe('2025-12-25');
  });
  test('ambiguous or broken input is refused, not guessed', () => {
    expect(parseDateInput('12/10', TODAY)).toBeNull();
    expect(parseDateInput('31 Feb', TODAY)).toBeNull();
    expect(parseDateInput('12 marshmallow', TODAY)).toBeNull();
    expect(parseDateInput('', TODAY)).toBeNull();
  });
  test('today and up to a year back are loggable; the future is not', () => {
    expect(loggableDate(TODAY, TODAY)).toBe(true);
    expect(loggableDate('2026-01-02', TODAY)).toBe(true);
    expect(loggableDate(addDays(TODAY, 1), TODAY)).toBe(false);
    expect(loggableDate(addDays(TODAY, -400), TODAY)).toBe(false);
    expect(loggableDate('2026-02-30', TODAY)).toBe(false);
  });
  test('the month calendar starts weeks on Monday', () => {
    const weeks = monthGrid(2026, 9); // October 2026 starts on a Thursday
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toBe('2026-10-01');
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
  test('a meal months ago is logged on that day, ordered in or cooked', () => {
    const f = family();
    const e = logMeal(f, { date: '2026-06-02', slot: 'dinner', dishIds: ['margherita_pizza'], via: 'manual', orderedIn: true });
    expect(e.date).toBe('2026-06-02');
    expect(e.orderedIn).toBe(true);
    expect(editEntry(f, e.id, { orderedIn: false })).toBe(true);
    expect(f.entries[0].orderedIn).toBe(false);
  });
});

describe('food calendar master switch (1.0.4)', () => {
  test('a new family starts with the calendar off', () => {
    expect(foodCalendarOn(newFamily('x', 'general'))).toBe(false);
  });
  test('older families that already use fasts keep them on', () => {
    const f = family();
    f.members[0].dayRules = [{ id: 'e', kind: 'ekadashi_fast' }];
    expect(f.settings.foodCalendar).toBeUndefined();
    expect(foodCalendarOn(f)).toBe(true);
    expect(memberFasts(f.members[0], EKADASHI, f)).toBe(true);
  });
  test('switching it off pauses fasts and no-non-veg days, but keeps the rules', () => {
    const f = family();
    f.members[0].dayRules = [{ id: 'e', kind: 'ekadashi_fast' }, { id: 'n', kind: 'weekday_no_nonveg', weekdays: [4] }];
    f.settings.foodCalendar = false;
    expect(memberFasts(f.members[0], EKADASHI, f)).toBe(false);
    expect(memberNoNonVeg(f.members[0], EKADASHI, f)).toBe(false); // a Thursday
    expect(checkMember(CATALOG.find((d) => d.id === 'chicken_curry_rice')!, f.members[0], EKADASHI, f).ok).toBe(true);
    expect(f.members[0].dayRules).toHaveLength(2);
    f.settings.foodCalendar = true;
    expect(memberFasts(f.members[0], EKADASHI, f)).toBe(true);
  });
  test('with the calendar off, notes show festivals only, nothing about fasts', () => {
    const f = family();
    f.members[0].dayRules = [{ id: 'n', kind: 'navratri_fast' }];
    f.settings.foodCalendar = false;
    expect(dayNotes(f, '2026-10-20')).toEqual(['Dussehra']);
    f.settings.foodCalendar = true;
    expect(dayNotes(f, '2026-10-20')).toEqual(expect.arrayContaining(['Dussehra', 'Navratri', 'Priya fasting']));
  });
});

describe('world cuisines (1.0.4)', () => {
  test('the curated set covers the ten cuisines picked, about 7 dishes each', () => {
    const by = new Map<string, number>();
    for (const d of GLOBAL_DISHES) by.set(d.cuisine!, (by.get(d.cuisine!) ?? 0) + 1);
    for (const c of ['indo_chinese', 'italian', 'mexican', 'chinese', 'thai', 'continental', 'japanese', 'korean', 'middle_eastern', 'mediterranean']) expect(by.get(c)).toBeGreaterThanOrEqual(6);
    expect(by.has('american' as never)).toBe(false);
  });
  test('ids are unique across the whole catalogue', () => {
    const ids = CATALOG.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  test('every world dish has the metadata rules and shopping need', () => {
    for (const d of GLOBAL_DISHES) {
      expect(d.groups.length).toBeGreaterThan(0);
      expect(d.ingredients.length + d.veg.length).toBeGreaterThan(0);
      expect(d.slots.length).toBeGreaterThan(0);
      expect(Array.isArray(d.allergens)).toBe(true);
      if (d.diet === 'nonveg') expect(d.groups).toContain('egg_meat');
      if (d.diet === 'vegan') expect(d.allergens).not.toEqual(expect.arrayContaining(['milk'])) ;
      if (d.diet === 'vegan' || d.diet === 'veg') expect(d.allergens).not.toContain('fish');
      if (d.slots.includes('tiffin_short')) expect(d.portable && d.dry).toBe(true);
      if (d.slots.includes('tiffin_lunch')) expect(d.portable).toBe(true);
    }
  });
  test('allergens a word match would miss are declared', () => {
    const al = (id: string) => GLOBAL_DISHES.find((d) => d.id === id)!.allergens!;
    expect(al('pesto_pasta')).toEqual(expect.arrayContaining(['nuts', 'milk', 'wheat']));
    expect(al('veg_manchurian')).toEqual(expect.arrayContaining(['soy', 'wheat']));
    expect(al('bean_quesadilla')).toEqual(expect.arrayContaining(['wheat', 'milk']));
    expect(al('falafel_wrap')).toEqual(expect.arrayContaining(['sesame', 'wheat']));
    expect(al('bibimbap')).toEqual(expect.arrayContaining(['egg', 'soy', 'wheat', 'sesame']));
    expect(al('tofu_pad_thai')).toEqual(expect.arrayContaining(['peanut', 'soy']));
    expect(al('thai_red_curry_chicken')).toContain('fish');
    // coconut milk is coconut, not dairy
    expect(al('thai_green_curry')).toContain('coconut');
    expect(al('thai_green_curry')).not.toContain('milk');
  });
  test('a wheat or sesame allergy blocks the matching world dishes', () => {
    const m = newMember('Kid', { allergies: ['gluten', 'sesame'] });
    const ok = (id: string) => checkMember(CATALOG.find((d) => d.id === id)!, m, TODAY).ok;
    expect(ok('margherita_pizza')).toBe(false);
    expect(ok('hummus_pita')).toBe(false);
    expect(ok('mexican_rice')).toBe(true);
    expect(canonicalAllergens('gluten')).toEqual(['wheat']);
  });
  test('vegetarians never get a meat or fish world dish', () => {
    const m = newMember('Veg', { diet: 'veg' });
    for (const d of GLOBAL_DISHES.filter((x) => x.diet === 'nonveg')) expect(checkMember(d, m, TODAY).ok).toBe(false);
  });
  test('older families keep Indian plus pasta, noodles and soup; nothing Mexican appears', () => {
    const f = family();
    expect(familyCuisines(f)).toEqual(DEFAULT_CUISINES);
    const s = recommend({ family: f, date: TODAY, slot: 'dinner', count: 40 });
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((x) => dishCuisine(x.dish) === 'indian')).toBe(true);
    expect(s.every((x) => DEFAULT_CUISINES.includes(dishCuisine(x.dish)))).toBe(true);
  });
  test('a family that cooks only Italian and Mexican gets only those', () => {
    const f = family();
    f.settings.cuisines = ['italian', 'mexican'];
    f.settings.adventurous = 100;
    const s = recommend({ family: f, date: TODAY, slot: 'dinner', count: 10 });
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => ['italian', 'mexican'].includes(dishCuisine(x.dish)))).toBe(true);
  });
  test('a dish the family already cooked stays suggestible after its cuisine is unticked', () => {
    const f = family();
    f.settings.cuisines = ['korean'];
    logMeal(f, { date: addDays(TODAY, -20), slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual' });
    expect(cuisineFits(CATALOG.find((d) => d.id === 'dal_chawal')!, f)).toBe(false);
    const ids = recommend({ family: f, date: TODAY, slot: 'dinner', count: 40 }).map((x) => x.dish.id);
    expect(ids).toContain('dal_chawal');
    expect(ids.every((id) => id === 'dal_chawal' || dishCuisine(CATALOG.find((d) => d.id === id)!) === 'korean')).toBe(true);
  });
});

describe('Our food week (1.0.4)', () => {
  function week(): Family {
    const f = family();
    // the week of Mon 12 Oct – Sat 17 Oct (today)
    const add = (date: string, dish: string, extra: Partial<Parameters<typeof logMeal>[1]> = {}) => logMeal(f, { date, slot: 'dinner', dishIds: [dish], via: 'manual', ...extra });
    add('2026-10-12', 'rajma_chawal');
    add('2026-10-13', 'sambar_rice');
    add('2026-10-14', 'dal_chawal');
    add('2026-10-15', 'curd_rice');
    add('2026-10-16', 'palak_paneer');
    add('2026-10-17', 'margherita_pizza', { orderedIn: true });
    // last week: one greens day, and an unconfirmed plan that must not count
    add('2026-10-06', 'dal_chawal');
    logMeal(f, { date: '2026-10-07', slot: 'dinner', dishIds: ['keerai_kootu'], via: 'auto', confirmed: false });
    return f;
  }
  test('weeks start on Monday', () => {
    expect(weekStart('2026-10-17')).toBe('2026-10-12');
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
  });
  test('counts rice and roti, ordering in, protein groups and firsts', () => {
    const s = weekStats(week(), '2026-10-12', TODAY);
    expect(s.meals).toBe(6);
    expect(s.orderedIn).toBe(1);
    expect(s.homeCooked).toBe(5);
    expect(s.rice).toBe(4);
    expect(s.roti).toBe(1);
    expect(s.greensDays).toBe(1);
    expect(s.protein).toBeGreaterThanOrEqual(4);
    expect(s.firsts).not.toContain('dal_chawal'); // eaten last week
    expect(s.firsts).toContain('rajma_chawal');
    expect(s.cuisines.indian).toBe(5);
    expect(s.cuisines.italian).toBe(1);
  });
  test('unconfirmed plans are not counted', () => {
    expect(weekStats(week(), '2026-10-05', TODAY).meals).toBe(1);
  });
  test('the nudge turns a stat into tonight’s decision, politely', () => {
    const n = nudge(weekStats(week(), '2026-10-12', TODAY));
    expect(n?.text).toBe('Rice 4 of 6 so far. Roti tonight?');
  });
  test('ordering in is stated plainly, never as a problem', () => {
    const w = foodWeek(week(), TODAY);
    const line = w.highlights.find((h) => h.key === 'out')!.text;
    expect(line).toBe('Ordered in 1 time · cooked at home 5');
    expect(w.highlights.map((h) => h.text).join(' ')).not.toMatch(/only|too many|bad|unhealthy|again\?/i);
  });
  test('streak counts days in a row with a home-cooked meal', () => {
    // Today (17th) was ordered in; the day isn't over, so the run 12th–16th still counts.
    expect(homeStreak(week(), TODAY)).toBe(5);
    expect(homeStreak(week(), '2026-10-16')).toBe(5);
    // Two days without a home-cooked meal ends it.
    expect(homeStreak(week(), '2026-10-19')).toBe(0);
  });
  test('badges are positive and per person', () => {
    const f = week();
    for (const e of f.entries.filter((x) => x.date >= '2026-10-12' && x.date <= '2026-10-14')) toggleReaction(f, e.id, 'a', 'loved');
    const w = foodWeek(f, TODAY);
    expect(w.badges.find((b) => b.title === 'Biggest fan')?.detail).toBe('Aarav loved 3 meals');
    expect(w.badges.every((b) => !/least|worst|never/i.test(b.title + b.detail))).toBe(true);
  });
  test('last week can be viewed too', () => {
    const w = foodWeek(week(), TODAY, -1);
    expect(w.now.start).toBe('2026-10-05');
    expect(w.now.meals).toBe(1);
    expect(w.nudge).toBeNull();
    expect(w.weeks).toHaveLength(4);
  });
});

describe('adding your own dish in setup (1.0.4)', () => {
  test('a misspelled search still finds the dish it means', () => {
    expect(similarDishes('bread popha', CATALOG).map((d) => d.id)).toContain('poha');
    expect(similarDishes('popha', CATALOG)[0].id).toBe('poha');
    expect(similarDishes('xyzzy', CATALOG)).toEqual([]);
  });
  test('an own dish is saved with its confirmed diet and allergens, and can be a favourite', () => {
    const d = makeCustomDish('bread poha', ['breakfast', 'snack'], { diet: 'veg', allergens: ['wheat'], onionGarlic: true, spice: 1 });
    expect(d.name).toBe('Bread Poha');
    expect(d.unverified).toBe(false);
    expect(d.slots).toEqual(['breakfast', 'snack']);
    expect(d.allergens).toContain('wheat');
    const f = family();
    f.customDishes = [d];
    f.favourites = [d.id];
    expect(cuisineFits(d, f)).toBe(true);
    const wheatFree = newMember('W', { allergies: ['wheat'] });
    expect(checkMember(d, wheatFree, TODAY).ok).toBe(false);
  });
});
