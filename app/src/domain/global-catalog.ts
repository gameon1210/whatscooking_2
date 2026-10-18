// Curated world-cuisine dishes (1.0.4): home-style versions a family would cook on a
// weeknight, with the same metadata as the Indian catalogue so rules, ranking, boxes,
// shopping and allergy checks work unchanged.
//
// Allergens: derived from the name and ingredients like every other dish, plus `al`
// for what a word match can't see (soy sauce has wheat, gochujang has wheat and soy,
// pesto has pine nuts and cheese). Treat the list as a household guide, not a label:
// shop-bought sauces vary, which the app says wherever allergies are set.
import { deriveAllergens, type Allergen } from './allergens';
import type { Cuisine, Diet, Dish, SlotId } from './types';

type G = Partial<Omit<Dish, 'id' | 'name' | 'slots' | 'cuisine'>> & { s: string; al?: Allergen[] };

const CODES: Record<string, SlotId> = { B: 'breakfast', T: 'tiffin_short', M: 'tiffin_lunch', L: 'lunch', S: 'snack', D: 'dinner' };

function g(cuisine: Cuisine, id: string, name: string, o: G): Dish {
  const { s, al, ...rest } = o;
  const dish: Dish = {
    id,
    name,
    aliases: [],
    regions: ['general'],
    cuisine,
    slots: s.split('').map((c) => CODES[c]),
    effort: 2,
    diet: 'veg' as Diet,
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
  dish.mildOk = dish.spice <= 2;
  dish.allergens = [...new Set([...deriveAllergens(dish), ...(al ?? [])])];
  return dish;
}

const SOY_SAUCE: Allergen[] = ['soy', 'wheat'];

export const GLOBAL_DISHES: Dish[] = [
  // ---------- Indo-Chinese ----------
  g('indo_chinese', 'veg_manchurian', 'Veg Manchurian with fried rice', { s: 'LD', effort: 3, diet: 'vegan', spice: 2, groups: ['vegetable', 'cereal', 'fried'], base: 'rice', veg: ['cabbage', 'carrot', 'capsicum', 'onion'], ingredients: ['cornflour', 'maida', 'soy sauce'], orderIn: true, al: SOY_SAUCE, aliases: ['manchurian'] }),
  g('indo_chinese', 'chilli_paneer', 'Chilli paneer', { s: 'SD', effort: 2, spice: 2, groups: ['dairy', 'vegetable'], veg: ['capsicum', 'onion'], ingredients: ['paneer', 'cornflour', 'soy sauce'], orderIn: true, al: SOY_SAUCE }),
  g('indo_chinese', 'gobi_manchurian', 'Gobi Manchurian', { s: 'SD', effort: 2, diet: 'vegan', spice: 2, groups: ['vegetable', 'fried'], veg: ['cauliflower', 'capsicum'], ingredients: ['cornflour', 'maida', 'soy sauce'], orderIn: true, al: SOY_SAUCE }),
  g('indo_chinese', 'schezwan_noodles', 'Schezwan noodles', { s: 'MD', effort: 1, diet: 'vegan', spice: 3, groups: ['cereal', 'vegetable'], veg: ['cabbage', 'carrot', 'capsicum'], ingredients: ['noodles', 'schezwan sauce', 'soy sauce'], portable: true, orderIn: true, al: SOY_SAUCE }),
  g('indo_chinese', 'chilli_chicken', 'Chilli chicken', { s: 'D', effort: 2, diet: 'nonveg', spice: 2, groups: ['egg_meat'], veg: ['capsicum', 'onion'], ingredients: ['chicken', 'cornflour', 'soy sauce'], hidden: ['egg'], orderIn: true, al: SOY_SAUCE }),
  g('indo_chinese', 'hot_sour_soup', 'Hot and sour veg soup', { s: 'SD', effort: 1, diet: 'vegan', spice: 2, groups: ['vegetable'], veg: ['cabbage', 'carrot', 'beans'], ingredients: ['cornflour', 'soy sauce', 'vinegar'], light: true, al: SOY_SAUCE }),
  g('indo_chinese', 'veg_momos', 'Veg momos', { s: 'SD', effort: 3, diet: 'vegan', groups: ['cereal', 'vegetable'], veg: ['cabbage', 'carrot', 'onion'], ingredients: ['maida'], orderIn: true, aliases: ['momo', 'dumplings'] }),

  // ---------- Italian ----------
  g('italian', 'penne_arrabbiata', 'Penne arrabbiata', { s: 'LMD', effort: 1, diet: 'vegan', spice: 2, groups: ['cereal', 'vegetable'], veg: ['tomato'], ingredients: ['penne pasta', 'olive oil', 'chilli flakes'], portable: true, aliases: ['arrabbiata', 'red sauce pasta'] }),
  g('italian', 'white_sauce_pasta', 'White sauce pasta', { s: 'LMD', effort: 1, spice: 0, groups: ['cereal', 'dairy', 'vegetable'], veg: ['corn', 'capsicum'], ingredients: ['pasta', 'milk', 'cheese'], hidden: ['butter', 'maida'], portable: true, comfort: true, aliases: ['alfredo pasta', 'alfredo'] }),
  g('italian', 'pesto_pasta', 'Pesto pasta', { s: 'LMD', effort: 1, spice: 0, groups: ['cereal', 'greens'], ingredients: ['pasta', 'basil', 'pine nuts', 'parmesan cheese', 'olive oil'], portable: true, al: ['nuts', 'milk'] }),
  g('italian', 'margherita_pizza', 'Margherita pizza', { s: 'D', effort: 2, spice: 0, groups: ['cereal', 'dairy'], veg: ['tomato'], ingredients: ['pizza base', 'mozzarella cheese', 'pizza sauce'], al: ['wheat'], weekendy: true, orderIn: true, aliases: ['pizza'] }),
  g('italian', 'veg_lasagne', 'Vegetable lasagne', { s: 'D', effort: 3, spice: 0, groups: ['cereal', 'dairy', 'vegetable'], veg: ['spinach', 'tomato', 'capsicum'], ingredients: ['lasagne sheets', 'cheese', 'milk'], al: ['wheat'], hidden: ['butter'], weekendy: true, comfort: true, aliases: ['lasagna'] }),
  g('italian', 'mushroom_risotto', 'Mushroom risotto', { s: 'D', effort: 2, spice: 0, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['mushroom', 'onion'], ingredients: ['arborio rice', 'parmesan cheese'], hidden: ['butter'], comfort: true }),
  g('italian', 'minestrone', 'Minestrone soup with bread', { s: 'LSD', effort: 2, diet: 'vegan', spice: 0, groups: ['vegetable', 'pulse', 'cereal'], veg: ['carrot', 'beans', 'tomato', 'onion'], ingredients: ['small pasta', 'kidney beans', 'bread'], light: true }),
  g('italian', 'bruschetta', 'Tomato bruschetta', { s: 'S', effort: 1, diet: 'vegan', spice: 0, groups: ['cereal', 'vegetable'], veg: ['tomato'], ingredients: ['baguette bread', 'olive oil', 'basil'], light: true }),

  // ---------- British & Continental ----------
  g('continental', 'jacket_potato', 'Jacket potato with beans and cheese', { s: 'LD', effort: 1, spice: 0, groups: ['vegetable', 'pulse', 'dairy'], veg: ['potato'], ingredients: ['baked beans', 'cheese'], comfort: true, aliases: ['baked potato'] }),
  g('continental', 'macaroni_cheese', 'Macaroni cheese', { s: 'LMD', effort: 1, spice: 0, groups: ['cereal', 'dairy'], ingredients: ['macaroni', 'cheese', 'milk'], al: ['wheat'], hidden: ['butter', 'maida'], portable: true, comfort: true, aliases: ['mac and cheese', 'mac n cheese'] }),
  g('continental', 'cottage_pie_lentil', 'Lentil cottage pie', { s: 'D', effort: 3, spice: 0, groups: ['pulse', 'vegetable'], veg: ['potato', 'carrot', 'peas', 'onion'], ingredients: ['lentils', 'milk'], hidden: ['butter'], comfort: true }),
  g('continental', 'shepherds_pie', 'Shepherd’s pie', { s: 'D', effort: 3, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'vegetable'], veg: ['potato', 'carrot', 'peas', 'onion'], ingredients: ['minced lamb', 'milk'], hidden: ['butter'], weekendy: true, comfort: true, aliases: ['shepherds pie'] }),
  g('continental', 'veg_stew_bread', 'Vegetable stew with bread', { s: 'LD', effort: 2, spice: 0, groups: ['vegetable', 'cereal'], veg: ['potato', 'carrot', 'beans', 'peas'], ingredients: ['bread'], hidden: ['butter'], light: true }),
  g('continental', 'roast_chicken', 'Roast chicken with vegetables', { s: 'LD', effort: 3, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'vegetable'], veg: ['potato', 'carrot', 'onion'], ingredients: ['chicken'], hidden: ['butter'], weekendy: true, aliases: ['sunday roast'] }),
  g('continental', 'fish_and_chips', 'Fish and chips', { s: 'D', effort: 3, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'fried'], veg: ['potato', 'peas'], ingredients: ['fish', 'maida'], orderIn: true, weekendy: true }),
  g('continental', 'eggs_on_toast', 'Scrambled eggs on toast', { s: 'B', effort: 1, diet: 'egg', spice: 0, groups: ['egg_meat', 'cereal'], ingredients: ['egg', 'bread'], hidden: ['butter', 'milk'], aliases: ['scrambled eggs'] }),
  g('continental', 'beans_on_toast', 'Beans on toast', { s: 'BS', effort: 1, spice: 0, groups: ['pulse', 'cereal'], ingredients: ['baked beans', 'bread'], hidden: ['butter'] }),
  g('continental', 'mushroom_soup', 'Cream of mushroom soup', { s: 'SD', effort: 1, spice: 0, groups: ['vegetable', 'dairy'], veg: ['mushroom', 'onion'], ingredients: ['cream'], hidden: ['butter'], light: true }),

  // ---------- Mexican ----------
  g('mexican', 'burrito_bowl', 'Veg burrito bowl', { s: 'LMD', effort: 2, diet: 'vegan', spice: 1, groups: ['cereal', 'pulse', 'vegetable'], base: 'rice', veg: ['corn', 'capsicum', 'onion', 'tomato'], ingredients: ['kidney beans', 'lime'], portable: true }),
  g('mexican', 'bean_quesadilla', 'Bean and cheese quesadilla', { s: 'TMSD', effort: 1, spice: 1, groups: ['cereal', 'pulse', 'dairy'], veg: ['onion', 'capsicum'], ingredients: ['flour tortillas', 'kidney beans', 'cheese'], portable: true, dry: true, al: ['wheat'], aliases: ['quesadilla'] }),
  g('mexican', 'veg_tacos', 'Bean tacos with salsa', { s: 'D', effort: 2, spice: 1, groups: ['cereal', 'pulse', 'vegetable'], veg: ['tomato', 'onion', 'cabbage'], ingredients: ['corn taco shells', 'kidney beans', 'cheese'], weekendy: true, aliases: ['tacos'] }),
  g('mexican', 'chicken_fajitas', 'Chicken fajitas', { s: 'D', effort: 2, diet: 'nonveg', spice: 1, groups: ['egg_meat', 'cereal', 'vegetable'], veg: ['capsicum', 'onion'], ingredients: ['chicken', 'flour tortillas'], al: ['wheat'], aliases: ['fajitas'] }),
  g('mexican', 'loaded_nachos', 'Loaded nachos', { s: 'S', effort: 1, spice: 1, groups: ['cereal', 'pulse', 'dairy'], veg: ['tomato', 'onion'], ingredients: ['tortilla chips', 'cheese', 'kidney beans'], weekendy: true, orderIn: true, aliases: ['nachos'] }),
  g('mexican', 'mexican_rice', 'Mexican rice with black beans', { s: 'LMD', effort: 1, diet: 'vegan', spice: 1, groups: ['cereal', 'pulse', 'vegetable'], base: 'rice', veg: ['tomato', 'corn', 'capsicum', 'onion'], ingredients: ['black beans'], portable: true }),
  g('mexican', 'guacamole_chips', 'Guacamole with corn chips', { s: 'S', effort: 1, diet: 'vegan', spice: 0, groups: ['vegetable'], veg: ['onion', 'tomato'], ingredients: ['avocado', 'tortilla chips', 'lime'], light: true, aliases: ['guacamole'] }),

  // ---------- Chinese ----------
  g('chinese', 'mapo_tofu', 'Mapo tofu with rice', { s: 'D', effort: 2, diet: 'vegan', spice: 3, groups: ['pulse', 'cereal'], base: 'rice', ingredients: ['tofu', 'chilli bean paste', 'soy sauce'], al: SOY_SAUCE }),
  g('chinese', 'kung_pao_chicken', 'Kung pao chicken with rice', { s: 'D', effort: 2, diet: 'nonveg', spice: 2, groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['capsicum', 'onion'], ingredients: ['chicken', 'peanuts', 'soy sauce'], al: SOY_SAUCE }),
  g('chinese', 'veg_chow_mein', 'Veg chow mein', { s: 'MD', effort: 1, diet: 'vegan', spice: 1, groups: ['cereal', 'vegetable'], veg: ['cabbage', 'carrot', 'beans'], ingredients: ['noodles', 'soy sauce'], portable: true, al: SOY_SAUCE, aliases: ['chowmein'] }),
  g('chinese', 'tofu_greens', 'Stir-fried greens with tofu and rice', { s: 'LD', effort: 1, diet: 'vegan', spice: 1, groups: ['greens', 'pulse', 'cereal'], base: 'rice', veg: ['spinach', 'beans'], ingredients: ['tofu', 'soy sauce', 'sesame oil'], light: true, al: SOY_SAUCE }),
  g('chinese', 'congee', 'Rice congee', { s: 'BD', effort: 1, diet: 'vegan', spice: 0, groups: ['cereal'], base: 'rice', ingredients: ['ginger'], onionGarlic: false, light: true, soft: true, comfort: true, aliases: ['rice porridge'] }),
  g('chinese', 'egg_drop_soup', 'Egg drop soup', { s: 'SD', effort: 1, diet: 'egg', spice: 0, groups: ['egg_meat', 'vegetable'], veg: ['corn'], ingredients: ['egg', 'cornflour'], light: true }),
  g('chinese', 'sweet_sour_veg', 'Sweet and sour vegetables with rice', { s: 'D', effort: 2, diet: 'vegan', spice: 0, groups: ['vegetable', 'cereal'], base: 'rice', veg: ['capsicum', 'onion', 'carrot'], ingredients: ['pineapple', 'tomato ketchup', 'soy sauce'], al: SOY_SAUCE }),

  // ---------- Thai ----------
  g('thai', 'thai_green_curry', 'Thai green curry with rice', { s: 'LD', effort: 2, diet: 'vegan', spice: 2, groups: ['vegetable', 'cereal'], base: 'rice', veg: ['beans', 'brinjal', 'capsicum'], ingredients: ['coconut milk', 'vegetarian green curry paste', 'tofu'], allergenFree: ['milk'], aliases: ['green curry'] }),
  g('thai', 'tofu_pad_thai', 'Tofu pad thai', { s: 'D', effort: 2, diet: 'vegan', spice: 1, groups: ['cereal', 'pulse', 'vegetable'], veg: ['carrot', 'cabbage'], ingredients: ['rice noodles', 'tofu', 'peanuts', 'tamarind', 'soy sauce'], orderIn: true, al: SOY_SAUCE, aliases: ['pad thai'] }),
  g('thai', 'thai_red_curry_chicken', 'Thai red curry chicken with rice', { s: 'D', effort: 2, diet: 'nonveg', spice: 2, groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['capsicum', 'beans'], ingredients: ['chicken', 'coconut milk', 'red curry paste', 'fish sauce'], allergenFree: ['milk'], aliases: ['red curry'] }),
  g('thai', 'tom_yum', 'Tom yum soup', { s: 'SD', effort: 1, diet: 'vegan', spice: 3, groups: ['vegetable'], veg: ['mushroom', 'tomato'], ingredients: ['lemongrass', 'lime'], light: true }),
  g('thai', 'basil_fried_rice', 'Thai basil fried rice', { s: 'MD', effort: 1, diet: 'vegan', spice: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['beans', 'capsicum', 'onion'], ingredients: ['basil', 'soy sauce'], portable: true, al: SOY_SAUCE }),
  g('thai', 'mango_sticky_rice', 'Mango sticky rice', { s: 'S', effort: 2, diet: 'vegan', spice: 0, groups: ['fruit', 'cereal'], base: 'rice', ingredients: ['sticky rice', 'mango', 'coconut milk'], allergenFree: ['milk'], onionGarlic: false }),

  // ---------- Japanese ----------
  g('japanese', 'veg_sushi', 'Veg sushi rolls', { s: 'MLD', effort: 3, diet: 'vegan', spice: 0, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['cucumber', 'carrot'], ingredients: ['sushi rice', 'nori', 'rice vinegar', 'soy sauce'], hidden: ['sesame'], portable: true, al: SOY_SAUCE, aliases: ['sushi', 'maki'] }),
  g('japanese', 'onigiri', 'Onigiri rice balls', { s: 'TMS', effort: 1, diet: 'vegan', spice: 0, groups: ['cereal'], base: 'rice', ingredients: ['sushi rice', 'nori'], hidden: ['sesame'], portable: true, dry: true, onionGarlic: false }),
  g('japanese', 'miso_ramen', 'Veg miso ramen', { s: 'D', effort: 2, diet: 'vegan', spice: 1, groups: ['cereal', 'pulse', 'greens'], veg: ['mushroom', 'spinach'], ingredients: ['ramen noodles', 'miso', 'tofu', 'soy sauce'], comfort: true, al: SOY_SAUCE, aliases: ['ramen'] }),
  g('japanese', 'chicken_teriyaki', 'Chicken teriyaki rice bowl', { s: 'LMD', effort: 2, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'cereal'], base: 'rice', veg: ['beans'], ingredients: ['chicken', 'teriyaki sauce'], hidden: ['sesame'], portable: true, al: SOY_SAUCE, aliases: ['teriyaki'] }),
  g('japanese', 'veg_katsu_curry', 'Veg katsu curry with rice', { s: 'D', effort: 3, spice: 1, groups: ['vegetable', 'cereal', 'fried'], base: 'rice', veg: ['potato', 'carrot', 'onion'], ingredients: ['panko breadcrumbs', 'maida', 'curry roux'], al: ['wheat', 'soy', 'milk'], aliases: ['katsu curry'] }),
  g('japanese', 'miso_soup', 'Miso soup with tofu', { s: 'SD', effort: 1, diet: 'vegan', spice: 0, groups: ['pulse'], ingredients: ['miso', 'tofu', 'seaweed'], light: true, al: ['soy'] }),
  g('japanese', 'yaki_udon', 'Yaki udon', { s: 'D', effort: 1, diet: 'vegan', spice: 0, groups: ['cereal', 'vegetable'], veg: ['cabbage', 'carrot', 'mushroom'], ingredients: ['udon noodles', 'soy sauce'], al: SOY_SAUCE }),

  // ---------- Korean ----------
  g('korean', 'bibimbap', 'Bibimbap', { s: 'LD', effort: 2, diet: 'egg', spice: 2, groups: ['cereal', 'vegetable', 'egg_meat'], base: 'rice', veg: ['spinach', 'carrot', 'mushroom'], ingredients: ['egg', 'gochujang', 'sesame oil'], al: ['wheat', 'soy'] }),
  g('korean', 'kimchi_fried_rice', 'Kimchi fried rice', { s: 'LMD', effort: 1, diet: 'vegan', spice: 2, groups: ['cereal', 'vegetable'], base: 'rice', veg: ['onion'], ingredients: ['vegan kimchi', 'gochujang', 'sesame oil'], portable: true, al: ['wheat', 'soy'] }),
  g('korean', 'japchae', 'Japchae glass noodles', { s: 'LMD', effort: 2, diet: 'vegan', spice: 0, groups: ['vegetable'], veg: ['spinach', 'carrot', 'capsicum', 'onion', 'mushroom'], ingredients: ['sweet potato noodles', 'soy sauce', 'sesame oil'], portable: true, al: SOY_SAUCE }),
  g('korean', 'tteokbokki', 'Tteokbokki rice cakes', { s: 'S', effort: 2, diet: 'vegan', spice: 3, groups: ['cereal'], ingredients: ['rice cakes', 'gochujang'], al: ['wheat', 'soy'] }),
  g('korean', 'korean_fried_chicken', 'Korean fried chicken', { s: 'D', effort: 3, diet: 'nonveg', spice: 2, groups: ['egg_meat', 'fried'], ingredients: ['chicken', 'cornflour', 'gochujang', 'soy sauce'], orderIn: true, weekendy: true, al: ['wheat', 'soy'] }),
  g('korean', 'gyeran_mari', 'Korean rolled omelette', { s: 'BT', effort: 1, diet: 'egg', spice: 0, groups: ['egg_meat', 'vegetable'], veg: ['carrot', 'onion'], ingredients: ['egg'], portable: true, dry: true, aliases: ['gyeran mari'] }),

  // ---------- Middle Eastern ----------
  g('middle_eastern', 'falafel_wrap', 'Falafel wrap with hummus', { s: 'LMD', effort: 2, diet: 'vegan', spice: 1, groups: ['pulse', 'cereal', 'fried'], veg: ['cucumber', 'tomato', 'onion'], ingredients: ['chickpeas', 'pita bread', 'tahini'], portable: true, al: ['sesame'], aliases: ['falafel'] }),
  g('middle_eastern', 'hummus_pita', 'Hummus with pita and veg sticks', { s: 'MS', effort: 1, diet: 'vegan', spice: 0, groups: ['pulse', 'cereal', 'vegetable'], veg: ['cucumber', 'carrot'], ingredients: ['chickpeas', 'tahini', 'pita bread'], portable: true, light: true, al: ['sesame'], aliases: ['hummus'] }),
  g('middle_eastern', 'shakshuka', 'Shakshuka with bread', { s: 'BD', effort: 1, diet: 'egg', spice: 1, groups: ['egg_meat', 'vegetable'], veg: ['tomato', 'capsicum', 'onion'], ingredients: ['egg', 'bread'] }),
  g('middle_eastern', 'mujaddara', 'Mujaddara (lentils and rice)', { s: 'LMD', effort: 2, diet: 'vegan', spice: 0, groups: ['pulse', 'cereal'], base: 'rice', veg: ['onion'], ingredients: ['brown lentils'], portable: true, comfort: true }),
  g('middle_eastern', 'chicken_shawarma', 'Chicken shawarma wrap', { s: 'D', effort: 2, diet: 'nonveg', spice: 1, groups: ['egg_meat', 'cereal'], veg: ['onion', 'tomato', 'cucumber'], ingredients: ['chicken', 'pita bread', 'curd'], hidden: ['mayonnaise'], orderIn: true, aliases: ['shawarma'] }),
  g('middle_eastern', 'fattoush', 'Fattoush salad', { s: 'LS', effort: 1, diet: 'vegan', spice: 0, groups: ['vegetable', 'cereal'], veg: ['cucumber', 'tomato', 'onion'], ingredients: ['pita bread', 'lettuce', 'sumac'], light: true }),
  g('middle_eastern', 'lentil_soup', 'Red lentil soup with bread', { s: 'LSD', effort: 1, diet: 'vegan', spice: 1, groups: ['pulse'], veg: ['carrot', 'onion'], ingredients: ['red lentils', 'bread', 'lemon'], light: true, comfort: true }),

  // ---------- Mediterranean ----------
  g('mediterranean', 'greek_salad', 'Greek salad with pita', { s: 'LS', effort: 1, spice: 0, groups: ['vegetable', 'dairy'], veg: ['cucumber', 'tomato', 'onion', 'capsicum'], ingredients: ['feta cheese', 'olives', 'pita bread'], light: true }),
  g('mediterranean', 'spanakopita', 'Spinach and feta pie', { s: 'LD', effort: 3, diet: 'egg', spice: 0, groups: ['greens', 'dairy', 'cereal'], veg: ['spinach', 'onion'], ingredients: ['filo pastry', 'feta cheese', 'egg'], al: ['wheat'], weekendy: true, aliases: ['spanakopita'] }),
  g('mediterranean', 'veg_couscous', 'Vegetable couscous with chickpeas', { s: 'LMD', effort: 1, diet: 'vegan', spice: 0, groups: ['cereal', 'vegetable', 'pulse'], veg: ['capsicum', 'carrot', 'tomato'], ingredients: ['couscous', 'chickpeas'], portable: true, al: ['wheat'] }),
  g('mediterranean', 'ratatouille', 'Ratatouille with bread', { s: 'D', effort: 2, diet: 'vegan', spice: 0, groups: ['vegetable'], veg: ['brinjal', 'capsicum', 'tomato', 'onion'], ingredients: ['zucchini', 'bread', 'olive oil'], light: true }),
  g('mediterranean', 'grilled_fish_lemon', 'Grilled fish with lemon and herbs', { s: 'LD', effort: 2, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'vegetable'], veg: ['potato', 'beans'], ingredients: ['fish', 'lemon', 'olive oil'], light: true }),
  g('mediterranean', 'chicken_souvlaki', 'Chicken souvlaki with tzatziki', { s: 'D', effort: 2, diet: 'nonveg', spice: 0, groups: ['egg_meat', 'cereal', 'dairy'], veg: ['cucumber', 'onion'], ingredients: ['chicken', 'pita bread', 'curd'], aliases: ['souvlaki'] }),
  g('mediterranean', 'stuffed_peppers', 'Rice-stuffed peppers', { s: 'D', effort: 2, diet: 'vegan', spice: 0, groups: ['vegetable', 'cereal'], base: 'rice', veg: ['capsicum', 'tomato', 'onion'], ingredients: ['olive oil'] }),
];
