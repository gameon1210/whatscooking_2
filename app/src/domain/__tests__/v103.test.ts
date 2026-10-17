// 1.0.3: correcting history (R02) and undoing a skipped suggestion (#7).
import { editEntry, entriesForPlate, logMeal, recordEvent, undoEvent, upsertPlan } from '@/domain/actions';
import { newFamily, newMember } from '@/domain/family';
import type { Family } from '@/domain/types';

const DATE = '2026-10-07';
const NEXT = '2026-10-08';

function family(): Family {
  const f = newFamily('Test home', 'general');
  f.members = [newMember('Priya', { id: 'p', roles: ['planner', 'eater'], diet: 'nonveg' })];
  return f;
}

describe('editing a logged meal (R02)', () => {
  test('changing the dishes corrects the same entry, no second dinner', () => {
    const f = family();
    const e = logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual' });
    expect(editEntry(f, e.id, { dishIds: ['rajma_chawal'] })).toBe(true);
    const dinners = entriesForPlate(f, DATE, 'dinner');
    expect(dinners).toHaveLength(1);
    expect(dinners[0].dishIds).toEqual(['rajma_chawal']);
    expect(dinners[0].editedAt).toBeTruthy();
  });

  test('the linked plan follows the correction', () => {
    const f = family();
    const p = upsertPlan(f, DATE, 'dinner', ['dal_chawal']);
    const e = logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual', plannedId: p.id });
    editEntry(f, e.id, { dishIds: ['rajma_chawal'] });
    expect(f.planned.find((x) => x.id === p.id)?.chosenDishId).toBe('rajma_chawal');
  });

  test('moving it to another day detaches the old plan and attaches the new one', () => {
    const f = family();
    const today = upsertPlan(f, DATE, 'dinner', ['dal_chawal']);
    const tomorrow = upsertPlan(f, NEXT, 'dinner', ['rajma_chawal']);
    const e = logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['rajma_chawal'], via: 'manual', plannedId: today.id });
    expect(f.planned.find((x) => x.id === today.id)?.status).toBe('cooked');
    editEntry(f, e.id, { date: NEXT });
    expect(f.planned.find((x) => x.id === today.id)?.status).toBe('skipped');
    expect(f.planned.find((x) => x.id === tomorrow.id)?.status).toBe('cooked');
    expect(f.entries.find((x) => x.id === e.id)?.plannedId).toBe(tomorrow.id);
  });

  test('a meal cannot be left with no dish, and a missing meal is reported', () => {
    const f = family();
    const e = logMeal(f, { date: DATE, slot: 'lunch', dishIds: ['dal_chawal'], via: 'manual' });
    expect(editEntry(f, e.id, { dishIds: [] })).toBe(false);
    expect(f.entries[0].dishIds).toEqual(['dal_chawal']);
    expect(editEntry(f, 'nope', { dishIds: ['dal_chawal'] })).toBe(false);
  });

  test('entriesForPlate finds the meal already logged, so a second log can ask first', () => {
    const f = family();
    logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual' });
    expect(entriesForPlate(f, DATE, 'dinner')).toHaveLength(1);
    expect(entriesForPlate(f, DATE, 'lunch')).toHaveLength(0);
    expect(entriesForPlate(f, DATE, 'dinner', 'someone-else')).toHaveLength(0);
  });
});

test('Back takes back exactly the last "skipped" signal (#7)', () => {
  const f = family();
  recordEvent(f, DATE, 'dinner', 'dal_chawal', 'swiped');
  recordEvent(f, DATE, 'dinner', 'rajma_chawal', 'swiped');
  recordEvent(f, DATE, 'dinner', 'rajma_chawal', 'accepted');
  undoEvent(f, DATE, 'dinner', 'rajma_chawal', 'swiped');
  expect(f.events.map((e) => `${e.dishId}:${e.outcome}`)).toEqual(['dal_chawal:swiped', 'rajma_chawal:accepted']);
});
