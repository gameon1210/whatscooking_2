// Cook Card (FR-230..236): WhatsApp text in the cook's language, headcount-scaled
// quantities, ranked choices, and a link to the no-login Cook page.
import { shortDate } from './dates';
import { dishById } from './recommender';
import type { CookLanguage, Dish, Family, Member, PlannedMeal, SlotId } from './types';

interface Strings {
  hello: (n: string) => string;
  menu: (date: string, n: number) => string;
  slots: Record<SlotId, string>;
  ranks: [string, string, string];
  qty: string;
  reply: string;
  forWho: (n: string) => string;
}

// Translations are short and plain; please have a native speaker review them.
export const COOK_STRINGS: Record<CookLanguage, Strings> = {
  en: {
    hello: (n) => `Namaste ${n}!`,
    menu: (d, n) => `Menu for ${d} · ${n} people`,
    slots: { breakfast: 'Breakfast', tiffin_short: 'Short-break box', tiffin_lunch: 'Lunch box', lunch: 'Lunch', snack: 'Evening snack', dinner: 'Dinner' },
    ranks: ['1st choice', '2nd choice', 'Backup'],
    qty: 'Quantities',
    reply: 'Tap to reply (OK / missing item / change):',
    forWho: (n) => `for ${n}`,
  },
  hi: {
    hello: (n) => `नमस्ते ${n}!`,
    menu: (d, n) => `${d} का मेनू · ${n} लोग`,
    slots: { breakfast: 'नाश्ता', tiffin_short: 'छोटा टिफ़िन', tiffin_lunch: 'लंच बॉक्स', lunch: 'दोपहर का खाना', snack: 'शाम का नाश्ता', dinner: 'रात का खाना' },
    ranks: ['पहली पसंद', 'दूसरी पसंद', 'बैकअप'],
    qty: 'मात्रा',
    reply: 'जवाब देने के लिए टैप करें (ठीक है / सामान नहीं है / बदलें):',
    forWho: (n) => `${n} के लिए`,
  },
  kn: {
    hello: (n) => `ನಮಸ್ಕಾರ ${n}!`,
    menu: (d, n) => `${d} ಮೆನು · ${n} ಜನ`,
    slots: { breakfast: 'ತಿಂಡಿ', tiffin_short: 'ಸಣ್ಣ ಡಬ್ಬಿ', tiffin_lunch: 'ಊಟದ ಡಬ್ಬಿ', lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟ', snack: 'ಸಂಜೆ ತಿಂಡಿ', dinner: 'ರಾತ್ರಿ ಊಟ' },
    ranks: ['ಮೊದಲ ಆಯ್ಕೆ', 'ಎರಡನೇ ಆಯ್ಕೆ', 'ಬದಲಿ'],
    qty: 'ಪ್ರಮಾಣ',
    reply: 'ಉತ್ತರಿಸಲು ಒತ್ತಿ (ಸರಿ / ಸಾಮಾನು ಇಲ್ಲ / ಬದಲಾಯಿಸಿ):',
    forWho: (n) => `${n}ಗೆ`,
  },
  ta: {
    hello: (n) => `வணக்கம் ${n}!`,
    menu: (d, n) => `${d} மெனு · ${n} பேர்`,
    slots: { breakfast: 'காலை உணவு', tiffin_short: 'சிறிய டிபன்', tiffin_lunch: 'மதிய டிபன்', lunch: 'மதிய உணவு', snack: 'மாலை சிற்றுண்டி', dinner: 'இரவு உணவு' },
    ranks: ['முதல் தேர்வு', 'இரண்டாவது', 'மாற்று'],
    qty: 'அளவு',
    reply: 'பதில் அனுப்ப தட்டவும் (சரி / பொருள் இல்லை / மாற்று):',
    forWho: (n) => `${n}க்கு`,
  },
  te: {
    hello: (n) => `నమస్తే ${n}!`,
    menu: (d, n) => `${d} మెనూ · ${n} మంది`,
    slots: { breakfast: 'టిఫిన్', tiffin_short: 'చిన్న డబ్బా', tiffin_lunch: 'లంచ్ బాక్స్', lunch: 'మధ్యాహ్న భోజనం', snack: 'సాయంత్రం స్నాక్స్', dinner: 'రాత్రి భోజనం' },
    ranks: ['మొదటి ఎంపిక', 'రెండవది', 'బ్యాకప్'],
    qty: 'పరిమాణం',
    reply: 'జవాబు కోసం నొక్కండి (సరే / సామాను లేదు / మార్చండి):',
    forWho: (n) => `${n} కోసం`,
  },
};

export const LANG_LABEL: Record<CookLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी Hindi',
  kn: 'ಕನ್ನಡ Kannada',
  ta: 'தமிழ் Tamil',
  te: 'తెలుగు Telugu',
};

