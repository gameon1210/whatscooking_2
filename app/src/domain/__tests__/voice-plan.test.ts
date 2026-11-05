import { upsertPlan } from '@/domain/actions';
import { newFamily, newMember } from '@/domain/family';
import { parseSpokenPlan, reviewAiPlan, saveSpokenPlan } from '@/domain/voice-plan';

const today = '2026-11-05';
const friday = '2026-11-06';
const monday = '2026-11-09';
const tuesday = '2026-11-10';
const now = new Date(2026, 10, 5, 9, 0);

test('understands several meals on one day and weekdays across a selected week', () => {
  expect(parseSpokenPlan('Breakfast poha, lunch rajma chawal', friday, friday, today).meals).toEqual([
    { date: friday, slot: 'breakfast', dish: 'poha' },
    { date: friday, slot: 'lunch', dish: 'rajma chawal' },
  ]);
  expect(parseSpokenPlan('Monday lunch rajma chawal and Tuesday dinner palak paneer', friday, '2026-11-12', today).meals).toEqual([
    { date: monday, slot: 'lunch', dish: 'rajma chawal' },
    { date: tuesday, slot: 'dinner', dish: 'palak paneer' },
  ]);
});

test('understands a Hindi dictation with multiple meals and catches dates outside the range', () => {
  expect(parseSpokenPlan('कल नाश्ता पोहा, दोपहर राजमा चावल', friday, friday, today).meals).toEqual([
    { date: friday, slot: 'breakfast', dish: 'पोहा' },
    { date: friday, slot: 'lunch', dish: 'राजमा चावल' },
  ]);
  expect(parseSpokenPlan('Monday lunch rajma', friday, friday, today)).toMatchObject({
    meals: [],
    issues: [expect.stringContaining('outside the selected dates')],
  });
});

test('rejects invalid AI output and keeps only the last choice in a slot', () => {
  const { meals, issues } = reviewAiPlan({ meals: [
    { date: friday, slot: 'breakfast', dish: 'Poha' },
    { date: friday, slot: 'breakfast', dish: 'Idli' },
    { date: '2026-11-31', slot: 'breakfast', dish: 'Poha' },
    { date: friday, slot: 'tiffin_short', dish: 'Poha' },
    { date: monday, slot: 'breakfast', dish: 'Poha' },
  ] }, friday, friday);
  expect(meals).toEqual([{ date: friday, slot: 'breakfast', dish: 'Idli' }]);
  expect(issues).toHaveLength(3);
});

test('an unapproved replacement or unsafe dish leaves the whole selection unsaved', () => {
  const family = newFamily('Test kitchen', 'general');
  family.members = [newMember('Vegetarian diner')];
  const existing = upsertPlan(family, friday, 'breakfast', ['poha']);
  const breakfast = { date: friday, slot: 'breakfast' as const, dishId: 'idli_sambar' };
  const future = { date: monday, slot: 'breakfast' as const, dishId: 'poha' };
  expect(() => saveSpokenPlan(family, [future, breakfast], now)).toThrow(/review the replacement/i);
  expect(() => saveSpokenPlan(family, [future, { ...breakfast, dishId: 'bread_omelette', replacePlanId: existing.id }], now)).toThrow(/veg/i);
  expect(family.planned).toEqual([existing]);
  expect(existing.options).toEqual(['poha']);
  saveSpokenPlan(family, [future, { ...breakfast, replacePlanId: existing.id }], now);
  expect(existing).toMatchObject({ options: ['idli_sambar'], pinned: true });
  expect(family.planned[1]).toMatchObject({ options: ['poha'], pinned: true });
});
