import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { MemberForm } from '@/components/MemberForm';
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
    update((f) => {
      const i = f.members.findIndex((x) => x.id === m.id);
      if (i >= 0) f.members[i] = m;
      else f.members.push(m);
    });
    const f = useStore.getState().families[family.id];
    scheduleFamilyReminders(f).catch(() => {});
    router.back();
  };

  const remove = () => {
    update((f) => {
      f.members = f.members.filter((x) => x.id !== m.id);
    });
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <MemberForm value={m} onChange={setM} />
      <Row>
        {existing && !existing.roles.includes('planner') ? <Button kind="danger" label="Remove" onPress={remove} /> : null}
        <Button label="Save" onPress={save} disabled={!m.name.trim()} style={{ flex: 1 }} />
      </Row>
    </Screen>
  );
}
