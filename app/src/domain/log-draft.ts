import type { ParsedLog } from './parse';
import type { LogVia } from './types';

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
