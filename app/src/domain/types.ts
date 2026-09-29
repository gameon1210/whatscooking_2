// Core domain types for What's Cooking 2.0 (see FSD section 8).

export type Region = 'north' | 'south' | 'general';

/** Meal slots. Tiffin slots are planned per child. */
export type SlotId = 'breakfast' | 'tiffin_short' | 'tiffin_lunch' | 'lunch' | 'snack' | 'dinner';

export const TIFFIN_SLOTS: SlotId[] = ['tiffin_short', 'tiffin_lunch'];

export type Diet = 'vegan' | 'veg' | 'egg' | 'nonveg';

export type FoodGroup =
  | 'cereal'
  | 'millet'
  | 'pulse'
  | 'vegetable'
  | 'greens'
  | 'dairy'
  | 'egg_meat'
  | 'fried'
  | 'fruit';

export type Base = 'rice' | 'roti' | 'other';

export interface Qty {
  item: string;
  perPerson: number;
  unit: string;
}

export interface Dish {
  id: string;
  name: string;
  aliases: string[];
  regions: Region[];
  slots: SlotId[];
  /** 1 = quick (<20 min), 2 = medium, 3 = heavy */
  effort: 1 | 2 | 3;
  diet: Diet;
  onionGarlic: boolean;
  jainOk: boolean;
  /** OK on a vrat/fasting day */
  vratOk: boolean;
  /** 0 = mild ... 3 = hot */
  spice: 0 | 1 | 2 | 3;
  groups: FoodGroup[];
  base: Base;
  /** vegetables used (for "what's available") */
  veg: string[];
  /** shopping ingredients beyond staples */
  ingredients: string[];
  portable?: boolean;
  dry?: boolean;
  soft?: boolean;
  light?: boolean;
  comfort?: boolean;
  weekendy?: boolean;
  /** good to order in from a restaurant */
  orderIn?: boolean;
  /** leftovers of this dish can become these dishes */
  leftoverTo?: string[];
  qty?: Qty[];
  custom?: boolean;
}

export type AgeBand = 'toddler' | 'child' | 'teen' | 'adult' | 'senior';
export type Role = 'planner' | 'cook' | 'eater' | 'shopper';

export type DayRuleKind = 'weekday_no_nonveg' | 'weekday_fast' | 'ekadashi_fast' | 'navratri_fast';

export interface DayRule {
  id: string;
  kind: DayRuleKind;
  /** 0 = Sunday ... 6 = Saturday, for weekday rules */
  weekdays?: number[];
}

export interface SchoolInfo {
  shortBreak: boolean;
  lunchBox: boolean;
  /** 1..6 = Mon..Sat */
  schoolDays: number[];
  /** "HH:MM" pick-up time for the tiffin return check */
  pickup: string;
  holidays: string[];
}

export type CookLanguage = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export interface Member {
  id: string;
  name: string;
  roles: Role[];
  ageBand: AgeBand;
  diet: Diet;
  jain: boolean;
  noOnionGarlic: boolean;
  /** ingredient words to avoid, e.g. "mushroom", "peanut" */
  exclusions: string[];
  allergies: string[];
  /** max spice this member enjoys */
  spice: 0 | 1 | 2 | 3;
  dayRules: DayRule[];
  whatsapp?: string;
  whatsappConsent?: boolean;
  language?: CookLanguage;
  school?: SchoolInfo;
  /** cook only: slots and weekdays the cook works, and dishes they know */
  cookSlots?: SlotId[];
  cookDays?: number[];
  repertoire?: string[];
  optedOut?: boolean;
  /** true for people who eat at home but aren't family (the cook) */
  eatsAtHome: boolean;
}

export type PrefTag =
  | 'fried'
  | 'spice'
  | 'healthy'
  | 'millet'
  | 'greens'
  | 'pulse'
  | 'light'
  | 'rice'
  | 'roti'
  | 'quick'
  | 'nonveg'
  | 'sweet';

export interface Preference {
  id: string;
  memberId?: string;
  text: string;
  weights: Partial<Record<PrefTag, number>>;
  /** days this applies to (0..6); empty = every day */
  weekdays?: number[];
  source: 'rules' | 'llm';
}

export type PlanStatus = 'planned' | 'sent' | 'cooked' | 'ordered_in' | 'skipped';

export interface PlannedMeal {
  id: string;
  date: string; // YYYY-MM-DD
  slot: SlotId;
  /** for tiffins: the child */
  memberId?: string;
  /** ranked options: 1st, 2nd, backup */
  options: string[];
  chosenDishId?: string;
  pinned: boolean;
  status: PlanStatus;
  source: 'today' | 'tomorrow' | 'calendar' | 'cook';
  cookSentAt?: string;
  missing?: string[];
}

export type ReactionKind = 'loved' | 'ok' | 'not_again' | 'tiffin_empty' | 'tiffin_half' | 'tiffin_full';

export interface Reaction {
  memberId: string;
  kind: ReactionKind;
}

export type LogVia = 'voice' | 'photo' | 'quick' | 'auto' | 'cook' | 'order' | 'manual';

export interface MealEntry {
  id: string;
  date: string;
  slot: SlotId;
  memberId?: string;
  dishIds: string[];
  via: LogVia;
  photoUri?: string;
  plannedId?: string;
  reactions: Reaction[];
  orderedIn?: boolean;
  confirmed: boolean;
  createdAt: string;
}

export interface Leftover {
  id: string;
  dishId: string;
  amount: 'little' | 'half' | 'lots';
  date: string;
  slot: SlotId;
  resolved: boolean;
}

export interface LeftoverDecision {
  id: string;
  fromDishId: string;
  becameDishId: string | null;
  date: string;
}

export interface RecEvent {
  date: string;
  slot: SlotId;
  dishId: string;
  outcome: 'accepted' | 'swiped';
}

export interface HiddenDish {
  dishId: string;
  until?: string; // YYYY-MM-DD, undefined = forever
}

export interface CartItem {
  id: string;
  name: string;
  forDate?: string;
  source: 'plan' | 'cook' | 'manual';
  done: boolean;
}

export interface FamilySettings {
  planSlots: SlotId[]; // non-tiffin slots the family plans
  tomorrowTime: string; // "21:00"
  cookCardTime: string; // "21:30"
  adventurous: number; // 0..100
  learningPaused: boolean;
  balanceBoost: boolean;
  city: string;
  plannerPhone?: string;
  cookPageBase: string;
  geminiEnabled: boolean;
}

export interface Family {
  id: string;
  name: string;
  region: Region;
  createdAt: string;
  members: Member[];
  preferences: Preference[];
  staples: string[];
  favourites: string[]; // onboarding picks, cold-start history
  customDishes: Dish[];
  planned: PlannedMeal[];
  entries: MealEntry[];
  leftovers: Leftover[];
  leftoverDecisions: LeftoverDecision[];
  events: RecEvent[];
  hidden: HiddenDish[];
  cart: CartItem[];
  customFastDates: string[];
  settings: FamilySettings;
}

export type ChipId = 'quick' | 'low_energy' | 'guests' | 'rainy' | 'sick' | 'sunday' | 'leftovers';

export interface Driver {
  key: string;
  label: string;
  value: number;
}

export interface Suggestion {
  dish: Dish;
  score: number;
  drivers: Driver[];
  reason: string;
  novel: boolean;
}

export interface Plate {
  memberIds: string[];
  label: string;
  suggestions: Suggestion[];
}
