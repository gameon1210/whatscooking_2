// Cook Card (FR-230..236): WhatsApp text in the cook's language, headcount-scaled
// quantities, ranked choices, and a link to the no-login Cook page.
import { rankedOptions } from './actions';
import { fromKey, shortDate } from './dates';
import { dishName, itemName, unitName } from './i18n';
import { dishById } from './recommender';
import { checkMember, plateEaters, portions } from './rules';
import type { CookCardRecord, CookLanguage, Dish, Family, Member, PlannedMeal, SlotId } from './types';

interface Strings {
  hello: (n: string) => string;
  menu: (date: string, n: number) => string;
  slots: Record<SlotId, string>;
  ranks: [string, string, string];
  qty: string;
  reply: string;
  forWho: (n: string) => string;
  mild: (n: string) => string;
  vegan: string;
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
    mild: (n) => `Less spicy for ${n}`,
    vegan: 'Vegan: use oil. No ghee, butter, curd or milk',
  },
  hi: {
    hello: (n) => `नमस्ते ${n}!`,
    menu: (d, n) => `${d} का मेनू · ${n} लोग`,
    slots: { breakfast: 'नाश्ता', tiffin_short: 'छोटा टिफ़िन', tiffin_lunch: 'लंच बॉक्स', lunch: 'दोपहर का खाना', snack: 'शाम का नाश्ता', dinner: 'रात का खाना' },
    ranks: ['पहली पसंद', 'दूसरी पसंद', 'बैकअप'],
    qty: 'मात्रा',
    reply: 'जवाब देने के लिए टैप करें (ठीक है / सामान नहीं है / बदलें):',
    forWho: (n) => `${n} के लिए`,
    mild: (n) => `${n} के लिए कम मिर्च`,
    vegan: 'वीगन: तेल में बनाएँ। घी, मक्खन, दही, दूध नहीं',
  },
  kn: {
    hello: (n) => `ನಮಸ್ಕಾರ ${n}!`,
    menu: (d, n) => `${d} ಮೆನು · ${n} ಜನ`,
    slots: { breakfast: 'ತಿಂಡಿ', tiffin_short: 'ಸಣ್ಣ ಡಬ್ಬಿ', tiffin_lunch: 'ಊಟದ ಡಬ್ಬಿ', lunch: 'ಮಧ್ಯಾಹ್ನದ ಊಟ', snack: 'ಸಂಜೆ ತಿಂಡಿ', dinner: 'ರಾತ್ರಿ ಊಟ' },
    ranks: ['ಮೊದಲ ಆಯ್ಕೆ', 'ಎರಡನೇ ಆಯ್ಕೆ', 'ಬದಲಿ'],
    qty: 'ಪ್ರಮಾಣ',
    reply: 'ಉತ್ತರಿಸಲು ಒತ್ತಿ (ಸರಿ / ಸಾಮಾನು ಇಲ್ಲ / ಬದಲಾಯಿಸಿ):',
    forWho: (n) => `${n}ಗೆ`,
    mild: (n) => `${n}ಗೆ ಖಾರ ಕಡಿಮೆ`,
    vegan: 'ವೀಗನ್: ಎಣ್ಣೆಯಲ್ಲಿ ಮಾಡಿ. ತುಪ್ಪ, ಬೆಣ್ಣೆ, ಮೊಸರು, ಹಾಲು ಬೇಡ',
  },
  ta: {
    hello: (n) => `வணக்கம் ${n}!`,
    menu: (d, n) => `${d} மெனு · ${n} பேர்`,
    slots: { breakfast: 'காலை உணவு', tiffin_short: 'சிறிய டிபன்', tiffin_lunch: 'மதிய டிபன்', lunch: 'மதிய உணவு', snack: 'மாலை சிற்றுண்டி', dinner: 'இரவு உணவு' },
    ranks: ['முதல் தேர்வு', 'இரண்டாவது', 'மாற்று'],
    qty: 'அளவு',
    reply: 'பதில் அனுப்ப தட்டவும் (சரி / பொருள் இல்லை / மாற்று):',
    forWho: (n) => `${n}க்கு`,
    mild: (n) => `${n}க்கு காரம் குறைவாக`,
    vegan: 'வீகன்: எண்ணெயில் செய்யவும். நெய், வெண்ணெய், தயிர், பால் வேண்டாம்',
  },
  te: {
    hello: (n) => `నమస్తే ${n}!`,
    menu: (d, n) => `${d} మెనూ · ${n} మంది`,
    slots: { breakfast: 'టిఫిన్', tiffin_short: 'చిన్న డబ్బా', tiffin_lunch: 'లంచ్ బాక్స్', lunch: 'మధ్యాహ్న భోజనం', snack: 'సాయంత్రం స్నాక్స్', dinner: 'రాత్రి భోజనం' },
    ranks: ['మొదటి ఎంపిక', 'రెండవది', 'బ్యాకప్'],
    qty: 'పరిమాణం',
    reply: 'జవాబు కోసం నొక్కండి (సరే / సామాను లేదు / మార్చండి):',
    forWho: (n) => `${n} కోసం`,
    mild: (n) => `${n} కోసం కారం తక్కువ`,
    vegan: 'వీగన్: నూనెతో చేయండి. నెయ్యి, వెన్న, పెరుగు, పాలు వద్దు',
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

/** Quantities for `people` adult-equivalent portions, in the cook's language (FR-232). */
export function quantities(dish: Dish, people: number, lang: CookLanguage = 'en'): string {
  if (!dish.qty?.length) return '';
  return dish.qty
    .map((q) => {
      const total = q.perPerson * people;
      const unit = unitName(q.unit, lang);
      const plural = lang === 'en' && total > 1 && !q.unit.includes('/') ? 's' : '';
      const amount = q.unit === 'g' ? `${Math.max(50, Math.round(total / 50) * 50)} ${unit}` : `${nice(total)} ${unit}${plural}`;
      return `${itemName(q.item, lang)} ${amount}`;
    })
    .join(', ');
}

export interface CookItem {
  k: string; // plannedMeal id
  t: string; // slot label in cook language
  w?: string; // who the plate is for
  o: string[]; // ranked dish names in the cook's language
  q?: string; // quantities for the 1st choice (kept for older Cook pages)
  qs?: string[]; // quantities per option, same order as `o` (D41)
  nt?: string; // note: less spicy / vegan
}

export interface CookPayload {
  v: 2;
  id: string;
  fam: string;
  /** planner's number; links from 1.0.2 on carry none (the cook picks the chat) */
  ph?: string;
  lang: CookLanguage;
  date: string;
  n: number;
  cook: string;
  /** link expiry, ms since epoch */
  exp: number;
  items: CookItem[];
}

const cardId = (date: string) => date.replace(/-/g, '') + Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);

