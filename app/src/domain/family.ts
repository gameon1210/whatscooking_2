import { DEFAULT_STAPLES } from './catalog';
import { validHHMM } from './dates';
import type { AgeBand, Diet, Family, Member, Region, Role } from './types';

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/**
 * The only things that stop a member from saving (1.0.2): a name, and a real
 * pick-up time when they go to school. Everything else is optional.
 */
export function memberProblem(m: Member): string | null {
  if (!m.name.trim()) return 'Add a name first.';
  if (m.school && !validHHMM(m.school.pickup)) return 'The pick-up time isn’t a time yet. Try 3:30 pm or 15:30.';
  return null;
}

export function newMember(name: string, opts: Partial<Member> = {}): Member {
  const ageBand: AgeBand = opts.ageBand ?? 'adult';
  const kid = ageBand === 'toddler' || ageBand === 'child';
  return {
    id: uid('m_'),
    name,
    roles: ['eater'] as Role[],
    ageBand,
    diet: 'veg' as Diet,
    jain: false,
    noOnionGarlic: false,
    exclusions: [],
    allergies: [],
    spice: kid ? 1 : ageBand === 'senior' ? 1 : 2,
    dayRules: [],
    eatsAtHome: true,
    ...opts,
  };
}

export function newFamily(name: string, region: Region): Family {
  return {
    id: uid('f_'),
    name,
    region,
    createdAt: new Date().toISOString(),
    members: [],
    preferences: [],
    staples: [...DEFAULT_STAPLES],
    favourites: [],
    customDishes: [],
    planned: [],
    entries: [],
    leftovers: [],
    leftoverDecisions: [],
    events: [],
    hidden: [],
    cart: [],
    customFastDates: [],
    cookCards: [],
    secret: uid('s_') + uid(),
    settings: {
      planSlots: ['breakfast', 'lunch', 'dinner'],
      tomorrowTime: '21:00',
      cookCardTime: '21:30',
      adventurous: 20,
      learningPaused: false,
      balanceBoost: true,
      city: 'Bengaluru',
      cookPageBase: 'https://gameon1210.github.io/whatscooking_2/cook.html',
      geminiEnabled: false,
      // foodCalendar is left unset: it reads as off until someone adds a fast or
      // no-non-veg rule, or the family turns it on (tester feedback #6, 1.0.4).
    },
  };
}

export const AGE_LABEL: Record<AgeBand, string> = {
  toddler: 'Toddler (1–4)',
  child: 'Child (5–12)',
  teen: 'Teen (13–17)',
  adult: 'Adult',
  senior: 'Senior (60+)',
};

export const DIET_LABEL: Record<Diet, string> = {
  vegan: 'Vegan',
  veg: 'Vegetarian',
  egg: 'Eggetarian',
  nonveg: 'Non-veg',
};

export const ROLE_LABEL: Record<Role, string> = {
  planner: 'Planner',
  cook: 'Cook',
  eater: 'Eats at home',
  shopper: 'Shopper',
};
