// Canonical allergen model (FR-211, QA D01/D14).
// One ingredient list per dish feeds allergy checks, shopping and quantities.
// The word lists are a household guide, not a medical reference: when a dish's
// ingredients aren't known (an unconfirmed custom dish) it is never shown as safe.
import type { Dish } from './types';

export type Allergen = 'milk' | 'wheat' | 'peanut' | 'nuts' | 'egg' | 'soy' | 'fish' | 'sesame' | 'coconut' | 'mustard';

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  milk: 'Milk / dairy',
  wheat: 'Wheat / gluten',
  peanut: 'Peanut',
  nuts: 'Tree nuts',
  egg: 'Egg',
  soy: 'Soy',
  fish: 'Fish / seafood',
  sesame: 'Sesame',
  coconut: 'Coconut',
  mustard: 'Mustard',
};

/** Words in a dish name or ingredient that mean the allergen is present. */
const SOURCES: Record<Allergen, string[]> = {
  milk: ['milk', 'paneer', 'curd', 'dahi', 'cheese', 'cream', 'butter', 'ghee', 'kheer', 'raita', 'makhani', 'kadhi', 'khoya', 'malai', 'lassi', 'chai', 'yogurt', 'yoghurt', 'buttermilk',
    // world cuisines (1.0.4)
    'mozzarella', 'parmesan', 'feta', 'ricotta', 'halloumi', 'tzatziki', 'pesto', 'alfredo', 'quesadilla'],
  wheat: [
    'atta', 'wheat', 'maida', 'bread', 'pav', 'roti', 'paratha', 'parantha', 'naan', 'puri', 'poori', 'kulcha', 'kulche', 'rava', 'semolina', 'sooji', 'suji',
    'dalia', 'daliya', 'vermicelli', 'semiya', 'pasta', 'noodles', 'khakhra', 'thepla', 'chapati', 'parotta', 'toast', 'sandwich', 'frankie', 'roll', 'samosa',
    'bhature', 'cutlet', 'breadcrumbs', 'seitan',
    // world cuisines (1.0.4)
    'pizza', 'lasagne', 'lasagna', 'macaroni', 'spaghetti', 'penne', 'couscous', 'tortilla', 'tortillas', 'pita', 'udon', 'ramen', 'filo', 'panko',
    'teriyaki', 'gochujang', 'soy sauce', 'burrito', 'quesadilla', 'momo', 'momos', 'dumplings', 'manchurian',
  ],
  peanut: ['peanut', 'peanuts', 'groundnut', 'chikki'],
  nuts: ['cashew', 'almond', 'badam', 'kaju', 'pista', 'pistachio', 'walnut', 'dry fruits', 'nuts', 'pesto'],
  egg: ['egg', 'eggs', 'anda', 'omelette', 'mayonnaise'],
  soy: ['soy', 'soya', 'tofu', 'miso', 'edamame', 'tempeh', 'teriyaki', 'gochujang'],
  fish: ['fish', 'prawn', 'prawns', 'shrimp', 'crab', 'meen', 'machli', 'anchovy', 'tuna', 'salmon', 'bonito'],
  sesame: ['sesame', 'til', 'gingelly', 'tahini', 'hummus'],
  coconut: ['coconut'],
  mustard: ['mustard'],
};

/** What a user might type in "Allergies" -> canonical allergens. */
const USER_TERMS: [RegExp, Allergen[]][] = [
  [/^(milk|dairy|lactose|doodh|paneer|curd|dahi|cheese|ghee|butter)$/, ['milk']],
  [/^(wheat|gluten|atta|maida)$/, ['wheat']],
  [/^(peanuts?|groundnuts?|moongphali)$/, ['peanut']],
  [/^(nuts?|tree ?nuts?|cashews?|almonds?|walnuts?|dry ?fruits?)$/, ['nuts', 'peanut']],
  [/^(eggs?|anda)$/, ['egg']],
  [/^(soy|soya|tofu)$/, ['soy']],
  [/^(fish|seafood|shellfish|prawns?|shrimp|crab)$/, ['fish']],
  [/^(sesame|til)$/, ['sesame']],
  [/^(coconut)$/, ['coconut']],
  [/^(mustard|sarson)$/, ['mustard']],
];

export function canonicalAllergens(term: string): Allergen[] {
  const t = term.trim().toLowerCase();
  for (const [re, list] of USER_TERMS) if (re.test(t)) return list;
  return [];
}

const clean = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();

/** Every ingredient the app knows for a dish: shopping items, vegetables, quantities and hidden ones. */
export function allIngredients(dish: Dish): string[] {
  const out = new Set<string>();
  for (const i of [...dish.ingredients, ...dish.veg, ...(dish.hidden ?? [])]) out.add(clean(i));
  for (const q of dish.qty ?? []) for (const part of q.item.split('+')) out.add(clean(part));
  out.delete('');
  return [...out];
}

/** Ingredients to buy: everything except the hidden cooking fats. */
export function shoppingIngredients(dish: Dish): string[] {
  const hidden = new Set((dish.hidden ?? []).map(clean));
  return allIngredients(dish).filter((i) => !hidden.has(i));
}

const hasWord = (hay: string, word: string) => new RegExp(`(^|[^a-z])${word.replace(/ /g, '\\s+')}([^a-z]|$)`).test(hay);

export function deriveAllergens(dish: Dish): Allergen[] {
  const hay = [dish.name, ...allIngredients(dish)].join(' | ').toLowerCase();
  const out = new Set<Allergen>();
  for (const a of Object.keys(SOURCES) as Allergen[]) {
    if (SOURCES[a].some((w) => hasWord(hay, w))) out.add(a);
  }
  if (dish.groups.includes('dairy')) out.add('milk');
  if (dish.diet === 'egg') out.add('egg');
  for (const free of dish.allergenFree ?? []) out.delete(free as Allergen);
  return [...out];
}

export function dishAllergens(dish: Dish): string[] {
  return dish.allergens ?? deriveAllergens(dish);
}

/**
 * Does this dish clash with what the member avoids? Returns the reason word, or null.
 * `strict` terms are allergies: an unconfirmed dish is treated as a clash.
 */
export function avoidHit(dish: Dish, term: string, strict: boolean): string | null {
  const t = term.trim().toLowerCase();
  if (!t) return null;
  if (strict && dish.unverified) return `${t} (ingredients not confirmed)`;
  const canon = canonicalAllergens(t);
  const present = dishAllergens(dish);
  if (canon.length) return canon.some((a) => present.includes(a)) ? t : null;
  // Anything else ("mushroom", "brinjal") is matched by name over the full ingredient list.
  const stem = t.replace(/s$/, '');
  const hay = [dish.name, ...dish.aliases, ...allIngredients(dish)].join(' | ').toLowerCase();
  if (stem.length >= 3 && hay.includes(stem)) return t;
  return null;
}
