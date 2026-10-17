// The feedback rule (1.0.2): every tap ends in a visible answer. Success, a
// problem to fix, or a failure is shown at the bottom of the screen, felt as a
// short vibration, and read out by TalkBack / VoiceOver.
import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Alert, Platform } from 'react-native';

import { ToastTone, useStore } from '@/state/store';

function buzz(tone: ToastTone) {
  if (Platform.OS === 'web') return;
  const kind =
    tone === 'ok' ? Haptics.NotificationFeedbackType.Success : tone === 'warn' ? Haptics.NotificationFeedbackType.Warning : tone === 'error' ? Haptics.NotificationFeedbackType.Error : null;
  if (kind) Haptics.notificationAsync(kind).catch(() => {});
}

export function notify(text: string, tone: ToastTone = 'info') {
  useStore.getState().showToast(text, tone);
  buzz(tone);
  if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(text);
}

/** It worked: "Saved ✓". */
export const ok = (text: string) => notify(text, 'ok');
/** Nothing happened yet, and here is what to fix. */
export const warn = (text: string) => notify(text, 'warn');
/** It failed: say so and what to try. */
export const fail = (text: string) => notify(text, 'error');

/** A readable reason from anything thrown. */
export function errorText(e: unknown): string {
  const m = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return m && m.length < 160 ? m : 'Please try again.';
}

/** Asks before something that can't be undone; runs `yes` only on Yes. */
export function confirmThen(message: string, yes: () => void, yesLabel = 'Yes') {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) yes();
    return;
  }
  Alert.alert('Are you sure?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: yes },
  ]);
}
