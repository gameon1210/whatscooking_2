// Free-text preferences (FR-217) -> visible soft weights. The rules-based parser
// always runs; the LLM (optional) can refine it.
import type { Dish, PrefTag, Preference } from './types';

type Weights = Partial<Record<PrefTag, number>>;

interface TagRule {
  re: RegExp;
  /** weights when the tag is mentioned plainly ("millets") */
  plain?: Weights;
  /** "more / love / prefer ..." */
  up: Weights;
  /** "no / less / avoid ..." (D19: negation flips the meaning) */
  down: Weights;
}

const RULES: TagRule[] = [
  { re: /\b(health(y|ier)|nutritious|light(er)? food|clean eating)\b/i, plain: { healthy: 8, fried: -8 }, up: { healthy: 8, fried: -8 }, down: { healthy: -4 } },
  { re: /\b(spic(y|e|ier)|hot|mirch|teekha|chill?i(es)?)\b/i, plain: { spice: 6 }, up: { spice: 6 }, down: { spice: -8 } },
  { re: /\bmild(er)?\b/i, plain: { spice: -8 }, up: { spice: -8 }, down: { spice: 4 } },
  { re: /\b(deep[\s-]?fried|fried|oily|oil)\b/i, up: { fried: 6 }, down: { fried: -10 } },
  { re: /\b(maida|refined flour)\b/i, up: { maida: 4 }, down: { maida: -10 } },
  { re: /\b(millets?|ragi|jowar|bajra)\b/i, plain: { millet: 8 }, up: { millet: 8 }, down: { millet: -8 } },
  { re: /\b(greens?|leafy|palak|spinach|saag|keerai|soppu)\b/i, plain: { greens: 8 }, up: { greens: 8 }, down: { greens: -8 } },
  { re: /\b(protein|dal|pulses?|lentils?)\b/i, plain: { pulse: 6 }, up: { pulse: 6 }, down: { pulse: -6 } },
  { re: /\brice\b/i, up: { rice: 6 }, down: { rice: -8 } },
  { re: /\b(roti|chapati|wheat)\b/i, up: { roti: 6 }, down: { roti: -8 } },
  { re: /\b(quick|fast|easy|simple)\b/i, plain: { quick: 6 }, up: { quick: 6 }, down: { quick: -4 } },
  { re: /\b(light|soft|easy to digest)\b/i, plain: { light: 6 }, up: { light: 6 }, down: { light: -4 } },
  { re: /\b(chicken|non[\s-]?veg|meat|fish|eggs?)\b/i, up: { nonveg: 6 }, down: { nonveg: -6 } },
  { re: /\b(sweets?|desserts?|mithai)\b/i, plain: { sweet: 3 }, up: { sweet: 3 }, down: { sweet: -6 } },
];

const NEGATORS = /^(no|not|never|avoid|less|low|lower|fewer|reduce|reduced|without|stop|skip|cut|zero|hate|hates|dislike|dislikes|dont|don't|doesnt|doesn't|nahi|kam|bina)$/i;
const BOOSTERS = /^(more|extra|love|loves|prefer|prefers|like|likes|lots|plenty|add|increase|zyada|jyada)$/i;

