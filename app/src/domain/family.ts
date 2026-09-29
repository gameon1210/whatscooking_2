import { DEFAULT_STAPLES } from './catalog';
import type { AgeBand, Diet, Family, Member, Region, Role } from './types';

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

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