function nice(n: number): string {
  const whole = Math.floor(n);
  const frac = n - whole;
  const f = frac < 0.13 ? '' : frac < 0.38 ? '¼' : frac < 0.63 ? '½' : frac < 0.88 ? '¾' : '';
  const w = frac >= 0.88 ? whole + 1 : whole;
  if (!w && !f) return '¼';
  return `${w || ''}${f}`;
}

export function quantities(dish: Dish, people: number): string {
  if (!dish.qty?.length) return '';
  return dish.qty
    .map((q) => {
      const total = q.perPerson * people;
      const amount = q.unit === 'g' ? `${Math.round(total / 50) * 50} g` : `${nice(total)} ${q.unit}${total > 1 && !q.unit.includes('/') ? 's' : ''}`;
      return `${q.item} ${amount}`;
    })
    .join(', ');
}

export interface CookItem {
  k: string; // plannedMeal id
  t: string; // slot label in cook language
  w?: string; // who (tiffin child)
  o: string[]; // ranked dish names
  q?: string; // quantities for 1st choice
}

export interface CookPayload {
  v: 1;
  id: string;
  fam: string;
  ph: string;
  lang: CookLanguage;
  date: string;
  n: number;
  cook: string;
  items: CookItem[];
}

export function buildPayload(family: Family, cook: Member, date: string, meals: PlannedMeal[]): CookPayload {
  const lang = cook.language ?? 'en';
  const S = COOK_STRINGS[lang];
  const people = family.members.filter((m) => m.eatsAtHome && m.roles.includes('eater')).length || 1;
  const items: CookItem[] = meals.map((p) => {
    const dishes = p.options.map((id) => dishById(family, id)).filter(Boolean) as Dish[];
    const who = p.memberId ? family.members.find((m) => m.id === p.memberId)?.name : undefined;
    const n = p.memberId ? 1 : people;
    return { k: p.id, t: S.slots[p.slot], w: who, o: dishes.map((x) => x.name), q: dishes[0] ? quantities(dishes[0], n) : '' };
  });
  return {
    v: 1,
    id: date.replace(/-/g, '') + Math.random().toString(36).slice(2, 6),
    fam: family.name,
    ph: (family.settings.plannerPhone ?? '').replace(/\D/g, ''),
    lang,
    date: shortDate(date),
    n: people,
    cook: cook.name,
    items,
  };
}

// UTF-8 safe base64url, no platform globals needed.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    let c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else {
      out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      c = 0;
    }
  }
  return out;
}

export function b64url(s: string): string {
  const b = utf8(s);
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < b.length) out += B64[(n >> 6) & 63];
    if (i + 2 < b.length) out += B64[n & 63];
  }
  return out;
}

export function cookPageUrl(base: string, payload: CookPayload): string {
  return `${base}#d=${b64url(JSON.stringify(payload))}`;
}

export function cookCardText(family: Family, cook: Member, payload: CookPayload, url: string): string {
  const S = COOK_STRINGS[payload.lang];
  const lines: string[] = [S.hello(cook.name.split(' ')[0]), S.menu(payload.date, payload.n), ''];
  for (const it of payload.items) {
    lines.push(`*${it.t}*${it.w ? ` (${S.forWho(it.w)})` : ''}`);
    it.o.forEach((name, i) => lines.push(`  ${i === 0 ? '✅' : i === 1 ? '2️⃣' : '↩️'} ${S.ranks[i]}: ${name}`));
    if (it.q) lines.push(`  ⚖️ ${S.qty}: ${it.q}`);
  }
  lines.push('', S.reply, url);
  return lines.join('\n');
}

export interface CookReply {
  id?: string;
  picks: Record<string, number>; // plannedMeal id -> rank index chosen
  missing: Record<string, string[]>;
  change: string[];
  stop: boolean;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Parse the message the Cook page sends back over WhatsApp. */
export function parseCookReply(text: string): CookReply {
  const r: CookReply = { picks: {}, missing: {}, change: [], stop: false };
  const id = text.match(/WC:([A-Za-z0-9]+)/);
  if (id) r.id = id[1];
  if (/\bSTOP\b/.test(text)) r.stop = true;
  for (const m of text.matchAll(/#([A-Za-z0-9_]+)=(.+?)(?=\s+#|\s*$)/gm)) {
    const key = m[1];
    const val = m[2].trim();
    if (/^\d$/.test(val)) r.picks[key] = Number(val) - 1;
    else if (val === 'C') r.change.push(key);
    else if (val.startsWith('M:')) r.missing[key] = safeDecode(val.slice(2)).split(',').map((x) => x.trim()).filter(Boolean);
  }
  return r;
}
