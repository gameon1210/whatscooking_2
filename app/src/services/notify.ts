// Local notifications (free, on-device): 9 pm Tomorrow plan (FR-260),
// Cook Card reminder (FR-230) and tiffin return check (FR-242).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { parseHHMM } from '@/domain/dates';
import type { Family } from '@/domain/types';

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

/** Re-schedule all repeating reminders for a family. */
export async function scheduleFamilyReminders(f: Family) {
  if (!supported) return;
  if (!(await ensurePermission())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const t = parseHHMM(f.settings.tomorrowTime);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Plan tomorrow in one tap', body: 'Breakfast, tiffins and lunch are ready to confirm.', data: { url: '/tomorrow' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: t.hour, minute: t.minute },
  });
  // Tiffin return check at each child's pick-up time on school days.
  const byTime = new Map<string, Set<number>>();
  for (const m of f.members) {
    if (!m.school) continue;
    const set = byTime.get(m.school.pickup) ?? new Set<number>();
    m.school.schoolDays.forEach((d) => set.add(d));
    byTime.set(m.school.pickup, set);
  }
  for (const [time, days] of byTime) {
    const p = parseHHMM(time);
    for (const d of days) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'How did the tiffins come back?', body: 'Empty, half or full — one tap each.', data: { url: '/tiffin-check' } },
        // expo weekday: 1 = Sunday ... 7 = Saturday
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, hour: p.hour, minute: p.minute + 15 > 59 ? 59 : p.minute + 15 },
      });
    }
  }
}

/** One-off reminder if the Cook Card for tomorrow hasn't been sent. */
export async function scheduleCookReminder(f: Family): Promise<string | null> {
  if (!supported) return null;
  if (!(await ensurePermission())) return null;
  const t = parseHHMM(f.settings.cookCardTime);
  const when = new Date();
  when.setHours(t.hour, t.minute, 0, 0);
  if (when.getTime() < Date.now() + 60_000) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Send tomorrow’s Cook Card', body: 'The plan is set — tap to send it on WhatsApp.', data: { url: '/cook-card' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

export async function cancelNotification(id?: string | null) {
  if (supported && id) await Notifications.cancelScheduledNotificationAsync(id);
}