/** Replies are accepted until 36 hours after the start of the card's day. */
export function cardExpiry(date: string): Date {
  const d = fromKey(date);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + 36 * 3600 * 1000);
}

export function buildPayload(family: Family, cook: Member, date: string, meals: PlannedMeal[]): CookPayload {
  const lang = cook.language ?? 'en';
  const S = COOK_STRINGS[lang];
  const first = (m: Member) => m.name.split(' ')[0];
  const everyone = new Set<string>();
  const items: CookItem[] = meals.map((p) => {
    const eaters = plateEaters(family, p);
    eaters.forEach((m) => everyone.add(m.id));
    const dishes = rankedOptions(p).map((id) => dishById(family, id)).filter(Boolean) as Dish[];
    const split = !!(p.memberId || p.forMemberIds?.length);
    const who = split ? eaters.map(first).join(', ') || family.members.find((m) => m.id === p.memberId)?.name : undefined;
    const n = eaters.length ? portions(eaters) : 1;
    const qs = dishes.map((x) => quantities(x, n, lang));
    const notes: string[] = [];
    const mild = dishes[0] ? eaters.filter((m) => checkMember(dishes[0], m, p.date, family).mild) : [];
    if (mild.length) notes.push(S.mild(mild.map(first).join(', ')));
    if (eaters.some((m) => m.diet === 'vegan')) notes.push(S.vegan);
    return { k: p.id, t: S.slots[p.slot], w: who, o: dishes.map((x) => dishName(x.id, x.name, lang)), q: qs[0] ?? '', qs, nt: notes.join(' · ') || undefined };
  });
  return {
    v: 2,
    id: cardId(date),
    fam: family.name,
    lang,
    date: shortDate(date),
    n: everyone.size || 1,
    cook: cook.name,
    exp: cardExpiry(date).getTime(),
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

// Compact SHA-256 (pure JS, no platform crypto needed).
function sha256(msg: string): string {
  const K: number[] = [];
  const H: number[] = [];
  const isPrime = (n: number) => {
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  };
  const frac = (x: number) => ((x - Math.floor(x)) * 0x100000000) | 0;
  for (let n = 2, i = 0; i < 64; n++) {
    if (!isPrime(n)) continue;
    if (i < 8) H[i] = frac(Math.pow(n, 1 / 2));
    K[i++] = frac(Math.pow(n, 1 / 3));
  }
  const bytes = utf8(msg);
  const bits = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i > 3 ? 0 : (bits >>> (i * 8)) & 0xff);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const w = new Array<number>(64);
  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/** Keyed hash of the card, stored with the card and echoed in the cook's reply. */
export function cardSig(payload: CookPayload, secret = ''): string {
  const body = JSON.stringify(payload);
  return sha256(secret + '.' + sha256(secret + '.' + body)).slice(0, 16);
}

/**
 * Link to the static Cook page. It carries an expiry the page enforces and a
 * signature the app checks on the reply. Honest limit: without a server the page
 * itself can't verify who made a link, so this is expiry + tamper-evidence, not
 * access control (D24). The reply is only applied against the card the app stored.
 */
export function cookPageUrl(base: string, payload: CookPayload, secret = ''): string {
  return `${base}#d=${b64url(JSON.stringify(payload))}&exp=${payload.exp}&sig=${cardSig(payload, secret)}`;
}

export function cookCardText(family: Family, cook: Member, payload: CookPayload, url: string): string {
  const S = COOK_STRINGS[payload.lang];
  const lines: string[] = [S.hello(cook.name.split(' ')[0]), S.menu(payload.date, payload.n), ''];
  for (const it of payload.items) {
    lines.push(`*${it.t}*${it.w ? ` (${S.forWho(it.w)})` : ''}`);
    it.o.forEach((name, i) => lines.push(`  ${i === 0 ? '✅' : i === 1 ? '2️⃣' : '↩️'} ${S.ranks[i]}: ${name}`));
    if (it.q) lines.push(`  ⚖️ ${S.qty}: ${it.q}`);
    if (it.nt) lines.push(`  ⚠️ ${it.nt}`);
  }
  lines.push('', S.reply, url);
  return lines.join('\n');
}

/** Everything needed to send one Cook Card, plus the record the app keeps of it. */
export function buildCard(family: Family, cook: Member, date: string, meals: PlannedMeal[], now = new Date()) {
  const payload = buildPayload(family, cook, date, meals);
  const sig = cardSig(payload, family.secret ?? '');
  const url = cookPageUrl(family.settings.cookPageBase, payload, family.secret ?? '');
  const record: CookCardRecord = {
    id: payload.id,
    cookId: cook.id,
    date,
    createdAt: now.toISOString(),
    expiresAt: new Date(payload.exp).toISOString(),
    sig,
    items: meals.map((p) => ({ planId: p.id, options: rankedOptions(p) })),
  };
  return { payload, url, text: cookCardText(family, cook, payload, url), record };
}

export interface CookReply {
  id?: string;
  sig?: string;
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
  const id = text.match(/WC:([A-Za-z0-9]+)(?:\.([a-f0-9]{8,}))?/);
  if (id) {
    r.id = id[1];
    if (id[2]) r.sig = id[2];
  }
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
