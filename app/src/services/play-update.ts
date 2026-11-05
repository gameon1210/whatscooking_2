import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { warn } from '@/ui/feedback';

const PlayUpdate = Platform.OS === 'android'
  ? requireOptionalNativeModule<{ availableVersionCode(): Promise<number | null> }>('WhatsCookingPlayUpdate')
  : null;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.gameon1210.whatscooking';
const SHOWN_VERSION = 'whatscooking:play-update:shown';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
let lastCheck = 0;
let lastPrompted: number | null = null;
let pendingCheck: Promise<number | null> | undefined;

export async function checkPlayUpdate(): Promise<number | null> {
  if (!PlayUpdate) throw new Error('Update checks need the Android app from Google Play.');
  pendingCheck ??= PlayUpdate.availableVersionCode().finally(() => { pendingCheck = undefined; });
  return pendingCheck;
}

export function showPlayUpdate(version: number) {
  lastPrompted = version;
  AsyncStorage.setItem(SHOWN_VERSION, String(version)).catch(() => {});
  Alert.alert('Update available', 'A newer version of What’s Cooking is ready on Google Play.', [
    { text: 'Later', style: 'cancel' },
    { text: 'Open Google Play', onPress: () => { Linking.openURL(PLAY_STORE_URL).catch(() => warn('Couldn’t open Google Play.')); } },
  ]);
}

export function usePlayUpdatePrompt(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !PlayUpdate) return;
    let mounted = true;
    const check = async () => {
      if (AppState.currentState !== 'active' || Date.now() - lastCheck < CHECK_INTERVAL) return;
      lastCheck = Date.now();
      try {
        const version = await checkPlayUpdate();
        if (!version) return;
        const shown = await AsyncStorage.getItem(SHOWN_VERSION).catch(() => null);
        if (!mounted) return;
        if (AppState.currentState !== 'active') {
          lastCheck = 0;
          return;
        }
        if (version !== lastPrompted && shown !== String(version)) showPlayUpdate(version);
      } catch {
        // Sideloaded apps and temporarily unavailable Play Store need no interruption.
      }
    };
    void check();
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void check(); });
    return () => { mounted = false; listener.remove(); };
  }, [enabled]);
}
