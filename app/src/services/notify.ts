// Local notifications (free, on-device): Tomorrow plan (FR-260), Cook Card
// reminder (FR-230), tiffin return check (FR-242) and the 9 pm digest of
// auto-logged meals (FR-222). Every notification carries its family id, so one
// family's reminders are replaced without touching another's (D29).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { unconfirmedEntries, unsentForCook } from '@/domain/actions';
import { addDays, addMinutes, parseHHMM, SLOT_LABEL, toKey, validHHMM, weekday } from '@/domain/dates';
import { dishById } from '@/domain/recommender';
import { cookOnDuty } from '@/domain/rules';
import type { Family } from '@/domain/types';
import { draftDay } from '@/state/draft';

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

type Kind = 'tomorrow' | 'tiffin' | 'digest' | 'cook';

/** Cancel only this family's notifications of the given kinds. */
async function cancelFamily(familyId: string, kinds: Kind[]) {
  const list = typeof Notifications.getAllScheduledNotificationsAsync === 'function' ? await Notifications.getAllScheduledNotificationsAsync() : [];
  for (const n of list ?? []) {
    const d = n.content?.data as { familyId?: string; kind?: Kind } | undefined;
    if (d?.familyId === familyId && d.kind && kinds.includes(d.kind)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}

/** Remove everything scheduled for a family (used when the family is deleted). */
export async function cancelFamilyReminders(familyId: string) {
  if (!supported) return;
  await cancelFamily(familyId, ['tomorrow', 'tiffin', 'digest', 'cook']);
}

function tomorrowBody(f: Family, now: Date): string {
  try {
    const date = addDays(toKey(now), 1);
    const parts = draftDay(f, date)
      .filter((r) => r.options[0])
      .slice(0, 4)
      .map((r) => `${r.label.replace(/^\S+\s/, '')}: ${dishById(f, r.options[0])?.name}`);
    if (parts.length) return `${parts.join(' · ')}. Tap to confirm.`;
  } catch {
    // fall through to the generic text
  }
  return 'Breakfast, tiffins and lunch are ready to confirm.';
}

const HORIZON_DAYS = 28;

/**
 * Re-schedule a family's repeating reminders. Returns plain-language problems
 * (for example an invalid time) so the caller can show them; it never throws for
 * bad settings (D26).
 */
export async function scheduleFamilyReminders(f: Family, now = new Date()): Promise<string[]> {
  const problems: string[] = [];
  if (!supported) return problems;
  if (!(await ensurePermission())) return ['Notifications are turned off for this app, so reminders can’t be shown.'];
  await cancelFamily(f.id, ['tomorrow', 'tiffin', 'digest']);
  const data = (kind: Kind, url: string) => ({ url, familyId: f.id, kind });

  if (validHHMM(f.settings.tomorrowTime)) {
    const t = parseHHMM(f.settings.tomorrowTime);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Plan tomorrow in one tap', body: tomorrowBody(f, now), data: data('tomorrow', '/tomorrow') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute },
    });
  } else problems.push(`Tomorrow-plan reminder time “${f.settings.tomorrowTime}” isn’t a valid HH:MM time.`);

  // Tiffin return check 15 minutes after pick-up, only for children who carry a
  // box (D31), on school days that aren't holidays (D30).
  const groups = new Map<string, { time: { hour: number; minute: number }; wd: number; kids: typeof f.members }>();
  for (const m of f.members) {
    const s = m.school;
    if (!s || (!s.shortBreak && !s.lunchBox)) continue;
    if (!validHHMM(s.pickup)) {
      problems.push(`${m.name}’s pick-up time “${s.pickup}” isn’t a valid HH:MM time.`);
      continue;
    }
    const time = addMinutes(parseHHMM(s.pickup), 15);
    for (const wd of s.schoolDays) {
      const key = `${time.hour}:${time.minute}:${wd}`;
      const g = groups.get(key) ?? { time, wd, kids: [] };
      g.kids.push(m);
      groups.set(key, g);
    }
  }
  const today = toKey(now);
  for (const g of groups.values()) {
    const dates: string[] = [];
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const d = addDays(today, i);
      if (weekday(d) === g.wd) dates.push(d);
    }
    const open = dates.filter((d) => g.kids.some((k) => !k.school!.holidays.includes(d)));
    const content = { title: 'How did the tiffins come back?', body: 'Empty, half or full — one tap each.', data: data('tiffin', '/tiffin-check') };
    if (open.length === dates.length) {
      // No holiday in the next four weeks: one repeating reminder (expo weekday: 1 = Sunday).
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: g.wd + 1, hour: g.time.hour, minute: g.time.minute },
      });
    } else {
      // A holiday is coming: schedule the school days one by one and skip it.
      for (const d of open) {
        const [y, mo, da] = d.split('-').map(Number);
        const when = new Date(y, mo - 1, da, g.time.hour, g.time.minute, 0, 0);
        if (when.getTime() <= now.getTime() + 60_000) continue;
        await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when } });
      }
    }
  }

  // 9 pm digest: only when something logged from the plan is still unconfirmed.
  const pending = unconfirmedEntries(f);
  if (pending.length) {
    const when = new Date(now);
    when.setHours(21, 0, 0, 0);
    if (when.getTime() <= now.getTime() + 60_000) when.setDate(when.getDate() + 1);
    const lines = pending.slice(0, 4).map((e) => `${SLOT_LABEL[e.slot]}: ${e.dishIds.map((id) => dishById(f, id)?.name ?? id).join(', ')}`);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Quick check: ${pending.length} meal${pending.length > 1 ? 's' : ''} logged from your plan`,
        body: `${lines.join(' · ')}${pending.length > 4 ? ' …' : ''}. Tap only if something was different.`,
        data: data('digest', '/log'),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  }
  return problems;
}

const cookReminderId = (familyId: string, date: string) => `wc-cook-${familyId}-${date}`;

/**
 * One-off reminder today if tomorrow's Cook Card still has to be sent. Returns
 * null when there is nothing to remind about: no cook on duty, nothing planned,
 * or every meal already sent (D32).
 */
export async function scheduleCookReminder(f: Family, now = new Date()): Promise<string | null> {
  if (!supported) return null;
  const date = addDays(toKey(now), 1);
  const id = cookReminderId(f.id, date);
  const cook = cookOnDuty(f, date);
  const unsent = cook ? unsentForCook(f, date, cook.cookSlots) : [];
  if (!unsent.length || !validHHMM(f.settings.cookCardTime)) {
    await cancelNotification(id);
    return null;
  }
  if (!(await ensurePermission())) return null;
  const t = parseHHMM(f.settings.cookCardTime);
  const when = new Date(now);
  when.setHours(t.hour, t.minute, 0, 0);
  if (when.getTime() < now.getTime() + 60_000) return null;
  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: 'Send tomorrow’s Cook Card', body: `${unsent.length} meal${unsent.length > 1 ? 's' : ''} planned — tap to send on WhatsApp.`, data: { url: '/cook-card', familyId: f.id, kind: 'cook' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

/** Call once a card for `date` has been sent. */
export async function cancelCookReminder(familyId: string, date: string) {
  await cancelNotification(cookReminderId(familyId, date));
}

export async function cancelNotification(id?: string | null) {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // nothing scheduled under this id
  }
}
