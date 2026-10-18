/// <reference types="jest" />
import { addCart, autoLog, checkPlan, cartSuggestions, editEntry, entriesForPlate, entryPeople, logMeal, shoppingNeeds, setCartBought, upsertPlan } from '@/domain/actions';
import { buildPayload, buildCard } from '@/domain/cookcard';
import { needsYearConfirmation, parseDateInput } from '@/domain/dates';
import { newFamily, newMember } from '@/domain/family';
import { recommend } from '@/domain/recommender';
import { draftWeek } from '@/state/draft';
import type { CookLanguage } from '@/domain/types';
const DATE = '2026-10-18';
function home() {
  const f = newFamily('Test kitchen', 'general');
  f.members = [newMember('Asha', { id: 'adult', roles: ['planner', 'eater'], diet: 'nonveg', spice: 2 }), newMember('Riya', { id: 'child', ageBand: 'child', diet: 'veg', spice: 1, allergies: ['milk'] })];
  return f;
}

test('UX02 conditional suggestions state the mild preparation without an unconditional fit claim', () => {
  const f = home();
  const list = recommend({ family: f, date: DATE, slot: 'dinner', count: 100 });
  const conditional = list.filter((s) => s.mildFor?.length);
  expect(conditional.length).toBeGreaterThan(0);
  for (const s of conditional) { expect(s.reason).toMatch(/Make it mild for Riya/); expect(s.reason).not.toMatch(/Fits everyone/); }
});

test.each<CookLanguage>(['en', 'hi', 'kn', 'ta', 'te'])('UX03 allergy instructions and per-option mild notes survive the cook payload in %s', (lang) => {
  const f = home();
  const cook = newMember('Meena', { roles: ['cook'], language: lang });
  const p = upsertPlan(f, DATE, 'dinner', ['dal_chawal', 'veg_manchurian']);
  const payload = buildPayload(f, cook, DATE, [p]);
  expect(payload.items[0].nt).toContain('Riya');
  const note = payload.items[0].nt!;
  const allergyWords = { en: 'Allergy', hi: 'एलर्जी', kn: 'ಅಲರ್ಜಿ', ta: 'ஒவ்வாமை', te: 'అలెర్జీ' };
  const milkWords = { en: 'milk', hi: 'दूध', kn: 'ಹಾಲು', ta: 'பால்', te: 'పాలు' };
  expect(note).toContain(allergyWords[lang]);
  expect(note).toContain(milkWords[lang]);
  const built = buildCard(f, cook, DATE, [p]);
  expect(built.text).toContain(allergyWords[lang]);
  expect(built.payload.items[0].nt).toEqual(note);
});

test('UX04 bought and archived ingredients fulfil the same plan, but not a later new need; undo restores the item', () => {
  const f = home(); f.staples = [];
  upsertPlan(f, DATE, 'breakfast', ['veg_sandwich'], { forMemberIds: ['adult'] });
  const names = cartSuggestions(f, DATE, DATE);
  expect(names).toContain('bread');
  addCart(f, names, 'plan', DATE, DATE);
  const bread = f.cart.find((c) => c.name === 'bread')!;
  bread.done = true;
  expect(cartSuggestions(f, DATE, DATE)).not.toContain('bread');
  bread.archived = true;
  expect(cartSuggestions(f, DATE, DATE)).not.toContain('bread');
  upsertPlan(f, '2026-10-22', 'breakfast', ['veg_sandwich'], { forMemberIds: ['adult'] });
  expect(cartSuggestions(f, '2026-10-22', '2026-10-22')).toContain('bread');
  bread.done = false; bread.archived = false;
  expect(f.cart.filter((c) => !c.done).map((c) => c.name)).toContain('bread');
});

test('UX10/11 ingredient review attributes all source meals and respects the selected period', () => {
  const f = home(); f.staples = [];
  upsertPlan(f, DATE, 'breakfast', ['veg_sandwich'], { forMemberIds: ['adult'] });
  upsertPlan(f, '2026-10-24', 'breakfast', ['veg_sandwich'], { forMemberIds: ['adult'] });
  expect(shoppingNeeds(f, DATE, '2026-10-20').find((n) => n.name === 'bread')?.meals).toHaveLength(1);
  const week = shoppingNeeds(f, DATE, '2026-10-24').find((n) => n.name === 'bread')!;
  expect(week.meals).toHaveLength(2);
  addCart(f, ['bread'], 'plan', DATE, '2026-10-24');
  expect(f.cart[0].needKeys).toHaveLength(2);
});

test('UX06 adult-only logs do not close family plans or replace family auto logs', () => {
  const f = home();
  const p = upsertPlan(f, DATE, 'dinner', ['dal_chawal']);
  logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['dal_chawal'], plannedId: p.id, via: 'auto', confirmed: false });
  p.status = 'planned';
  const e = logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['rajma_chawal'], forMemberIds: ['adult'], via: 'manual', plannedId: p.id });
  expect(entryPeople(f, e)).toEqual(['adult']);
  expect(e.plannedId).toBeUndefined();
  expect(p.status).toBe('planned');
  expect(f.entries).toHaveLength(2);
  expect(entriesForPlate(f, DATE, 'dinner', undefined, ['adult'])).toEqual([e]);
  expect(entriesForPlate(f, DATE, 'dinner', undefined, ['child'])).toHaveLength(0);
});

