import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Text } from 'react-native';

import { useColors } from '@/ui/theme';

function icon(e: string) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{e}</Text>;
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
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('🍛') }} />
      <Tabs.Screen name="plan" options={{ title: 'Week', tabBarIcon: icon('🗓️') }} />
      <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: icon('🎙️') }} />
      <Tabs.Screen name="history" options={{ title: 'Memory', tabBarIcon: icon('📖') }} />
      <Tabs.Screen name="family" options={{ title: 'Family', tabBarIcon: icon('👨‍👩‍👧') }} />
    </Tabs>
  );
}
