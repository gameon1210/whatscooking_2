// Regional dish catalogue: North Indian, South Indian and General (FR-215).
// Metadata drives rules (FR-211/212), ranking (section 8), cook quantities (FR-232)
// and leftover chains (FR-251). Portions are rough household guides.
import type { Dish, SlotId } from './types';

type Opt = Partial<Omit<Dish, 'id' | 'name' | 'slots'>> & { s: string };

const SLOT_CODES: Record<string, SlotId> = {
  B: 'breakfast',
  T: 'tiffin_short',
  M: 'tiffin_lunch',
  L: 'lunch',
  S: 'snack',
  D: 'dinner',
};

function d(id: string, name: string, o: Opt): Dish {
  const slots = o.s.split('').map((c) => SLOT_CODES[c]);
  const { s, ...rest } = o;
  void s;
  return {
    id,
    name,
    aliases: [],
    regions: ['general'],
    slots,
    effort: 2,
    diet: 'veg',
    onionGarlic: true,
    jainOk: false,
    vratOk: false,
    spice: 1,
    groups: [],
    base: 'other',
    veg: [],
    ingredients: [],
    ...rest,
  };
}

const rice = (n = 0.5) => ({ item: 'rice', perPerson: n, unit: 'cup' });
const atta = (n = 0.5) => ({ item: 'atta', perPerson: n, unit: 'cup' });
const dal = (n = 0.25) => ({ item: 'dal', perPerson: n, unit: 'cup' });

