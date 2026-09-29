import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';

import { applyCookReply } from '@/domain/actions';
import { parseCookReply } from '@/domain/cookcard';
import { useStore } from '@/state/store';
import { Button, Card, Input, Screen, T } from '@/ui/kit';

/** Records the cook's picks, missing items and change requests from the Cook page message. */
export default function CookReply() {
  const update = useStore((s) => s.update);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<string[] | null>(null);

  const apply = (t: string) => {
    const r = parseCookReply(t);
    if (!r.id && !Object.keys(r.picks).length && !Object.keys(r.missing).length && !r.change.length && !r.stop) {
      setNotes(['That doesn’t look like a Cook page reply. It starts with “WC:”.']);
      return;
    }
    let out: string[] = [];
    update((f) => {
      out = applyCookReply(f, r);
    });
    setNotes(out.length ? out : ['Reply saved.']);
  };

  return (
    <Screen title="Cook’s reply" subtitle="Copy the cook’s WhatsApp message, then paste it here." edges={['bottom']}>
      <Button
        label="Paste from clipboard"
        icon="📋"
        onPress={async () => {
          const t = await Clipboard.getStringAsync();
          setText(t);
          apply(t);
        }}
      />
      <Input label="Or paste it here" multiline value={text} onChangeText={setText} style={{ minHeight: 110, textAlignVertical: 'top' }} placeholder="WC:2026100… #p…=1" />
      <Button kind="secondary" label="Apply reply" onPress={() => apply(text)} disabled={!text.trim()} />
      {notes ? (
        <Card tone="good">
          {notes.map((n, i) => (
            <T key={i}>{n}</T>
          ))}
          <Button small kind="ghost" label="See shopping list" onPress={() => router.push('/cart')} />
        </Card>
      ) : null}
    </Screen>
  );
}
