import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { LANG_LABEL } from '@/domain/cookcard';
import { AGE_LABEL, DIET_LABEL } from '@/domain/family';
import { describeWeights } from '@/domain/prefs';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, H2, Row, Screen, T } from '@/ui/kit';
import { space, useColors } from '@/ui/theme';

export default function FamilyTab() {
  const family = useFamily();
  const families = useStore((s) => s.families);
  const setActive = useStore((s) => s.setActive);
  const c = useColors();
  if (!family) return null;
  const others = Object.values(families).filter((f) => f.id !== family.id);

  return (
    <Screen title={family.name} subtitle={`${family.members.length} people · ${family.region === 'general' ? 'North + South' : family.region === 'north' ? 'North Indian' : 'South Indian'} kitchen`}>
      <H2 right={<Button small kind="secondary" label="Add" icon="+" onPress={() => router.push({ pathname: '/member', params: { id: 'new' } })} />}>People</H2>
      {family.members.map((m) => (
        <Pressable key={m.id} onPress={() => router.push({ pathname: '/member', params: { id: m.id } })} accessibilityRole="button">
          <Card>
            <Row>
              <View style={{ flex: 1 }}>
                <T bold>
                  {m.name}
                  {m.roles.includes('planner') ? ' · Planner' : ''}
                  {m.roles.includes('cook') ? ' · Cook' : ''}
                </T>
                <T small muted>
                  {m.roles.includes('eater')
                    ? [AGE_LABEL[m.ageBand], DIET_LABEL[m.diet], m.jain ? 'Jain' : '', m.noOnionGarlic && !m.jain ? 'No onion-garlic' : '', m.dayRules.length ? 'Fast days' : '', m.school ? 'School tiffins' : '']
                        .filter(Boolean)
                        .join(' · ')
                    : `Cook · ${LANG_LABEL[m.language ?? 'en']}${m.optedOut ? ' · opted out' : ''}`}
                </T>
              </View>
              <T style={{ color: c.primary }}>›</T>
            </Row>
          </Card>
        </Pressable>
      ))}

      <H2 right={<Button small kind="secondary" label="Edit" onPress={() => router.push('/preferences')} />}>Preferences</H2>
      <Card>
        {family.preferences.length ? (
          family.preferences.map((p) => (
            <View key={p.id} style={{ gap: 2 }}>
              <T>“{p.text}”</T>
              <T small muted>
                {p.memberId ? `${family.members.find((m) => m.id === p.memberId)?.name}: ` : ''}
                {describeWeights(p.weights)}
              </T>
            </View>
          ))
        ) : (
          <T muted>Write what your family likes in plain English — “prefer healthier options”, “less spicy for kids”.</T>
        )}
      </Card>

      <H2>Families</H2>
      <Card>
        <T small muted>
          You can plan for more than one home — for example your parents’ place.
        </T>
        {others.map((f) => (
          <Button key={f.id} kind="ghost" label={`Switch to ${f.name}`} onPress={() => setActive(f.id)} />
        ))}
        <Button kind="secondary" label="Create another family" onPress={() => router.push('/onboarding')} />
      </Card>

      <View style={{ gap: space.sm }}>
        <Button kind="ghost" label="Settings, data and privacy" icon="⚙️" onPress={() => router.push('/settings')} />
      </View>
    </Screen>
  );
}
