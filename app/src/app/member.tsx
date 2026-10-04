import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { MemberForm } from '@/components/MemberForm';
import { recheckPlans } from '@/domain/actions';
import { validHHMM } from '@/domain/dates';
import { newMember } from '@/domain/family';
import type { Member } from '@/domain/types';
import { scheduleFamilyReminders } from '@/services/notify';
import { useFamily, useStore } from '@/state/store';
import { Button, Row, Screen } from '@/ui/kit';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily();
  const update = useStore((s) => s.update);
  const existing = family?.members.find((m) => m.id === id);
  const [m, setM] = useState<Member>(existing ?? newMember(''));
  if (!family) return null;

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
      .then((problems) => problems.length && useStore.getState().showToast(problems.join('\n')))
      .catch(() => {});
    if (notes.length) useStore.getState().showToast(`${notes.length} planned meal${notes.length > 1 ? 's' : ''} changed to fit the new rules. ${notes[0]}`);
    router.back();
  };

  const remove = () => {
    update((f) => {
      f.members = f.members.filter((x) => x.id !== m.id);
      // Plates and boxes that were only for this person go with them.
      f.planned = f.planned.filter((p) => !(p.memberId === m.id && (p.status === 'planned' || p.status === 'sent')));
      for (const p of f.planned) if (p.forMemberIds) p.forMemberIds = p.forMemberIds.filter((id) => id !== m.id);
    });
    scheduleFamilyReminders(useStore.getState().families[family.id]).catch(() => {});
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <MemberForm value={m} onChange={setM} />
      <Row>
        {existing && !existing.roles.includes('planner') ? <Button kind="danger" label="Remove" onPress={remove} /> : null}
        <Button label="Save" onPress={save} disabled={!m.name.trim() || (!!m.school && !validHHMM(m.school.pickup))} style={{ flex: 1 }} />
      </Row>
    </Screen>
  );
}
