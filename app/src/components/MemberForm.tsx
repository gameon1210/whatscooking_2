import React, { useState } from 'react';
import { View } from 'react-native';

import { LANG_LABEL } from '@/domain/cookcard';
import { weekdayShort } from '@/domain/dates';
import { AGE_LABEL, DIET_LABEL, ROLE_LABEL } from '@/domain/family';
import type { AgeBand, CookLanguage, Diet, DayRule, Member, Role, SlotId } from '@/domain/types';
import { Chip, Divider, H2, Input, Row, Segmented, T, Toggle } from '@/ui/kit';
import { space } from '@/ui/theme';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const COOK_SLOTS: { v: SlotId; l: string }[] = [
  { v: 'breakfast', l: 'Breakfast' },
  { v: 'tiffin_short', l: 'Short-break box' },
  { v: 'tiffin_lunch', l: 'Lunch box' },
  { v: 'lunch', l: 'Lunch' },
  { v: 'snack', l: 'Snack' },
  { v: 'dinner', l: 'Dinner' },
];

function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <Row wrap>
      {WEEK.map((d) => (
        <Chip key={d} label={weekdayShort(d)} selected={value.includes(d)} onPress={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])} />
      ))}
    </Row>
  );
}

export function MemberForm({ value, onChange }: { value: Member; onChange: (m: Member) => void }) {
  const m = value;
  const set = (patch: Partial<Member>) => onChange({ ...m, ...patch });
  const isCook = m.roles.includes('cook');
  const kid = m.ageBand === 'child' || m.ageBand === 'teen' || m.ageBand === 'toddler';
  const rule = (kind: DayRule['kind']) => m.dayRules.find((r) => r.kind === kind);
  const setRule = (kind: DayRule['kind'], on: boolean, weekdays?: number[]) => {
    const others = m.dayRules.filter((r) => r.kind !== kind);
    set({ dayRules: on ? [...others, { id: kind, kind, weekdays }] : others });
  };
  const [excl, setExcl] = useState([...m.exclusions].join(', '));
  const [allergy, setAllergy] = useState([...m.allergies].join(', '));

  return (
    <View style={{ gap: space.md }}>
      <Input label="Name" value={m.name} onChangeText={(name) => set({ name })} placeholder="e.g. Aarav" />
      <T small muted bold>
        Role
      </T>
      <Row wrap>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <Chip
            key={r}
            label={ROLE_LABEL[r]}
            selected={m.roles.includes(r)}
            onPress={() => {
              const roles = m.roles.includes(r) ? m.roles.filter((x) => x !== r) : [...m.roles, r];
              set({ roles, eatsAtHome: roles.includes('eater') });
            }}
          />
        ))}
      </Row>

      {m.roles.includes('eater') ? (
        <>
          <T small muted bold>
            Age
          </T>
          <Segmented<AgeBand>
            value={m.ageBand}
            onChange={(ageBand) => set({ ageBand })}
            options={(Object.keys(AGE_LABEL) as AgeBand[]).map((a) => ({ value: a, label: AGE_LABEL[a] }))}
          />
          <T small muted bold>
            Diet
          </T>
          <Segmented<Diet> value={m.diet} onChange={(diet) => set({ diet })} options={(Object.keys(DIET_LABEL) as Diet[]).map((d) => ({ value: d, label: DIET_LABEL[d] }))} />
          <Toggle label="Jain" hint="No onion, garlic or root vegetables" value={m.jain} onChange={(jain) => set({ jain, noOnionGarlic: jain || m.noOnionGarlic })} />
          <Toggle label="No onion-garlic (satvik)" value={m.noOnionGarlic} onChange={(noOnionGarlic) => set({ noOnionGarlic })} />
          <T small muted bold>
            Spice they enjoy
          </T>
          <Segmented<string>
            value={String(m.spice)}
            onChange={(v) => set({ spice: Number(v) as Member['spice'] })}
            options={[
              { value: '0', label: 'None' },
              { value: '1', label: 'Mild' },
              { value: '2', label: 'Medium' },
              { value: '3', label: 'Hot' },
            ]}
          />
          <Input
            label="Allergies (comma separated)"
            value={allergy}
            onChangeText={(t) => {
              setAllergy(t);
              set({ allergies: t.split(',').map((x) => x.trim()).filter(Boolean) });
            }}
            placeholder="e.g. peanut"
          />
          <Input
            label="Doesn’t eat (comma separated)"
            value={excl}
            onChangeText={(t) => {
              setExcl(t);
              set({ exclusions: t.split(',').map((x) => x.trim()).filter(Boolean) });
            }}
            placeholder="e.g. mushroom, brinjal"
          />

          <Divider />
          <H2>Food calendar</H2>
          <Toggle label="Fasts on Ekadashi" value={!!rule('ekadashi_fast')} onChange={(v) => setRule('ekadashi_fast', v)} />
          <Toggle label="Fasts during Navratri" value={!!rule('navratri_fast')} onChange={(v) => setRule('navratri_fast', v)} />
          <Toggle
            label="Weekly fast day"
            hint="Vrat food only on these days"
            value={!!rule('weekday_fast')}
            onChange={(v) => setRule('weekday_fast', v, rule('weekday_fast')?.weekdays ?? [1])}
          />
          {rule('weekday_fast') ? <DayPicker value={rule('weekday_fast')!.weekdays ?? []} onChange={(d) => setRule('weekday_fast', true, d)} /> : null}
          {m.diet === 'nonveg' || m.diet === 'egg' ? (
            <>
              <Toggle
                label="No non-veg on certain days"
                value={!!rule('weekday_no_nonveg')}
                onChange={(v) => setRule('weekday_no_nonveg', v, rule('weekday_no_nonveg')?.weekdays ?? [2])}
              />
              {rule('weekday_no_nonveg') ? <DayPicker value={rule('weekday_no_nonveg')!.weekdays ?? []} onChange={(d) => setRule('weekday_no_nonveg', true, d)} /> : null}
            </>
          ) : null}

          {kid ? (
            <>
              <Divider />
              <H2>School tiffins</H2>
              <Toggle
                label="Goes to school"
                value={!!m.school}
                onChange={(v) => set({ school: v ? { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '15:30', holidays: [] } : undefined })}
              />
              {m.school ? (
                <>
                  <Toggle label="Short-break box" value={m.school.shortBreak} onChange={(shortBreak) => set({ school: { ...m.school!, shortBreak } })} />
                  <Toggle label="Lunch box" value={m.school.lunchBox} onChange={(lunchBox) => set({ school: { ...m.school!, lunchBox } })} />
                  <T small muted bold>
                    School days
                  </T>
                  <DayPicker value={m.school.schoolDays} onChange={(schoolDays) => set({ school: { ...m.school!, schoolDays } })} />
                  <Input
                    label="Pick-up time (for the tiffin check)"
                    value={m.school.pickup}
                    onChangeText={(pickup) => set({ school: { ...m.school!, pickup } })}
                    placeholder="15:30"
                  />
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {isCook ? (
        <>
          <Divider />
          <H2>Cook</H2>
          <T small muted bold>
            Language for the Cook Card
          </T>
          <Segmented<CookLanguage> value={m.language ?? 'en'} onChange={(language) => set({ language })} options={(Object.keys(LANG_LABEL) as CookLanguage[]).map((l) => ({ value: l, label: LANG_LABEL[l] }))} />
          <T small muted bold>
            Works on
          </T>
          <DayPicker value={m.cookDays ?? []} onChange={(cookDays) => set({ cookDays })} />
          <T small muted bold>
            Cooks these meals
          </T>
          <Row wrap>
            {COOK_SLOTS.map((s) => (
              <Chip
                key={s.v}
                label={s.l}
                selected={(m.cookSlots ?? []).includes(s.v)}
                onPress={() => {
                  const cur = m.cookSlots ?? [];
                  set({ cookSlots: cur.includes(s.v) ? cur.filter((x) => x !== s.v) : [...cur, s.v] });
                }}
              />
            ))}
          </Row>
          {m.optedOut ? (
            <Toggle label="Opted out of Cook Cards" hint="Turn off to resume (only if they agree)" value={true} onChange={() => set({ optedOut: false })} />
          ) : null}
        </>
      ) : null}

      <Divider />
      <Input label="WhatsApp number (optional)" keyboardType="phone-pad" value={m.whatsapp ?? ''} onChangeText={(whatsapp) => set({ whatsapp })} placeholder="10-digit mobile" />
      {m.whatsapp ? (
        <Toggle
          label="They agreed to get messages from this app"
          hint="Required before sending Cook Cards or votes (FR-292)"
          value={!!m.whatsappConsent}
          onChange={(whatsappConsent) => set({ whatsappConsent })}
        />
      ) : null}
    </View>
  );
}
