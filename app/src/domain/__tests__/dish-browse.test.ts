/// <reference types="jest" />
import { CATALOG } from '@/domain/catalog';
import { browseDishes, DISH_PAGE_SIZE } from '@/domain/dish-browse';

// The user must be able to keep scrolling after the six ranked suggestions.
test('all remaining dinner dishes stay reachable after the suggestion and page boundaries', () => {
  const dinners = CATALOG.filter((d) => d.slots.includes('dinner'));
  const suggested = dinners.slice(0, 6).map((d) => d.id);
  const picked = [suggested[0], dinners[8].id];
  const rest = browseDishes(CATALOG, 'dinner', 'all', [], picked, suggested);
  expect(rest.length).toBeGreaterThan(DISH_PAGE_SIZE);
  expect(rest.slice(DISH_PAGE_SIZE).length).toBeGreaterThan(0);
  expect(new Set([...suggested, ...picked, ...rest.map((d) => d.id)])).toEqual(new Set(dinners.map((d) => d.id)));
  expect(rest.some((d) => suggested.includes(d.id) || picked.includes(d.id))).toBe(false);
});

test('a cuisine filter does not lose a dish just because it appeared among suggestions', () => {
  const id = CATALOG.find((d) => d.slots.includes('breakfast') && !d.cuisine)!.id;
  const indian = browseDishes(CATALOG, 'breakfast', 'indian', [], [], [id]);
  expect(indian.map((d) => d.id)).toContain(id);
});

test('own-dish and recent shelves retain saved dishes and ignore missing recent IDs', () => {
  const custom = { ...CATALOG[0], id: 'our_recipe', name: 'Our recipe', custom: true };
  const dishes = [...CATALOG, custom];
  expect(browseDishes(dishes, 'breakfast', 'own', [], [], []).map((d) => d.id)).toEqual(['our_recipe']);
  expect(browseDishes(dishes, 'breakfast', 'recent', [custom.id, 'gone', CATALOG[0].id], [], []).map((d) => d.id)).toEqual([custom.id, CATALOG[0].id]);
});
