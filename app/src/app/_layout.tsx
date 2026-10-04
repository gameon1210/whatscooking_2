import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { autoLog, expireLeftovers } from '@/domain/actions';
import { scheduleFamilyReminders } from '@/services/notify';
import { Toast } from '@/ui/kit';
import { todayKey } from '@/domain/dates';
import { useStore } from '@/state/store';
import { palette } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Keeps every family on this phone current (FR-222, D37): planned meals become
 * logged meals once their slot ends. It runs when the app opens, when it comes
 * back to the foreground, when the active family changes, and once a minute
 * while the app is open, so a slot ending on screen is picked up. The app does
 * not run in the background; anything missed is caught on the next open.
 */
function useHousekeeping() {
  const hydrated = useStore((s) => s.hydrated);
  const activeId = useStore((s) => s.activeId);
  useEffect(() => {
    if (!hydrated) return;
    let lastDay = '';
    const run = () => {
      const { families, updateFamily } = useStore.getState();
      const today = todayKey();
      for (const id of Object.keys(families)) {
        let logged = 0;
        updateFamily(id, (f) => {
          logged = autoLog(f);
          expireLeftovers(f, today);
        });
        // New unconfirmed meals feed the 9 pm digest; refresh once a day regardless
        // so holiday-aware tiffin reminders stay four weeks ahead.
        if (logged || lastDay !== today) scheduleFamilyReminders(useStore.getState().families[id]).catch(() => {});
      }
      lastDay = today;
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    const timer = setInterval(() => AppState.currentState === 'active' && run(), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [hydrated, activeId]);
}

function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? palette.dark : palette.light;
  const hydrated = useStore((s) => s.hydrated);
  const activeId = useStore((s) => s.activeId);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);
  const segments = useSegments();
  useHousekeeping();
  useNotificationRouting();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!activeId && !inOnboarding) router.replace('/onboarding');
  }, [hydrated, activeId, segments]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: c.bg, card: c.card, text: c.text, primary: c.primary, border: c.border } };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerTintColor: c.primary, headerStyle: { backgroundColor: c.bg }, headerTitleStyle: { color: c.text }, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="tomorrow" options={{ title: '' }} />
            <Stack.Screen name="cook-card" options={{ title: '' }} />
            <Stack.Screen name="cook-reply" options={{ title: '' }} />
            <Stack.Screen name="tiffin-check" options={{ title: '' }} />
            <Stack.Screen name="member" options={{ title: 'Family member' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="cart" options={{ title: '' }} />
            <Stack.Screen name="order-in" options={{ title: '' }} />
            <Stack.Screen name="preferences" options={{ title: '' }} />
          </Stack>
          <Toast message={toast} onDone={() => showToast(null)} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
