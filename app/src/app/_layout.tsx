import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { AppState, Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { autoLog, expireLeftovers } from '@/domain/actions';
import { todayKey } from '@/domain/dates';
import { useStore } from '@/state/store';
import { palette } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useHousekeeping() {
  const hydrated = useStore((s) => s.hydrated);
  useEffect(() => {
    if (!hydrated) return;
    const run = () => {
      const { activeId, update } = useStore.getState();
      if (!activeId) return;
      update((f) => {
        autoLog(f);
        expireLeftovers(f, todayKey());
      });
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [hydrated]);
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
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
