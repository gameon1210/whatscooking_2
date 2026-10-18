import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { TextInput } from 'react-native';

import { MemberForm, memberProblem } from '@/components/MemberForm';
import { recheckPlans } from '@/domain/actions';
import { foodCalendarOn } from '@/domain/calendar';
import { newMember } from '@/domain/family';
import type { Member } from '@/domain/types';
import { scheduleFamilyReminders } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
import { confirmThen, ok, warn } from '@/ui/feedback';
import { Button, Row, Screen } from '@/ui/kit';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily();
  const update = useStore((s) => s.update);
  const existing = family?.members.find((m) => m.id === id);
  const [m, setM] = useState<Member>(existing ?? newMember(''));
  const [showErrors, setShowErrors] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const pickupRef = useRef<TextInput>(null);
  if (!family) return null;
  const problem = memberProblem(m);

  const save = () => {
    let notes: string[] = [];
    update((f) => {
      const i = f.members.findIndex((x) => x.id === m.id);
      if (i >= 0) f.members[i] = m;
      else f.members.push(m);
      // New rules apply to meals already planned, not just new suggestions (D05).
      notes = recheckPlans(f);
    });
    const f = useStore.getState().families[family.id];
    scheduleFamilyReminders(f)
      .then((problems) => problems.length && warn(problems.join('\n')))
      .catch(() => {});
    if (notes.length) warn(`Saved ${m.name.trim()}. ${notes.length} planned meal${notes.length > 1 ? 's' : ''} changed to fit the new rules. ${notes[0]}`);
    else ok(`Saved ${m.name.trim()} ✓`);
    router.back();
  };

  const remove = () => confirmThen(`Remove ${m.name || 'this person'} from ${family.name}? Their planned plates and boxes are removed too.`, removeNow, 'Remove');

  const removeNow = () => {
    update((f) => {
      f.members = f.members.filter((x) => x.id !== m.id);
      // Plates and boxes that were only for this person go with them.
      f.planned = f.planned.filter((p) => !(p.memberId === m.id && (p.status === 'planned' || p.status === 'sent')));
      for (const p of f.planned) if (p.forMemberIds) p.forMemberIds = p.forMemberIds.filter((id) => id !== m.id);
    });
    scheduleFamilyReminders(useStore.getState().families[family.id]).catch(() => {});
    ok(`Removed ${m.name}`);
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <MemberForm
        value={m}
        onChange={setM}
        showErrors={showErrors}
        nameRef={nameRef}
        pickupRef={pickupRef}
        calendarOn={foodCalendarOn(family)}
        onCalendarChange={(on) => {
          let notes: string[] = [];
          update((f) => {
            f.settings.foodCalendar = on;
            notes = recheckPlans(f);
          });
          if (notes.length) warn(`Food calendar on. ${notes[0]}`);
          else ok(on ? 'Food calendar on for the family ✓' : 'Food calendar paused');
        }}
      />
      <Row>
        {existing && !existing.roles.includes('planner') ? <Button kind="danger" label="Remove" onPress={remove} /> : null}
        <Button
          label="Save"
          icon="✓"
          onPress={save}
          blockedReason={problem}
          onBlocked={() => {
            setShowErrors(true);
            (m.name.trim() ? pickupRef : nameRef).current?.focus();
          }}
          style={{ flex: 1 }}
        />
      </Row>
    </Screen>
  );
}
