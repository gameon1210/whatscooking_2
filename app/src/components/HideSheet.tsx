import React from 'react';

import { addDays, todayKey } from '@/domain/dates';
import type { Dish } from '@/domain/types';
import { useStore } from '@/state/store';
import { Button, Sheet, T } from '@/ui/kit';

/** FR-291: hide a dish forever or for 30 days. */
export function HideSheet({ dish, onClose }: { dish: Dish | null; onClose: () => void }) {
  const update = useStore((s) => s.update);
  const hide = (until?: string) => {
    if (!dish) return;
    update((f) => {
      f.hidden = f.hidden.filter((h) => h.dishId !== dish.id);
      f.hidden.push({ dishId: dish.id, until });
    });
    onClose();
  };
  return (
    <Sheet visible={!!dish} onClose={onClose} title={`Hide ${dish?.name ?? ''}?`}>
      <T muted>Hidden dishes never show up in suggestions. You can bring them back in Settings.</T>
      <Button label="Hide for 30 days" kind="secondary" onPress={() => hide(addDays(todayKey(), 30))} />
      <Button label="Hide forever" kind="danger" onPress={() => hide()} />
    </Sheet>
  );
}
