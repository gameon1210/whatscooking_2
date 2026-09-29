// Voice / text log parser (FR-220): English, Hindi and Hinglish, plus common
// South Indian words. Keyboard dictation (Gboard, iOS) produces the text.
import type { Dish, SlotId } from './types';
import { addDays } from './dates';

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

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function matchDish(phrase: string, dishes: Dish[]): Dish | undefined {
  const p = norm(phrase);
  if (!p) return undefined;
  let best: { d: Dish; score: number } | undefined;
  for (const d of dishes) {
    const names = [d.name, ...d.aliases].map(norm);
    for (const n of names) {
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
  const t = ` ${text.toLowerCase()} `;
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
  const clauses = text
    .split(/[.;\n]|,?\s+(?:aur\s+|and\s+)?(?=(?:aaj|kal|today|yesterday|parso)\b)/i)
    .map((c) => (c ?? '').trim())
    .filter((c) => c.length > 1);
  const out = clauses.map((c) => parseLog(c, dishes, today, now)).filter((r) => r.dishIds.length || r.unknown.length);
  return out.length ? out : [parseLog(text, dishes, today, now)];
}
