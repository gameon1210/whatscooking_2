// Data migrations, kept free of React Native imports so they can be unit-tested.
import { deriveAllergens } from '@/domain/allergens';
import { uid } from '@/domain/family';
import type { Family } from '@/domain/types';

/** v1 -> v2: fields added by the QA fixes of October 2026. Safe to run more than once. */
export function migrateFamily(f: Family): Family {
  f.cookCards = f.cookCards ?? [];
  f.secret = f.secret ?? uid('s_') + uid();
  // Dishes added before diet and allergens were asked for must be confirmed (D03).
  for (const d of f.customDishes ?? []) {
    if (d.unverified === undefined) d.unverified = true;
    d.allergens = d.allergens ?? deriveAllergens(d);
  }
  if (f.settings.learningPaused && !f.settings.learningPausedAt) f.settings.learningPausedAt = new Date().toISOString();
  // The old build called a meal "sent" as soon as WhatsApp opened. Those cards have
  // no record to match a reply against, so they go back to planned and can be re-sent.
  for (const p of f.planned ?? []) if (p.status === 'sent' && !p.cardId) p.status = 'planned';
  return f;
}

/**
 * v2 -> v3 (1.0.2): the app no longer keeps phone numbers. Every hand-off is a
 * message the user shares and sends to whoever they choose, so saved numbers and
 * the consent flag that went with them are deleted. Safe to run more than once.
 */
export function migrateFamilyV3(f: Family): Family {
  const settings = f.settings as Family['settings'] & { plannerPhone?: string };
  delete settings.plannerPhone;
  for (const m of f.members ?? []) {
    const x = m as typeof m & { whatsapp?: string; whatsappConsent?: boolean };
    delete x.whatsapp;
    delete x.whatsappConsent;
  }
  return f;
}