test('UX06 correcting diners detaches a family plan, removes other people’s reactions and keeps entry identity', () => {
  const f = home();
  const p = upsertPlan(f, DATE, 'dinner', ['dal_chawal']);
  const e = logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['dal_chawal'], via: 'manual', plannedId: p.id });
  e.reactions = [{ memberId: 'child', kind: 'loved' }];
  editEntry(f, e.id, { forMemberIds: ['adult'] });
  expect(e.forMemberIds).toEqual(['adult']);
  expect(e.plannedId).toBeUndefined();
  expect(e.reactions).toEqual([]);
  expect(p.status).toBe('skipped');
});

test('UX06 a single adult log does not suppress the pending family auto-log', () => {
  const f = home();
  upsertPlan(f, DATE, 'dinner', ['dal_chawal']);
  logMeal(f, { date: DATE, slot: 'dinner', dishIds: ['rajma_chawal'], forMemberIds: ['adult'], via: 'manual' });
  expect(autoLog(f, new Date(2026, 9, 18, 23))).toBe(1);
  expect(f.entries).toHaveLength(2);
});

test('UX07 an empty past week has no invented meals and does not mutate the household', () => {
  const f = home(); const before = JSON.stringify(f);
  expect(draftWeek(f, '2026-10-05', DATE).every((d) => !d.cells.length)).toBe(true);
  expect(JSON.stringify(f)).toBe(before);
});

test('UX07 past days distinguish confirmed, unconfirmed and planned records', () => {
  const f = home();
  logMeal(f, { date: '2026-10-11', slot: 'dinner', dishIds: ['rajma_chawal'], via: 'manual', forMemberIds: ['adult'] });
  logMeal(f, { date: '2026-10-12', slot: 'lunch', dishIds: ['dal_chawal'], via: 'auto', confirmed: false });
  upsertPlan(f, '2026-10-13', 'lunch', ['dal_chawal']);
  const week = draftWeek(f, '2026-10-11', DATE);
  expect(week[0].cells[0].status).toBe('Logged');
  expect(week[0].cells[0].memberIds).toEqual(['adult']);
  expect(week[1].cells[0].status).toBe('Needs confirmation');
  expect(week[2].cells[0].status).toBe('Planned');
  expect(week.slice(3).every((d) => !d.cells.length)).toBe(true);
});

test('UX09 a week is varied, preserves pinned choices, passes hard rules and leaves no virtual plans behind', () => {
  const f = home();
  f.settings.planSlots = ['lunch', 'dinner'];
  upsertPlan(f, '2026-10-20', 'dinner', ['dal_chawal'], { pinned: true });
  const before = JSON.stringify(f);
  const week = draftWeek(f, '2026-10-19', DATE);
  const dinners = week.map((d) => d.cells.find((c) => c.slot === 'dinner')!);
  expect(dinners[1].options[0]).toBe('dal_chawal');
  expect(new Set(dinners.map((d) => d.options[0])).size).toBeGreaterThanOrEqual(5);
  for (const d of week) for (const r of d.cells) for (const id of r.options) expect(checkPlan(f, d.date, r.slot, [id], { memberId: r.memberId, forMemberIds: r.memberIds }).problems).toEqual([]);
  expect(JSON.stringify(f)).toBe(before);
});

test('UX16 omitted years require explicit confirmation when the inferred year differs', () => {
  const parsed = parseDateInput('19 Oct', DATE)!;
  expect(parsed).toBe('2025-10-19');
  expect(needsYearConfirmation('19 Oct', parsed, DATE)).toBe(true);
  expect(needsYearConfirmation('19 Oct 2025', parsed, DATE)).toBe(false);
  expect(needsYearConfirmation('12 Oct', '2026-10-12', DATE)).toBe(false);
});


test('UX04 ticking a legacy open item captures the plans it fulfils', () => {
  const f = home(); f.staples = [];
  upsertPlan(f, DATE, 'breakfast', ['veg_sandwich'], { forMemberIds: ['adult'] });
  f.cart.push({ id: 'legacy', name: 'bread', done: false, source: 'plan' });
  setCartBought(f, 'legacy', true, DATE, DATE);
  expect(cartSuggestions(f, DATE, DATE)).not.toContain('bread');
  expect(f.cart[0].needKeys).toHaveLength(1);
});


test('UX06 correcting a tiffin child changes attribution even if the caller kept the old diner IDs', () => {
  const f = home();
  f.members.push(newMember('Aarav', { id: 'other-child', ageBand: 'child' }));
  const e = logMeal(f, { date: DATE, slot: 'tiffin_lunch', memberId: 'child', forMemberIds: ['child'], dishIds: ['dal_chawal'], via: 'manual' });
  editEntry(f, e.id, { memberId: 'other-child', forMemberIds: ['child'] });
  expect(entryPeople(f, e)).toEqual(['other-child']);
  expect(entriesForPlate(f, DATE, 'tiffin_lunch', 'child')).toEqual([]);
  expect(entriesForPlate(f, DATE, 'tiffin_lunch', 'other-child')).toEqual([e]);
});

test('UX06 a logged tiffin belongs to its selected child even when stale diner IDs are supplied', () => {
  const f = home();
  const e = logMeal(f, { date: DATE, slot: 'tiffin_lunch', memberId: 'child', forMemberIds: ['adult'], dishIds: ['dal_chawal'], via: 'manual' });
  expect(entryPeople(f, e)).toEqual(['child']);
});
