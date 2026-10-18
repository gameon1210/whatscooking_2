// Voice / text log parser (FR-220): English, Hindi and Hinglish, plus common
// South Indian words. Keyboard dictation (Gboard, iOS) produces the text.
import type { Dish, SlotId } from './types';
import { addDays } from './dates';
import { HINDI_WORDS, localAliases } from './i18n';

export interface ParsedLog {
  date: string;
  slot: SlotId;
  dishIds: string[];
  unknown: string[];
}

const SLOT_WORDS: [RegExp, SlotId][] = [
  [/\b(breakfast|nashta|nashte|naashta|subah|morning|tiffin nashta|tindi|tiffin in the morning)\b/i, 'breakfast'],
  [/\b(short break|snack box|chhota dabba|small box)\b/i, 'tiffin_short'],
  [/\b(lunch ?box|tiffin|dabba|dabbe)\b/i, 'tiffin_lunch'],
  [/\b(lunch|dopahar|dupahar|afternoon|oota)\b/i, 'lunch'],
  [/\b(snack|shaam|evening|chai time)\b/i, 'snack'],
  [/\b(dinner|raat|night|supper)\b/i, 'dinner'],
];

const SPLIT = /\s*(?:,|\+|&|\band\b|\baur\b|\bwith\b|\bke saath\b|\bsaath\b|\bmattu\b|\bmatthu\b|\bsang\b|\bthen\b)\s*/i;

const FILLER =
  /\b(aaj|today|kal|yesterday|parso|made|banaya|banayi|banaye|bana|khaya|khaye|ate|had|we|for|the|a|mein|me|ka|ki|ke|tha|thi|the|hua|hui|breakfast|nashta|naashta|lunch|dinner|raat|subah|dopahar|shaam|morning|evening|night|tiffin|dabba|lunchbox|lunch box|snack|kiya|cooked|i|and|also|bhi|just|only|was|were)\b/gi;

/** Unicode-aware: keeps letters and vowel signs of every script (D20). */
function norm(s: string) {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Swap Indic-script day, meal and filler words for the Latin ones the parser knows. */
function latiniseWords(text: string): string {
  return text
    .normalize('NFC')
    .split(/(\s+|[,.;।])/)
    .map((tok) => HINDI_WORDS[tok.normalize('NFC')] ?? tok)
    .join('');
}

const nameCache = new WeakMap<Dish, string[]>();
function namesOf(d: Dish): string[] {
  let n = nameCache.get(d);
  if (!n) {
    n = [d.name, ...d.aliases, ...localAliases(d.id)].map(norm);
    nameCache.set(d, n);
  }
  return n;
}

export function matchDish(phrase: string, dishes: Dish[]): Dish | undefined {
  const p = norm(phrase);
  if (!p) return undefined;
  let best: { d: Dish; score: number } | undefined;
  for (const d of dishes) {
    for (const n of namesOf(d)) {
      let score = 0;
      if (n === p) score = 100;
      else if (n.startsWith(p + ' ') || p.startsWith(n + ' ') || n === p + 's') score = 80;
      else if (
        p.length >= 4 &&
        (n.includes(p) || p.includes(n)) &&
        Math.min(p.length, n.length) / Math.max(p.length, n.length) >= 0.5
      )
        score = 60 - Math.abs(n.length - p.length);
      else {
        const pw = p.split(' ');
        const nw = n.split(' ');
        const common = pw.filter((w) => w.length > 2 && nw.includes(w)).length;
        if (common) score = 30 + common * 10 - Math.abs(nw.length - pw.length) * 3;
      }
      if (score > (best?.score ?? 0)) best = { d, score };
    }
  }
  return best && best.score >= 40 ? best.d : undefined;
}

export function parseLog(text: string, dishes: Dish[], today: string, now = new Date()): ParsedLog {
  const t = ` ${latiniseWords(text).toLowerCase()} `;
  let date = today;
  if (/\b(kal|yesterday|kaal|ninne)\b/.test(t)) date = addDays(today, -1);
  if (/\b(parso|day before)\b/.test(t)) date = addDays(today, -2);

  let slot: SlotId | undefined;
  for (const [re, s] of SLOT_WORDS) {
    if (re.test(t)) {
      slot = s;
      break;
    }
  }
  if (!slot) {
    const h = now.getHours();
    slot = h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner';
  }

  const cleaned = t.replace(FILLER, ' ');
  const parts = cleaned.split(SPLIT).map((x) => x.trim()).filter(Boolean);
  const dishIds: string[] = [];
  const unknown: string[] = [];

  // Try the whole cleaned phrase first ("rajma chawal"), then pieces.
  const whole = matchDish(cleaned, dishes);
  if (whole && parts.length <= 1) dishIds.push(whole.id);
  else
    for (const part of parts) {
      const m = matchDish(part, dishes);
      if (m) {
        if (!dishIds.includes(m.id)) dishIds.push(m.id);
      } else if (part.length > 2) unknown.push(part);
    }
  return { date, slot, dishIds, unknown };
}

/** Several clauses in one utterance: "kal raat khichdi aur papad, aaj subah idli". */
export function parseLogs(text: string, dishes: Dish[], today: string, now = new Date()): ParsedLog[] {
  const clauses = latiniseWords(text)
    .split(/[.;।\n]|,?\s+(?:aur\s+|and\s+)?(?=(?:aaj|kal|today|yesterday|parso)\b)/i)
    .map((c) => (c ?? '').trim())
    .filter((c) => c.length > 1);
  const out = clauses.map((c) => parseLog(c, dishes, today, now)).filter((r) => r.dishIds.length || r.unknown.length);
  return out.length ? out : [parseLog(text, dishes, today, now)];
}

/** Edit distance, capped: returns cap+1 as soon as it can't be within `cap`. */
function editDistance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Dishes whose name is close to a misspelled search ("popha" → Poha, "panner" → paneer dishes),
 * for "Did you mean…?" (1.0.4). Each typed word of 3+ letters may be off by one letter
 * (two for 6+ letters). Best matches first.
 */
export function similarDishes(query: string, dishes: Dish[], max = 3): Dish[] {
  const words = norm(query).split(' ').filter((w) => w.length >= 3);
  if (!words.length) return [];
  const scored: { d: Dish; score: number }[] = [];
  for (const d of dishes) {
    const tokens = [...new Set(namesOf(d).flatMap((n) => n.split(' ')))];
    let score = 0;
    for (const w of words) {
      const cap = w.length >= 6 ? 2 : 1;
      let best = cap + 1;
      for (const t of tokens) best = Math.min(best, t === w ? 0 : editDistance(w, t, cap));
      // A corrected typo counts for more than a plain word match: it's the word the search missed.
      if (best <= cap) score += best === 0 ? 1 : 2 - best / (cap + 1);
    }
    if (score > 0) scored.push({ d, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.d.name.length - b.d.name.length).slice(0, max).map((x) => x.d);
}