export const CATALOG: Dish[] = [
  // ---------- Breakfast: North ----------
  d('poha', 'Poha', { s: 'BTS', regions: ['north', 'general'], effort: 1, groups: ['cereal'], veg: ['onion', 'peas', 'potato'], ingredients: ['poha', 'peanuts'], portable: true, dry: true, light: true, aliases: ['pohe', 'aval upma'], qty: [{ item: 'poha', perPerson: 0.75, unit: 'cup' }] }),
  d('aloo_paratha', 'Aloo paratha', { s: 'BML', regions: ['north'], effort: 2, groups: ['cereal', 'vegetable'], base: 'roti', veg: ['potato'], portable: true, dry: true, comfort: true, weekendy: true, aliases: ['aloo parantha', 'alu paratha'], qty: [atta(0.5), { item: 'potato', perPerson: 1, unit: 'pc' }] }),
  d('gobi_paratha', 'Gobi paratha', { s: 'BML', regions: ['north'], groups: ['cereal', 'vegetable'], base: 'roti', veg: ['cauliflower'], portable: true, dry: true, qty: [atta(0.5)] }),
  d('paneer_paratha', 'Paneer paratha', { s: 'BML', regions: ['north'], groups: ['cereal', 'dairy'], base: 'roti', ingredients: ['paneer'], portable: true, dry: true, qty: [atta(0.5), { item: 'paneer', perPerson: 50, unit: 'g' }] }),
  d('methi_thepla', 'Methi thepla', { s: 'BTML', regions: ['general'], effort: 2, groups: ['cereal', 'greens'], base: 'roti', veg: ['methi'], portable: true, dry: true, onionGarlic: false, aliases: ['thepla'], qty: [atta(0.4)] }),
  d('dal_paratha', 'Dal paratha', { s: 'BTM', regions: ['north'], groups: ['cereal', 'pulse'], base: 'roti', portable: true, dry: true, aliases: ['dal ka paratha'], qty: [atta(0.5)] }),
  d('besan_chilla', 'Besan chilla', { s: 'BTS', regions: ['north', 'general'], effort: 1, groups: ['pulse'], veg: ['onion', 'tomato'], ingredients: ['besan'], portable: true, light: true, aliases: ['cheela', 'chila'], qty: [{ item: 'besan', perPerson: 0.33, unit: 'cup' }] }),
  d('moong_chilla', 'Moong dal chilla', { s: 'BT', regions: ['north', 'general'], effort: 2, groups: ['pulse'], ingredients: ['moong dal'], portable: true, light: true, qty: [dal(0.3)] }),
  d('bread_omelette', 'Bread omelette', { s: 'BT', effort: 1, diet: 'egg', groups: ['egg_meat', 'cereal'], veg: ['onion'], ingredients: ['bread', 'eggs'], portable: true, aliases: ['omelette', 'anda bread'], qty: [{ item: 'eggs', perPerson: 2, unit: 'pc' }] }),
  d('egg_bhurji', 'Egg bhurji with pav', { s: 'BD', effort: 1, diet: 'egg', groups: ['egg_meat'], veg: ['onion', 'tomato'], ingredients: ['eggs', 'pav'], aliases: ['anda bhurji'], qty: [{ item: 'eggs', perPerson: 2, unit: 'pc' }] }),
  d('boiled_eggs', 'Boiled eggs', { s: 'BT', effort: 1, diet: 'egg', groups: ['egg_meat'], ingredients: ['eggs'], portable: true, dry: true, onionGarlic: false, spice: 0, qty: [{ item: 'eggs', perPerson: 2, unit: 'pc' }] }),
  d('veg_sandwich', 'Veg sandwich', { s: 'BTMS', effort: 1, groups: ['cereal', 'vegetable'], veg: ['cucumber', 'tomato', 'potato'], ingredients: ['bread'], portable: true, spice: 0, aliases: ['sandwich'], qty: [{ item: 'bread', perPerson: 3, unit: 'slice' }] }),
  d('paneer_sandwich', 'Paneer sandwich', { s: 'BTM', effort: 1, groups: ['cereal', 'dairy'], veg: ['capsicum'], ingredients: ['bread', 'paneer'], portable: true, spice: 0 }),
  d('oats_porridge', 'Oats porridge', { s: 'B', effort: 1, groups: ['cereal', 'dairy'], ingredients: ['oats'], onionGarlic: false, jainOk: true, spice: 0, soft: true, light: true, aliases: ['oats', 'daliya'] }),
  d('dalia', 'Vegetable dalia', { s: 'BD', effort: 2, groups: ['cereal', 'vegetable'], veg: ['carrot', 'peas'], ingredients: ['dalia'], soft: true, light: true, comfort: true, aliases: ['daliya', 'broken wheat'] }),
  d('aloo_puri', 'Puri bhaji', { s: 'BL', regions: ['north'], effort: 3, groups: ['cereal', 'fried'], base: 'roti', veg: ['potato'], weekendy: true, aliases: ['poori bhaji', 'puri aloo', 'poori'], qty: [atta(0.5)] }),
  d('chole_bhature', 'Chole bhature', { s: 'BL', regions: ['north'], effort: 3, groups: ['pulse', 'fried'], base: 'roti', ingredients: ['chickpeas', 'maida'], weekendy: true, orderIn: true, spice: 2, qty: [{ item: 'chickpeas', perPerson: 0.3, unit: 'cup' }] }),
  d('sabudana_khichdi', 'Sabudana khichdi', { s: 'BTLD', regions: ['general'], effort: 2, groups: ['cereal'], veg: ['potato'], ingredients: ['sabudana', 'peanuts'], onionGarlic: false, vratOk: true, portable: true, aliases: ['sabudana'], qty: [{ item: 'sabudana', perPerson: 0.5, unit: 'cup' }] }),
  d('sabudana_vada', 'Sabudana vada', { s: 'BS', effort: 3, groups: ['fried'], veg: ['potato'], ingredients: ['sabudana', 'peanuts'], onionGarlic: false, vratOk: true }),
  d('kuttu_puri', 'Kuttu puri with aloo', { s: 'LD', regions: ['north'], effort: 2, groups: ['millet', 'fried'], veg: ['potato'], ingredients: ['kuttu atta'], onionGarlic: false, vratOk: true, aliases: ['kuttu ki puri'] }),
  d('fruit_chaat', 'Fruit chaat', { s: 'BTS', effort: 1, groups: ['fruit'], ingredients: ['seasonal fruit'], onionGarlic: false, jainOk: true, vratOk: true, portable: true, spice: 0, light: true, aliases: ['fruits', 'fruit bowl'] }),
  d('makhana', 'Roasted makhana', { s: 'TS', effort: 1, groups: ['dairy'], ingredients: ['makhana'], onionGarlic: false, jainOk: true, vratOk: true, portable: true, dry: true, spice: 0 }),

  // ---------- Breakfast: South ----------
  d('idli_sambar', 'Idli sambar', { s: 'BTM', regions: ['south', 'general'], effort: 1, groups: ['cereal', 'pulse'], base: 'rice', veg: ['drumstick', 'onion'], ingredients: ['idli batter'], soft: true, light: true, portable: true, aliases: ['idli', 'idly'], qty: [{ item: 'idli batter', perPerson: 1, unit: 'cup' }], leftoverTo: ['idli_upma'] }),
  d('idli_podi', 'Idli with podi', { s: 'TM', regions: ['south'], effort: 1, groups: ['cereal', 'pulse'], base: 'rice', ingredients: ['idli batter'], portable: true, dry: true, onionGarlic: false, aliases: ['podi idli'] }),
  d('idli_upma', 'Idli upma', { s: 'BT', regions: ['south'], effort: 1, groups: ['cereal'], veg: ['onion'], portable: true }),
  d('masala_dosa', 'Masala dosa', { s: 'BD', regions: ['south', 'general'], effort: 2, groups: ['cereal', 'pulse'], base: 'rice', veg: ['potato', 'onion'], ingredients: ['dosa batter'], orderIn: true, aliases: ['dosa', 'dose'], qty: [{ item: 'dosa batter', perPerson: 1, unit: 'cup' }] }),
  d('plain_dosa', 'Plain dosa with chutney', { s: 'BD', regions: ['south'], effort: 1, groups: ['cereal', 'pulse'], base: 'rice', ingredients: ['dosa batter', 'coconut'], onionGarlic: false, aliases: ['sada dosa'] }),
  d('rava_upma', 'Rava upma', { s: 'BT', regions: ['south', 'general'], effort: 1, groups: ['cereal'], veg: ['onion', 'carrot', 'peas'], ingredients: ['rava'], portable: true, light: true, aliases: ['upma', 'uppittu'], qty: [{ item: 'rava', perPerson: 0.4, unit: 'cup' }] }),
  d('pongal', 'Ven pongal', { s: 'BL', regions: ['south'], effort: 2, groups: ['cereal', 'pulse'], base: 'rice', ingredients: ['moong dal'], onionGarlic: false, soft: true, comfort: true, spice: 0, aliases: ['khara pongal'] }),
  d('uttapam', 'Onion uttapam', { s: 'BD', regions: ['south'], effort: 1, groups: ['cereal', 'pulse'], base: 'rice', veg: ['onion', 'tomato'], ingredients: ['dosa batter'], aliases: ['uthappam'] }),
  d('appam_stew', 'Appam with veg stew', { s: 'BD', regions: ['south'], effort: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['potato', 'carrot', 'beans'], ingredients: ['appam batter', 'coconut milk'], spice: 0 }),
  d('pesarattu', 'Pesarattu', { s: 'B', regions: ['south'], effort: 2, groups: ['pulse'], ingredients: ['moong dal'], light: true }),
  d('ragi_dosa', 'Ragi dosa', { s: 'BD', regions: ['south'], effort: 1, groups: ['millet'], ingredients: ['ragi flour'], light: true, aliases: ['finger millet dosa'] }),
  d('ragi_mudde', 'Ragi mudde with saaru', { s: 'LD', regions: ['south'], effort: 2, groups: ['millet', 'pulse'], ingredients: ['ragi flour'], spice: 2, aliases: ['ragi ball'] }),
  d('akki_roti', 'Akki roti', { s: 'BT', regions: ['south'], effort: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['onion', 'carrot'], ingredients: ['rice flour'], portable: true, dry: true }),
  d('medu_vada', 'Medu vada', { s: 'BS', regions: ['south'], effort: 3, groups: ['pulse', 'fried'], ingredients: ['urad dal'], weekendy: true, aliases: ['vada', 'uddina vade'] }),
  d('set_dosa', 'Set dosa', { s: 'B', regions: ['south'], effort: 1, groups: ['cereal'], base: 'rice', ingredients: ['dosa batter'], soft: true }),
  d('puttu', 'Puttu kadala', { s: 'B', regions: ['south'], effort: 2, groups: ['cereal', 'pulse'], base: 'rice', ingredients: ['puttu flour', 'black chana'] }),
  d('semiya_upma', 'Semiya upma', { s: 'BT', regions: ['south'], effort: 1, groups: ['cereal'], veg: ['onion', 'carrot'], ingredients: ['vermicelli'], portable: true, aliases: ['vermicelli upma', 'sevai'] }),

  // ---------- Lunch / dinner mains: North ----------
  d('rajma_chawal', 'Rajma chawal', { s: 'LMD', regions: ['north'], effort: 2, groups: ['pulse', 'cereal'], base: 'rice', veg: ['onion', 'tomato'], ingredients: ['rajma'], comfort: true, weekendy: true, aliases: ['rajma', 'rajma rice'], qty: [{ item: 'rajma (soak overnight)', perPerson: 0.25, unit: 'cup' }, rice()] }),
  d('chole_rice', 'Chole with rice', { s: 'LD', regions: ['north'], effort: 2, groups: ['pulse', 'cereal'], base: 'rice', veg: ['onion', 'tomato'], ingredients: ['chickpeas'], spice: 2, aliases: ['chole', 'chana masala', 'chhole'], qty: [{ item: 'chickpeas (soak overnight)', perPerson: 0.25, unit: 'cup' }, rice()], leftoverTo: ['chole_kulche'] }),
  d('chole_kulche', 'Chole kulche', { s: 'LD', regions: ['north'], effort: 1, groups: ['pulse', 'cereal'], base: 'roti', ingredients: ['kulcha'], spice: 2 }),
  d('dal_chawal', 'Dal chawal', { s: 'LMD', effort: 1, groups: ['pulse', 'cereal'], base: 'rice', veg: ['tomato'], soft: true, comfort: true, light: true, aliases: ['dal rice', 'dal bhaat'], qty: [dal(), rice()], leftoverTo: ['dal_paratha', 'lemon_rice'] }),
  d('dal_tadka_roti', 'Dal tadka with roti', { s: 'LD', regions: ['north', 'general'], effort: 1, groups: ['pulse', 'cereal'], base: 'roti', veg: ['onion', 'tomato'], aliases: ['dal fry', 'dal roti', 'dal tadka'], qty: [dal(), atta(0.4)], leftoverTo: ['dal_paratha'] }),
  d('dal_makhani', 'Dal makhani with naan', { s: 'LD', regions: ['north'], effort: 3, groups: ['pulse', 'dairy'], base: 'roti', ingredients: ['whole urad', 'cream'], weekendy: true, orderIn: true, comfort: true, leftoverTo: ['dal_paratha'] }),
  d('kadhi_chawal', 'Kadhi chawal', { s: 'LD', regions: ['north'], effort: 2, groups: ['dairy', 'pulse', 'cereal'], base: 'rice', ingredients: ['curd', 'besan'], comfort: true, aliases: ['kadhi pakoda', 'kadhi'], qty: [{ item: 'curd', perPerson: 0.5, unit: 'cup' }, rice()] }),
  d('aloo_gobi_roti', 'Aloo gobi with roti', { s: 'LMD', regions: ['north'], effort: 2, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['potato', 'cauliflower'], portable: true, dry: true, aliases: ['aloo gobhi', 'gobi aloo'], qty: [atta(0.4)] }),
  d('bhindi_roti', 'Bhindi masala with roti', { s: 'LMD', regions: ['north'], effort: 2, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['okra', 'onion'], portable: true, dry: true, aliases: ['bhindi', 'okra', 'bhendi'], qty: [atta(0.4), { item: 'okra', perPerson: 100, unit: 'g' }] }),
  d('palak_paneer', 'Palak paneer with roti', { s: 'LD', regions: ['north'], effort: 2, groups: ['greens', 'dairy', 'cereal'], base: 'roti', veg: ['spinach'], ingredients: ['paneer'], orderIn: true, aliases: ['palak'], qty: [{ item: 'spinach', perPerson: 1, unit: 'bunch/3' }, { item: 'paneer', perPerson: 50, unit: 'g' }, atta(0.4)] }),
  d('matar_paneer', 'Matar paneer with roti', { s: 'LD', regions: ['north'], effort: 2, groups: ['dairy', 'vegetable', 'cereal'], base: 'roti', veg: ['peas', 'tomato', 'onion'], ingredients: ['paneer'], weekendy: true, aliases: ['mutter paneer'] }),
  d('paneer_butter_masala', 'Paneer butter masala', { s: 'LD', regions: ['north'], effort: 3, groups: ['dairy'], base: 'roti', veg: ['tomato', 'onion'], ingredients: ['paneer', 'cream'], weekendy: true, orderIn: true, aliases: ['paneer makhani', 'butter paneer'] }),
  d('paneer_roll', 'Paneer roll', { s: 'TMD', regions: ['north', 'general'], effort: 2, groups: ['dairy', 'cereal'], base: 'roti', veg: ['capsicum', 'onion'], ingredients: ['paneer'], portable: true, aliases: ['paneer frankie', 'paneer wrap'] }),
  d('veg_frankie', 'Veg frankie', { s: 'TMD', effort: 2, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['potato', 'cabbage', 'carrot'], portable: true, aliases: ['frankie', 'veg roll', 'kathi roll'] }),
  d('mix_veg_roti', 'Mixed veg sabzi with roti', { s: 'LMD', effort: 2, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['carrot', 'beans', 'peas', 'potato'], portable: true, aliases: ['mix veg', 'sabzi roti'], leftoverTo: ['veg_frankie', 'veg_sandwich'] }),
  d('baingan_bharta', 'Baingan bharta with roti', { s: 'LD', regions: ['north'], effort: 2, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['brinjal', 'onion', 'tomato'], spice: 2, aliases: ['bharta', 'baingan'] }),
  d('lauki_roti', 'Lauki sabzi with roti', { s: 'LD', regions: ['north'], effort: 1, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['bottle gourd'], onionGarlic: false, jainOk: false, soft: true, light: true, spice: 0, aliases: ['lauki', 'ghiya', 'dudhi'] }),
  d('sarson_saag', 'Sarson ka saag with makki roti', { s: 'LD', regions: ['north'], effort: 3, groups: ['greens', 'millet'], base: 'roti', veg: ['mustard greens', 'spinach'], ingredients: ['makki atta'], weekendy: true, comfort: true }),
  d('aloo_matar_roti', 'Aloo matar with roti', { s: 'LMD', regions: ['north'], effort: 1, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['potato', 'peas', 'tomato'], comfort: true, aliases: ['aloo mutter'] }),
  d('jeera_aloo_puri', 'Jeera aloo with roti', { s: 'TMLD', effort: 1, groups: ['vegetable', 'cereal'], base: 'roti', veg: ['potato'], onionGarlic: false, portable: true, dry: true, aliases: ['jeera aloo', 'sookhi aloo'] }),
  d('khichdi', 'Moong dal khichdi', { s: 'LD', effort: 1, groups: ['pulse', 'cereal'], base: 'rice', veg: ['tomato'], onionGarlic: false, soft: true, light: true, comfort: true, spice: 0, aliases: ['khichdi', 'khichri', 'khichadi'], qty: [{ item: 'rice + moong dal', perPerson: 0.4, unit: 'cup' }] }),
  d('veg_pulao', 'Veg pulao with raita', { s: 'LMD', effort: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['carrot', 'beans', 'peas', 'onion'], portable: true, aliases: ['pulao', 'pulav', 'veg biryani'], qty: [rice()] }),
  d('jeera_rice_dal', 'Jeera rice with dal fry', { s: 'LD', effort: 1, groups: ['cereal', 'pulse'], base: 'rice', veg: ['onion', 'tomato'], qty: [rice(), dal()] }),
  d('pav_bhaji', 'Pav bhaji', { s: 'DS', regions: ['general'], effort: 2, groups: ['vegetable'], veg: ['potato', 'cauliflower', 'peas', 'capsicum', 'tomato', 'onion'], ingredients: ['pav', 'butter'], weekendy: true, orderIn: true, spice: 2 }),
  d('pasta_veg', 'Vegetable pasta', { s: 'MD', effort: 1, groups: ['cereal', 'vegetable'], veg: ['capsicum', 'tomato', 'onion'], ingredients: ['pasta'], portable: true, spice: 0, aliases: ['pasta'] }),
  d('veg_noodles', 'Veg hakka noodles', { s: 'TMD', effort: 1, groups: ['cereal', 'vegetable'], veg: ['cabbage', 'carrot', 'capsicum', 'onion'], ingredients: ['noodles'], portable: true, orderIn: true, aliases: ['noodles', 'chowmein'] }),
  d('veg_fried_rice', 'Veg fried rice', { s: 'MD', effort: 1, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['carrot', 'beans', 'cabbage', 'onion'], portable: true, orderIn: true, aliases: ['fried rice'] }),
  d('dhokla', 'Dhokla', { s: 'BTS', regions: ['general'], effort: 2, groups: ['pulse'], ingredients: ['besan'], onionGarlic: false, portable: true, soft: true, spice: 0, aliases: ['khaman'] }),
  d('millet_khichdi', 'Foxtail millet khichdi', { s: 'LD', effort: 2, groups: ['millet', 'pulse', 'vegetable'], veg: ['carrot', 'beans'], ingredients: ['foxtail millet'], soft: true, light: true, aliases: ['navane khichdi', 'millet'] }),
  d('bajra_roti', 'Bajra roti with sabzi', { s: 'LD', regions: ['north'], effort: 2, groups: ['millet', 'vegetable'], base: 'roti', veg: ['potato', 'onion'], ingredients: ['bajra atta'] }),
  d('jowar_roti', 'Jowar roti with palya', { s: 'LD', regions: ['south', 'general'], effort: 2, groups: ['millet', 'vegetable'], base: 'roti', veg: ['beans', 'carrot'], ingredients: ['jowar atta'], aliases: ['jolada rotti', 'jowar bhakri'] }),

  // ---------- Lunch / dinner mains: South ----------
  d('sambar_rice', 'Sambar rice', { s: 'LMD', regions: ['south'], effort: 2, groups: ['pulse', 'cereal', 'vegetable'], base: 'rice', veg: ['drumstick', 'brinjal', 'onion', 'tomato'], ingredients: ['toor dal', 'tamarind'], comfort: true, aliases: ['sambar', 'sambhar', 'sambar sadam', 'bisi bele bath'], qty: [dal(), rice()], leftoverTo: ['sambar_idli'] }),
  d('sambar_idli', 'Sambar with idli', { s: 'BD', regions: ['south'], effort: 1, groups: ['pulse', 'cereal'], base: 'rice', ingredients: ['idli batter'] }),
  d('rasam_rice', 'Rasam rice with poriyal', { s: 'LD', regions: ['south'], effort: 1, groups: ['pulse', 'cereal', 'vegetable'], base: 'rice', veg: ['tomato', 'beans'], ingredients: ['tamarind'], light: true, comfort: true, spice: 2, aliases: ['rasam', 'saaru anna'], qty: [rice()] }),
  d('bisibele_bath', 'Bisi bele bath', { s: 'LMD', regions: ['south'], effort: 2, groups: ['pulse', 'cereal', 'vegetable'], base: 'rice', veg: ['carrot', 'beans', 'peas'], ingredients: ['toor dal'], comfort: true, spice: 2, aliases: ['bisibelebath'], qty: [rice(0.4), dal(0.2)] }),
  d('curd_rice', 'Curd rice', { s: 'LMD', regions: ['south', 'general'], effort: 1, groups: ['cereal', 'dairy'], base: 'rice', ingredients: ['curd'], onionGarlic: false, soft: true, light: true, portable: true, spice: 0, aliases: ['thayir sadam', 'mosaranna', 'dahi chawal'], qty: [rice(0.5), { item: 'curd', perPerson: 0.5, unit: 'cup' }] }),
  d('lemon_rice', 'Lemon rice', { s: 'TML', regions: ['south', 'general'], effort: 1, groups: ['cereal'], base: 'rice', ingredients: ['lemon', 'peanuts'], onionGarlic: false, portable: true, dry: true, aliases: ['chitranna', 'elumichai sadam'], qty: [rice()] }),
  d('tamarind_rice', 'Tamarind rice', { s: 'ML', regions: ['south'], effort: 2, groups: ['cereal'], base: 'rice', ingredients: ['tamarind', 'peanuts'], portable: true, dry: true, spice: 2, aliases: ['puliyogare', 'puliyodharai'] }),
  d('coconut_rice', 'Coconut rice', { s: 'ML', regions: ['south'], effort: 1, groups: ['cereal'], base: 'rice', ingredients: ['coconut'], onionGarlic: false, portable: true, dry: true, spice: 0 }),
  d('tomato_rice', 'Tomato rice', { s: 'ML', regions: ['south'], effort: 1, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['tomato', 'onion'], portable: true, dry: true, aliases: ['tomato bath', 'thakkali sadam'] }),
  d('vangi_bath', 'Vangi bath', { s: 'ML', regions: ['south'], effort: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['brinjal'], portable: true, spice: 2 }),
  d('avial_rice', 'Avial with rice', { s: 'L', regions: ['south'], effort: 2, groups: ['vegetable', 'cereal'], base: 'rice', veg: ['carrot', 'beans', 'drumstick', 'raw banana'], ingredients: ['coconut', 'curd'], onionGarlic: false, spice: 0 }),
  d('keerai_kootu', 'Keerai kootu with rice', { s: 'LD', regions: ['south'], effort: 2, groups: ['greens', 'pulse', 'cereal'], base: 'rice', veg: ['spinach'], ingredients: ['moong dal', 'coconut'], soft: true, aliases: ['spinach kootu', 'soppu saaru'] }),
  d('thoran_rice', 'Beans thoran with rice and dal', { s: 'LM', regions: ['south'], effort: 2, groups: ['vegetable', 'cereal', 'pulse'], base: 'rice', veg: ['beans', 'cabbage'], ingredients: ['coconut'], aliases: ['palya', 'poriyal'] }),
  d('chapati_kurma', 'Chapati with veg kurma', { s: 'LD', regions: ['south'], effort: 2, groups: ['cereal', 'vegetable'], base: 'roti', veg: ['carrot', 'beans', 'peas', 'potato'], ingredients: ['coconut'], aliases: ['kurma', 'korma'] }),
  d('parotta_salna', 'Parotta with salna', { s: 'D', regions: ['south'], effort: 3, groups: ['cereal', 'fried'], base: 'roti', ingredients: ['maida'], orderIn: true, spice: 2, weekendy: true }),

  // ---------- Non-veg ----------
  d('egg_curry_rice', 'Egg curry with rice', { s: 'LD', effort: 2, diet: 'egg', groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['onion', 'tomato'], ingredients: ['eggs'], spice: 2, aliases: ['anda curry', 'egg masala'], qty: [{ item: 'eggs', perPerson: 2, unit: 'pc' }, rice()] }),
  d('egg_fried_rice', 'Egg fried rice', { s: 'MD', effort: 1, diet: 'egg', groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['onion', 'carrot'], ingredients: ['eggs'], portable: true }),
  d('chicken_curry_rice', 'Chicken curry with rice', { s: 'LD', effort: 3, diet: 'nonveg', groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['onion', 'tomato'], ingredients: ['chicken'], spice: 2, weekendy: true, aliases: ['chicken curry', 'chicken'], qty: [{ item: 'chicken', perPerson: 150, unit: 'g' }, rice()] }),
  d('butter_chicken', 'Butter chicken with naan', { s: 'D', regions: ['north'], effort: 3, diet: 'nonveg', groups: ['egg_meat', 'dairy'], base: 'roti', ingredients: ['chicken', 'cream'], orderIn: true, weekendy: true }),
  d('chicken_biryani', 'Chicken biryani', { s: 'LD', effort: 3, diet: 'nonveg', groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['onion'], ingredients: ['chicken', 'basmati rice'], orderIn: true, weekendy: true, spice: 2, aliases: ['biryani', 'biriyani'] }),
  d('veg_biryani', 'Veg biryani', { s: 'LD', effort: 3, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['carrot', 'beans', 'potato', 'onion'], ingredients: ['basmati rice'], orderIn: true, weekendy: true, spice: 2 }),
  d('fish_curry_rice', 'Fish curry with rice', { s: 'LD', regions: ['south', 'general'], effort: 3, diet: 'nonveg', groups: ['egg_meat', 'cereal'], base: 'rice', ingredients: ['fish', 'coconut'], spice: 2, aliases: ['meen curry', 'machli'] }),
  d('fish_fry', 'Fish fry with rasam rice', { s: 'L', regions: ['south'], effort: 2, diet: 'nonveg', groups: ['egg_meat', 'fried'], base: 'rice', ingredients: ['fish'], spice: 2 }),
  d('mutton_curry', 'Mutton curry with rice', { s: 'LD', effort: 3, diet: 'nonveg', groups: ['egg_meat'], base: 'rice', ingredients: ['mutton'], weekendy: true, spice: 3 }),
  d('chicken_roll', 'Chicken roll', { s: 'MD', effort: 2, diet: 'nonveg', groups: ['egg_meat', 'cereal'], base: 'roti', ingredients: ['chicken'], portable: true, orderIn: true }),
  d('keema_pav', 'Keema pav', { s: 'D', effort: 2, diet: 'nonveg', groups: ['egg_meat'], veg: ['peas', 'onion'], ingredients: ['mutton mince', 'pav'], spice: 2 }),

  // ---------- Snacks and tiffin extras ----------
  d('sprouts_chaat', 'Sprouts chaat', { s: 'TS', effort: 1, groups: ['pulse', 'vegetable'], veg: ['onion', 'tomato', 'cucumber'], ingredients: ['sprouts'], portable: true, light: true, aliases: ['sprouts'] }),
  d('sundal', 'Chana sundal', { s: 'TS', regions: ['south'], effort: 1, groups: ['pulse'], ingredients: ['chickpeas', 'coconut'], onionGarlic: false, portable: true, dry: true, spice: 0 }),
  d('peanut_chikki', 'Peanut chikki and banana', { s: 'TS', effort: 1, groups: ['fruit'], ingredients: ['chikki', 'banana'], onionGarlic: false, jainOk: true, vratOk: true, portable: true, dry: true, spice: 0 }),
  d('cheese_toast', 'Cheese toast', { s: 'TS', effort: 1, groups: ['cereal', 'dairy'], ingredients: ['bread', 'cheese'], onionGarlic: false, portable: true, spice: 0 }),
  d('corn_chaat', 'Sweet corn chaat', { s: 'TS', effort: 1, groups: ['vegetable'], veg: ['corn'], portable: true, spice: 0 }),
  d('paneer_tikka', 'Paneer tikka', { s: 'SD', effort: 2, groups: ['dairy'], veg: ['capsicum', 'onion'], ingredients: ['paneer', 'curd'], weekendy: true, orderIn: true }),
  d('pakora', 'Onion pakoda with chai', { s: 'S', effort: 2, groups: ['fried', 'pulse'], veg: ['onion'], ingredients: ['besan'], comfort: true, aliases: ['pakode', 'bhajji', 'bajji'] }),
  d('bhel', 'Bhel puri', { s: 'S', effort: 1, groups: ['cereal'], veg: ['onion', 'tomato'], ingredients: ['puffed rice', 'sev'], aliases: ['bhelpuri'] }),
  d('samosa', 'Samosa', { s: 'S', regions: ['north'], effort: 3, groups: ['fried'], veg: ['potato', 'peas'], orderIn: true }),
  d('banana_chips_nuts', 'Dry fruits and fruit', { s: 'T', effort: 1, groups: ['fruit'], ingredients: ['dry fruits', 'seasonal fruit'], onionGarlic: false, jainOk: true, vratOk: true, portable: true, dry: true, spice: 0, aliases: ['dry fruits', 'nuts'] }),
  d('mini_idli', 'Ghee podi mini idli', { s: 'T', regions: ['south'], effort: 1, groups: ['cereal'], base: 'rice', ingredients: ['idli batter'], onionGarlic: false, portable: true, dry: true, spice: 0 }),
  d('vegetable_cutlet', 'Veg cutlet', { s: 'TS', effort: 2, groups: ['vegetable'], veg: ['potato', 'carrot', 'beans', 'peas'], portable: true, dry: true }),
  d('soup_toast', 'Tomato soup with toast', { s: 'SD', effort: 1, groups: ['vegetable'], veg: ['tomato'], light: true, comfort: true, spice: 0, aliases: ['soup'] }),

  // ---------- Jain / satvik friendly ----------
  d('jain_dal_roti', 'Jain dal with roti', { s: 'LD', effort: 1, groups: ['pulse', 'cereal'], base: 'roti', veg: ['tomato'], onionGarlic: false, jainOk: true, soft: true, aliases: ['jain dal'], qty: [dal(), atta(0.4)] }),
  d('jain_kadhi', 'Gujarati kadhi with rice', { s: 'LD', effort: 1, groups: ['dairy', 'cereal'], base: 'rice', ingredients: ['curd', 'besan'], onionGarlic: false, jainOk: true, spice: 0, soft: true, aliases: ['gujarati kadhi'] }),
  d('jain_paneer_capsicum', 'Paneer capsicum (Jain) with roti', { s: 'LMD', effort: 2, groups: ['dairy', 'vegetable', 'cereal'], base: 'roti', veg: ['capsicum', 'tomato'], ingredients: ['paneer'], onionGarlic: false, jainOk: true }),
  d('jain_moong_roti', 'Moong sabzi with roti (Jain)', { s: 'LMD', effort: 1, groups: ['pulse', 'cereal'], base: 'roti', ingredients: ['green moong'], onionGarlic: false, jainOk: true, dry: true, portable: true }),
  d('jain_khakhra', 'Khakhra with curd', { s: 'BTS', effort: 1, groups: ['cereal', 'dairy'], ingredients: ['khakhra'], onionGarlic: false, jainOk: true, portable: true, dry: true, spice: 0, aliases: ['khakhra'] }),
  d('samak_rice', 'Samak rice with curd', { s: 'LD', effort: 1, groups: ['millet', 'dairy'], ingredients: ['samak rice', 'curd'], onionGarlic: false, jainOk: true, vratOk: true, soft: true, spice: 0, aliases: ['vrat rice', 'barnyard millet'] }),
  d('aloo_vrat', 'Vrat aloo with rajgira roti', { s: 'LD', effort: 2, groups: ['vegetable', 'millet'], base: 'roti', veg: ['potato'], ingredients: ['rajgira atta'], onionGarlic: false, vratOk: true, aliases: ['vrat ke aloo', 'rajgira paratha'] }),
  d('singhare_halwa', 'Makhana kheer', { s: 'SD', effort: 2, groups: ['dairy'], ingredients: ['makhana', 'milk'], onionGarlic: false, jainOk: true, vratOk: true, spice: 0, aliases: ['kheer'] }),
];

