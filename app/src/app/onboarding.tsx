import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MemberForm } from '@/components/MemberForm';
import { CATALOG } from '@/domain/catalog';
import { AGE_LABEL, DIET_LABEL, newFamily, newMember } from '@/domain/family';
import type { Member, Region } from '@/domain/types';
import { scheduleFamilyReminders } from '@/services/notify';
import { useStore } from '@/state/store';
import { Button, Card, H2, Input, Row, Screen, Segmented, Sheet, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

/** FR-214 / FR-216: create a family in under 2 minutes. */
export default function Onboarding() {
  const c = useColors();
  const addFamily = useStore((s) => s.addFamily);
  const hasFamilies = useStore((s) => Object.keys(s.families).length > 0);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [region, setRegion] = useState<Region>('south');
  const [me, setMe] = useState('');
  const [phone, setPhone] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [favs, setFavs] = useState<string[]>([]);

  const pickable = useMemo(
    () => CATALOG.filter((d) => (region === 'general' || d.regions.includes(region) || d.regions.includes('general')) && d.slots.some((s) => s !== 'snack')),
    [region],
  );

  const finish = async () => {
    const f = newFamily(name.trim() || 'Our family', region);
    const planner = newMember(me.trim() || 'Me', { roles: ['planner', 'eater', 'shopper'], whatsapp: phone, whatsappConsent: !!phone });
    f.members = [planner, ...members];
    f.favourites = favs;
    f.settings.plannerPhone = phone;
    if (members.some((m) => m.school)) f.settings.planSlots = ['breakfast', 'lunch', 'dinner'];
    addFamily(f);
    scheduleFamilyReminders(f).catch(() => {});
    router.replace('/');
  };

  return (
    <Screen title={step === 0 ? 'What’s Cooking' : step === 1 ? 'Who eats at home?' : 'Dishes you make often'} subtitle={['Your family’s food decisions, sorted in seconds.', 'Add everyone, including your cook if you have one.', `Pick about 10 — ${favs.length} picked`][step]}>
      {step === 0 ? (
        <Card>
          <Input label="Family name" value={name} onChangeText={setName} placeholder="e.g. The Sharmas" />
          <Input label="Your name" value={me} onChangeText={setMe} placeholder="e.g. Priya" />
          <Input label="Your WhatsApp number (so the cook can reply)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile" />
          <T small muted bold>
            Your kitchen
          </T>
          <Segmented<Region>
            value={region}
            onChange={setRegion}
            options={[
              { value: 'south', label: 'South Indian' },
              { value: 'north', label: 'North Indian' },
              { value: 'general', label: 'Mix of both' },
            ]}
          />
          <Button label="Next" onPress={() => setStep(1)} disabled={!me.trim()} />
          {hasFamilies ? <Button kind="ghost" label="Cancel" onPress={() => router.back()} /> : null}
        </Card>
      ) : null}

      {step === 1 ? (
        <>
          <Card tone="alt">
            <T bold>{me || 'You'} · Planner</T>
            <T small muted>
              Adult · Vegetarian (edit later in Family)
            </T>
          </Card>
          {members.map((m) => (
            <Pressable key={m.id} onPress={() => setEditing(m)} accessibilityRole="button">
              <Card>
                <T bold>
                  {m.name} {m.roles.includes('cook') ? '· Cook' : ''}
                </T>
                <T small muted>
                  {m.roles.includes('eater') ? `${AGE_LABEL[m.ageBand]} · ${DIET_LABEL[m.diet]}${m.jain ? ' · Jain' : ''}${m.school ? ' · School tiffins' : ''}` : 'Doesn’t eat here'}
                </T>
              </Card>
            </Pressable>
          ))}
          <Row wrap>
            <Button kind="secondary" label="Add child" icon="🧒" onPress={() => setEditing(newMember('', { ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '15:30', holidays: [] } }))} />
            <Button kind="secondary" label="Add adult" icon="🧑" onPress={() => setEditing(newMember(''))} />
            <Button kind="secondary" label="Add elder" icon="👵" onPress={() => setEditing(newMember('', { ageBand: 'senior' }))} />
            <Button kind="secondary" label="Add cook" icon="👩‍🍳" onPress={() => setEditing(newMember('', { roles: ['cook'], eatsAtHome: false, language: 'kn', cookDays: [1, 2, 3, 4, 5, 6], cookSlots: ['breakfast', 'tiffin_short', 'tiffin_lunch', 'lunch'] }))} />
          </Row>
          <Row>
            <Button kind="ghost" label="Back" onPress={() => setStep(0)} />
            <Button label="Next" onPress={() => setStep(2)} style={{ flex: 1 }} />
          </Row>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {pickable.map((d) => {
              const on = favs.includes(d.id);
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setFavs(on ? favs.filter((x) => x !== d.id) : [...favs, d.id])}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: on ? c.primary : c.card, borderWidth: 1, borderColor: on ? c.primary : c.border }}>
                  <Text style={{ color: on ? c.primaryText : c.text, fontWeight: '600' }}>{d.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Row>
            <Button kind="ghost" label="Back" onPress={() => setStep(1)} />
            <Button label={favs.length ? 'Start planning' : 'Skip and start'} onPress={finish} style={{ flex: 1 }} />
          </Row>
        </>
      ) : null}

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={editing?.name ? editing.name : 'New member'}>
        {editing ? (
          <>
            <MemberForm value={editing} onChange={setEditing} />
            <H2> </H2>
            <Row>
              {members.some((m) => m.id === editing.id) ? (
                <Button
                  kind="danger"
                  label="Remove"
                  onPress={() => {
                    setMembers(members.filter((m) => m.id !== editing.id));
                    setEditing(null);
                  }}
                />
              ) : null}
              <Button
                label="Save"
                style={{ flex: 1 }}
                disabled={!editing.name.trim()}
                onPress={() => {
                  setMembers((ms) => (ms.some((m) => m.id === editing.id) ? ms.map((m) => (m.id === editing.id ? editing : m)) : [...ms, editing]));
                  setEditing(null);
                }}
              />
            </Row>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
