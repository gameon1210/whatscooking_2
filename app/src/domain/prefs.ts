// Free-text preferences (FR-217) -> visible soft weights. The rules-based parser
// always runs; the LLM (optional) can refine it.
import type { Dish, PrefTag, Preference } from './types';

interface Pattern {
  re: RegExp;
  weights: Partial<Record<PrefTag, number>>;
}

const PATTERNS: Pattern[] = [
  { re: /\b(health(y|ier)|nutritious|light(er)? food|clean)\b/i, weights: { healthy: 8, fried: -8 } },
  { re: /\b(less|low|no|not too|mild|non)[\s-]*(spic(y|e)|hot|mirch|teekha|chilli)\b/i, weights: { spice: -8 } },
  { re: /\b(more|extra|love)[\s-]*(spic(y|e)|hot|teekha)\b/i, weights: { spice: 6 } },
  { re: /\b(less|no|avoid|reduce|fewer)[\s-]*(fried|oily|oil|deep[\s-]?fried)\b/i, weights: { fried: -10 } },
  { re: /\b(no|avoid|less)[\s-]*(maida|refined flour)\b/i, weights: { fried: -4 } },
  { re: /\bmillets?\b|\bragi\b|\bjowar\b|\bbajra\b/i, weights: { millet: 8 } },
  { re: /\b(greens?|leafy|palak|spinach|saag|keerai|soppu)\b/i, weights: { greens: 8 } },
  { re: /\b(protein|dal|pulses?|lentils?)\b/i, weights: { pulse: 6 } },
  { re: /\b(less|no|avoid)[\s-]*rice\b/i, weights: { rice: -8 } },
  { re: /\bmore[\s-]*rice\b|\brice lovers?\b/i, weights: { rice: 6 } },
  { re: /\b(less|no|avoid)[\s-]*(roti|chapati|wheat)\b/i, weights: { roti: -8 } },
  { re: /\b(quick|fast|easy|simple)\b/i, weights: { quick: 6 } },
  { re: /\b(light|soft|easy to digest)\b/i, weights: { light: 6 } },
  { re: /\b(more|love)[\s-]*(chicken|non[\s-]?veg|meat|fish|egg)\b/i, weights: { nonveg: 6 } },
  { re: /\b(less|fewer)[\s-]*(non[\s-]?veg|meat|chicken)\b/i, weights: { nonveg: -6 } },
  { re: /\b(sweet|dessert)\b/i, weights: { sweet: 3 } },
];

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

export function parsePreference(text: string): { weights: Partial<Record<PrefTag, number>>; weekdays: number[] } {
  const weights: Partial<Record<PrefTag, number>> = {};
  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      for (const [k, v] of Object.entries(p.weights) as [PrefTag, number][]) {
        weights[k] = (weights[k] ?? 0) + v;
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