export const CATALOG_BY_ID: Record<string, Dish> = Object.fromEntries(CATALOG.map((x) => [x.id, x]));

export const VEGETABLES = [
  'onion', 'tomato', 'potato', 'capsicum', 'carrot', 'beans', 'peas', 'cauliflower', 'cabbage',
  'spinach', 'methi', 'okra', 'brinjal', 'bottle gourd', 'drumstick', 'cucumber', 'corn', 'raw banana', 'mustard greens',
];

export const DEFAULT_STAPLES = [
  'rice', 'atta', 'toor dal', 'moong dal', 'besan', 'rava', 'poha', 'oil', 'ghee', 'salt', 'sugar', 'turmeric',
  'chilli powder', 'jeera', 'mustard seeds', 'garam masala', 'tea', 'milk', 'curd', 'onion', 'tomato', 'potato',
  'ginger', 'garlic', 'green chilli', 'coriander', 'lemon',
];

export function makeCustomDish(name: string, slots: SlotId[]): Dish {
  const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return {
    id,
    name: name.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    aliases: [],
    regions: ['general'],
    slots,
    effort: 2,
    diet: 'veg',
    onionGarlic: true,
    jainOk: false,
    vratOk: false,
    spice: 1,
    groups: [],
    base: 'other',
    veg: [],
    ingredients: [],
    custom: true,
  };
}
