import type { ParsedLog } from './parse';
import type { LogVia } from './types';

export const LOG_DISH_LIMIT = 12;

export interface MealDraft extends ParsedLog {
  memberId?: string;
  forMemberIds?: string[];
  plannedId?: string;
  via: LogVia;
  photoUri?: string;
  editId?: string;
  orderedIn?: boolean;
}
export interface LogDraft {
  drafts: MealDraft[];
  text: string;
  mode: 'say' | 'pick';
  routeKey: string;
  savedAt: string;
}