/** Words in the clause before a keyword decide its direction. A negator anywhere nearby wins. */
function polarity(before: string): 'up' | 'down' | 'plain' {
  const words = before
    .toLowerCase()
    .replace(/non[\s-]?veg/g, 'nonveg')
    .split(/[^a-z']+/)
    .filter(Boolean)
    .slice(-4);
  if (words.some((w) => NEGATORS.test(w))) return 'down';
  if (words.some((w) => BOOSTERS.test(w))) return 'up';
  return 'plain';
}

const WEEKDAY_WORDS: [RegExp, number[]][] = [
  [/\bweekdays?\b/i, [1, 2, 3, 4, 5]],
  [/\bweekends?\b/i, [0, 6]],
  [/\bmondays?\b/i, [1]],
  [/\btuesdays?\b/i, [2]],
  [/\bwednesdays?\b/i, [3]],
  [/\bthursdays?\b/i, [4]],
  [/\bfridays?\b/i, [5]],
  [/\bsaturdays?\b/i, [6]],
  [/\bsundays?\b/i, [0]],
];

export function parsePreference(text: string): { weights: Weights; weekdays: number[] } {
  const weights: Weights = {};
  const clauses = text.split(/[,;.\n]|\bbut\b|\bhowever\b/i);
  for (const clause of clauses) {
    for (const rule of RULES) {
      const m = rule.re.exec(clause);
      if (!m) continue;
      const dir = polarity(clause.slice(0, m.index));
      const w = dir === 'plain' ? rule.plain : rule[dir];
      if (!w) continue;
      for (const [k, v] of Object.entries(w) as [PrefTag, number][]) {
        // The same tag named twice in one sentence counts once.
        if (weights[k] === undefined || Math.abs(v) > Math.abs(weights[k]!)) weights[k] = v;
      }
    }
  }
  const weekdays: number[] = [];
  for (const [re, days] of WEEKDAY_WORDS) if (re.test(text)) weekdays.push(...days);
  return { weights, weekdays: [...new Set(weekdays)] };
}

export const TAG_LABEL: Record<PrefTag, string> = {
  fried: 'fried food',
  spice: 'spice',
  healthy: 'healthier dishes',
  millet: 'millets',
  greens: 'greens',
  pulse: 'dal and pulses',
  light: 'light food',
  rice: 'rice dishes',
  roti: 'roti dishes',
  quick: 'quick dishes',
  nonveg: 'non-veg',
  sweet: 'sweets',
  maida: 'maida (refined flour)',
};

export function describeWeights(w: Partial<Record<PrefTag, number>>): string {
  const parts = (Object.entries(w) as [PrefTag, number][])
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${v > 0 ? 'more' : 'less'} ${TAG_LABEL[k]}`);
  return parts.length ? parts.join(', ') : 'no effect yet — try words like healthier, less spicy, millets';
}

/** How much a dish matches one tag, 0..1 */
export function tagMatch(dish: Dish, tag: PrefTag): number {
  switch (tag) {
    case 'fried':
      return dish.groups.includes('fried') ? 1 : 0;
    case 'spice':
      return dish.spice / 3;
    case 'healthy': {
      let s = 0;
      if (dish.groups.includes('greens')) s += 0.4;
      if (dish.groups.includes('millet')) s += 0.4;
      if (dish.groups.includes('pulse')) s += 0.2;
      if (dish.groups.includes('vegetable')) s += 0.2;
      if (dish.light) s += 0.2;
      if (dish.groups.includes('fried')) s -= 0.6;
      return Math.max(-1, Math.min(1, s));
    }
    case 'millet':
      return dish.groups.includes('millet') ? 1 : 0;
    case 'greens':
      return dish.groups.includes('greens') ? 1 : 0;
    case 'pulse':
      return dish.groups.includes('pulse') ? 1 : 0;
    case 'light':
      return dish.light || dish.soft ? 1 : 0;
    case 'rice':
      return dish.base === 'rice' ? 1 : 0;
    case 'roti':
      return dish.base === 'roti' ? 1 : 0;
    case 'quick':
      return dish.effort === 1 ? 1 : dish.effort === 3 ? -0.5 : 0;
    case 'nonveg':
      return dish.diet === 'nonveg' || dish.diet === 'egg' ? 1 : 0;
    case 'sweet':
      return /kheer|halwa|chikki/i.test(dish.name) ? 1 : 0;
    case 'maida':
      return /maida|pav|bread|kulch|naan|noodles|pasta|parotta|samosa|bhature|sandwich|toast/i.test([dish.name, ...dish.ingredients, ...(dish.hidden ?? [])].join(' ')) ? 1 : 0;
  }
}

export function preferenceScore(dish: Dish, prefs: Preference[], eaterIds: string[], wd: number): number {
  let total = 0;
  for (const p of prefs) {
    if (p.memberId && !eaterIds.includes(p.memberId)) continue;
    if (p.weekdays && p.weekdays.length && !p.weekdays.includes(wd)) continue;
    for (const [k, v] of Object.entries(p.weights) as [PrefTag, number][]) {
      total += v * tagMatch(dish, k);
    }
  }
  return Math.max(-15, Math.min(15, total));
}
