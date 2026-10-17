import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/ui/theme';

function icon(e: string) {
  function TabIcon({ focused }: { focused: boolean }) {
    const c = useColors();
    return <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 38, height: 30, borderRadius: 11, backgroundColor: focused ? c.primarySoft : 'transparent', alignItems: 'center', justifyContent: 'center' }}><Text accessible={false} aria-hidden style={{ fontSize: 21, color: focused ? c.primary : c.muted }}>{e}</Text></View>;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 72, paddingTop: 8, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('◷') }} />
      <Tabs.Screen name="plan" options={{ title: 'Week', tabBarIcon: icon('▦') }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: icon('＋') }} />
      <Tabs.Screen name="history" options={{ title: 'Memory', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: icon('⌂') }} />
    </Tabs>
  );
}
