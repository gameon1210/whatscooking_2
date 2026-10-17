import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MemberForm, memberProblem } from '@/components/MemberForm';
import { CATALOG } from '@/domain/catalog';
import { AGE_LABEL, DIET_LABEL, newFamily, newMember } from '@/domain/family';
import type { Member, Region } from '@/domain/types';
import { scheduleFamilyReminders } from '@/services/notify';
import { useStore } from '@/state/store';
import { ok } from '@/ui/feedback';
import { Button, Card, H2, Input, Row, Screen, Segmented, Sheet, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

/** FR-214 / FR-216: create a family in under 2 minutes. */
export default function Onboarding() {
  // Wait for saved data, so an unfinished setup is restored rather than overwritten (R01).
  const hydrated = useStore((s) => s.hydrated);
  return hydrated ? <OnboardingSteps /> : null;
}

function OnboardingSteps() {
  const c = useColors();
  const addFamily = useStore((s) => s.addFamily);
  const hasFamilies = useStore((s) => Object.keys(s.families).length > 0);
  // An unfinished setup comes back after a refresh or app switch (1.0.3, R01).
  const [draft] = useState(() => useStore.getState().setupDraft);
  const [step, setStep] = useState(draft?.step ?? 0);
  const [name, setName] = useState(draft?.name ?? '');
  const [region, setRegion] = useState<Region>(draft?.region ?? 'south');
  const [me, setMe] = useState(draft?.me ?? '');
  const [meError, setMeError] = useState(false);
  const meRef = useRef<TextInput>(null);
  const [memberErrors, setMemberErrors] = useState(false);
  const memberName = useRef<TextInput>(null);
  const memberPickup = useRef<TextInput>(null);
  const [members, setMembers] = useState<Member[]>(draft?.members ?? []);
  const [editing, setEditing] = useState<Member | null>(null);
  const [favs, setFavs] = useState<string[]>(draft?.favs ?? []);

  useEffect(() => {
    if (draft && (draft.me || draft.name || draft.members.length)) ok('Picked up where you left off ✓');
  }, [draft]);

  // Save the draft as it changes; nothing is saved until something was entered.
  useEffect(() => {
    const blank = !name.trim() && !me.trim() && !members.length && !favs.length && step === 0;
    useStore.getState().setSetupDraft(blank ? null : { step, name, region, me, members, favs, savedAt: new Date().toISOString() });
  }, [step, name, region, me, members, favs]);

  const startOver = () => {
    useStore.getState().setSetupDraft(null);
    setStep(0);
    setName('');
    setRegion('south');
    setMe('');
    setMembers([]);
    setFavs([]);
    ok('Cleared. Starting fresh.');
  };

  const pickable = useMemo(
    () => CATALOG.filter((d) => (region === 'general' || d.regions.includes(region) || d.regions.includes('general')) && d.slots.some((s) => s !== 'snack')),
    [region],
  );

  const finish = async () => {
    const f = newFamily(name.trim() || 'Our family', region);
    const planner = newMember(me.trim() || 'Me', { roles: ['planner', 'eater', 'shopper'] });
    f.members = [planner, ...members];
    f.favourites = favs;
    if (members.some((m) => m.school)) f.settings.planSlots = ['breakfast', 'lunch', 'dinner'];
    addFamily(f);
    useStore.getState().setSetupDraft(null);
    scheduleFamilyReminders(f).catch(() => {});
    ok(`${f.name} is ready ✓`);
    router.replace('/');
  };

  return (
    <Screen title={step === 0 ? 'What’s Cooking' : step === 1 ? 'Who eats at home?' : 'Dishes you make often'} subtitle={`Step ${step + 1} of 3 · ${['Your family’s food decisions, sorted in seconds.', 'Add everyone, including your cook if you have one.', `Pick about 10 (optional) — ${favs.length} picked`][step]}`}>
      {step === 0 ? (
        <Card>
          <Input label="Family name" optional value={name} onChangeText={setName} placeholder="e.g. The Sharmas" />
          <Input
            label="Your name"
            inputRef={meRef}
            value={me}
            onChangeText={(t) => {
              setMe(t);
              if (t.trim()) setMeError(false);
            }}
            placeholder="e.g. Priya"
            error={meError ? 'Add your name to continue.' : null}
          />
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
          <Button
            label="Next"
            onPress={() => setStep(1)}
            blockedReason={!me.trim() && 'Add your name to continue.'}
            onBlocked={() => {
              setMeError(true);
              meRef.current?.focus();
            }}
          />
          {hasFamilies ? (
            <Button
              kind="ghost"
              label="Cancel"
              onPress={() => {
                useStore.getState().setSetupDraft(null);
                router.back();
              }}
            />
          ) : null}
          {draft && (me || name || members.length) ? <Button kind="ghost" label="Start over" onPress={startOver} /> : null}
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

      <Sheet
        visible={!!editing}
        onClose={() => {
          setEditing(null);
          setMemberErrors(false);
        }} title={editing?.name ? editing.name : 'New member'}>
        {editing ? (
          <>
            <MemberForm value={editing} onChange={setEditing} showErrors={memberErrors} nameRef={memberName} pickupRef={memberPickup} />
            <H2> </H2>
            <Row>
              {members.some((m) => m.id === editing.id) ? (
                <Button
                  kind="danger"
                  label="Remove"
                  onPress={() => {
                    setMembers(members.filter((m) => m.id !== editing.id));
                    ok(`Removed ${editing.name}`);
                    setEditing(null);
                  }}
                />
              ) : null}
              <Button
                label="Save"
                style={{ flex: 1 }}
                icon="✓"
                blockedReason={memberProblem(editing)}
                onBlocked={() => {
                  setMemberErrors(true);
                  (editing.name.trim() ? memberPickup : memberName).current?.focus();
                }}
                onPress={() => {
                  setMembers((ms) => (ms.some((m) => m.id === editing.id) ? ms.map((m) => (m.id === editing.id ? editing : m)) : [...ms, editing]));
                  ok(`${members.some((m) => m.id === editing.id) ? 'Saved' : 'Added'} ${editing.name.trim()} ✓`);
                  setMemberErrors(false);
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
