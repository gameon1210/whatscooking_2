import { checkPlan, planSeparateDish, separatePlateChoice, upsertPlan } from '@/domain/actions';
import { CATALOG_BY_ID } from '@/domain/catalog';
import { newFamily, newMember } from '@/domain/family';
import { planningPlates, recommend } from '@/domain/recommender';
import { draftDay } from '@/state/draft';

const date = '2026-11-05';
const omelette = CATALOG_BY_ID.bread_omelette;

function mixedFamily() {
  const family = newFamily('Test kitchen', 'general');
  family.members = [newMember('Vegetarian diner', { id: 'veg' }), newMember('Egg eater', { id: 'egg', diet: 'egg' })];
  return family;
}

test('a separate omelette keeps the original breakfast for the vegetarian diner', () => {
  const family = mixedFamily();
  const shared = upsertPlan(family, date, 'breakfast', ['poha']);
  expect(checkPlan(family, date, 'breakfast', [omelette.id]).ok).toEqual([]);
  expect(separatePlateChoice(family, date, 'breakfast', omelette)?.eligible.map((member) => member.id)).toEqual(['egg']);

  const result = planSeparateDish(family, date, 'breakfast', omelette.id, ['egg']);
  expect(result.plan).toMatchObject({ memberId: 'egg', forMemberIds: ['egg'], options: [omelette.id] });
  expect(shared).toMatchObject({ forMemberIds: ['veg'], options: ['poha'] });
  const rows = draftDay(family, date).filter((row) => row.slot === 'breakfast');
  expect(rows.map((row) => row.memberIds)).toEqual([['veg'], ['egg']]);
});

test('a newly added egg allergy invalidates an open separate-plate confirmation', () => {
  const family = mixedFamily();
  family.members[1].allergies = ['egg'];
  expect(planSeparateDish(family, date, 'breakfast', omelette.id, ['egg']).error).toMatch(/rules changed/);
  expect(family.planned).toEqual([]);
});

test('a quick nudge filters breakfast ideas even when the current meal is logged', () => {
  const family = mixedFamily();
  const plan = upsertPlan(family, date, 'breakfast', ['poha']);
  plan.status = 'cooked';
  const ctx = { family, date, slot: 'breakfast' as const, count: 100 };
  const general = planningPlates(ctx)[0].suggestions;
  const quick = planningPlates({ ...ctx, nudge: 'quick' })[0].suggestions;
  expect(general.some(({ dish }) => dish.effort > 1)).toBe(true);
  expect(quick.length).toBeGreaterThan(0);
  expect(quick.every(({ dish }) => dish.effort === 1 && dish.diet !== 'egg')).toBe(true);
  expect(plan).toMatchObject({ status: 'cooked', options: ['poha'] });
});

test('the leftover nudge uses current pantry leftovers and stops after they are finished', () => {
  const family = mixedFamily();
  family.leftovers = [{ id: 'dal', dishId: 'dal_tadka_roti', amount: 'half', date: '2026-11-04', slot: 'dinner', resolved: false }];
  const ctx = { family, date, slot: 'breakfast' as const, nudge: 'leftovers' as const };
  expect(recommend(ctx).map(({ dish }) => dish.id)).toEqual(['dal_paratha']);
  family.leftovers[0].resolved = true;
  expect(recommend(ctx)).toEqual([]);
});
