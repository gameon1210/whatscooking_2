// Core domain types for What's Cooking 2.0 (see FSD section 8).

export type Region = 'north' | 'south' | 'general';

/** World cuisines a family cooks (1.0.4). Indian dishes keep their North/South region on top. */
export type Cuisine =
  | 'indian'
  | 'indo_chinese'
  | 'italian'
  | 'mexican'
  | 'chinese'
  | 'thai'
  | 'continental'
  | 'japanese'
  | 'korean'
  | 'middle_eastern'
  | 'mediterranean';

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
  /** world cuisine; unset = Indian (1.0.4) */
  cuisine?: Cuisine;
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
  /**
   * Canonical allergens this dish contains (milk, wheat, peanut, nuts, egg, soy, fish,
   * sesame, coconut, mustard). Derived from the recipe for catalogue dishes.
   */
  allergens?: string[];
  /** Allergens a word-match would wrongly add (e.g. "akki roti" is rice, not wheat). */
  allergenFree?: string[];
  /** Ingredients that aren't shopped for but matter for allergy checks (ghee, butter…). */
  hidden?: string[];
  /** Custom dish whose diet and allergens the user hasn't confirmed yet (D03). */
  unverified?: boolean;
  /** false = can't sensibly be cooked milder (spice is hard, FR-211). */
  mildOk?: boolean;
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
  language?: CookLanguage;
  school?: SchoolInfo;
  /** cook only: slots and weekdays the cook works, and dishes they know */
  cookSlots?: SlotId[];
  cookDays?: number[];
  repertoire?: string[];
  /** cook only: dated leave (YYYY-MM-DD) */
  leaveDates?: string[];
  /** extra fast dates for this member (YYYY-MM-DD), on top of the calendar rules */
  fastDates?: string[];
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
  | 'sweet'
  | 'maida';

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
  /** for tiffins: the child. For a split plate: the plate key (its first member). */
  memberId?: string;
  /** everyone this plate is for (FR-213). Empty/undefined = the family plate. */
  forMemberIds?: string[];
  /** ranked options: 1st, 2nd, backup */
  options: string[];
  chosenDishId?: string;
  pinned: boolean;
  status: PlanStatus;
  source: 'today' | 'tomorrow' | 'calendar' | 'cook';
  /** WhatsApp was opened with the card; not proof it was sent (D36). */
  cookOpenedAt?: string;
  /** the planner confirmed the message was sent */
  cookSentAt?: string;
  /** the cook replied from the Cook page */
  cookAckAt?: string;
  /** id of the Cook Card this meal last went out on */
  cardId?: string;
  missing?: string[];
  /** the cook asked for a different dish (FR-233) */
  changeRequested?: boolean;
  /** two alternates offered to the planner after a change request */
  alternates?: string[];
}

/** A Cook Card the app issued. Replies are only accepted against one of these (D23). */
export interface CookCardRecord {
  id: string;
  cookId: string;
  date: string;
  createdAt: string;
  /** ISO time after which replies are refused */
  expiresAt: string;
  sig: string;
  /** dish ids in the order the cook saw them */
  items: { planId: string; options: string[] }[];
  repliedAt?: string;
  revoked?: boolean;
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
  forMemberIds?: string[];
  dishIds: string[];
  via: LogVia;
  photoUri?: string;
  plannedId?: string;
  reactions: Reaction[];
  orderedIn?: boolean;
  confirmed: boolean;
  createdAt: string;
  /** set when the meal was corrected after it was logged (1.0.3) */
  editedAt?: string;
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
  outcome: 'accepted' | 'swiped' | 'cook_changed';
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
  /** Exact planned ingredient needs covered by this purchase. */
  needKeys?: string[];
  quantity?: string;
  archived?: boolean;
}

export interface FamilySettings {
  /** Optional for existing households; defaults never change meal data. */
  home?: Partial<HomePreferences>;
  planSlots: SlotId[]; // non-tiffin slots the family plans
  tomorrowTime: string; // "21:00"
  cookCardTime: string; // "21:30"
  adventurous: number; // 0..100
  /** Prefer different dishes across a suggested week. */
  weekVariety?: boolean;
  learningPaused: boolean;
  /** ISO time learning was paused; meals logged after it are ignored by ranking (D16) */
  learningPausedAt?: string;
  balanceBoost: boolean;
  city: string;
  cookPageBase: string;
  geminiEnabled: boolean;
  /**
   * Master switch for the food calendar: fasts, Ekadashi/Navratri, no-non-veg days (1.0.4).
   * Off: the rules are paused (kept, not applied, not shown). Unset (new and older
   * families) means "on only if a calendar rule exists", so it starts off and nobody
   * loses a rule silently.
   */
  foodCalendar?: boolean;
  /** cuisines the family cooks; unset = DEFAULT_CUISINES (1.0.4) */
  cuisines?: Cuisine[];
}

export type KitchenTheme = 'saffron' | 'sage' | 'rose' | 'cocoa' | 'system';
export type KitchenCover = 'table' | 'garden' | 'photo';
export interface HomePreferences {
  theme: KitchenTheme;
  cover: KitchenCover;
  photoUri?: string;
  photoPosition: 'top' | 'center' | 'bottom';
  headline: string;
  showFamily: boolean;
  showWeather: boolean;
  showPantry: boolean;
  showTomorrow: boolean;
  showMemories: boolean;
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
  cookCards: CookCardRecord[];
  /** device-local secret used to sign Cook Card links */
  secret: string;
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
  /** members who need the mild version of this dish */
  mildFor?: string[];
}

export interface Plate {
  memberIds: string[];
  label: string;
  suggestions: Suggestion[];
}
