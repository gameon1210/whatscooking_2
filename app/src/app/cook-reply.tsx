import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';

import { applyCookReply } from '@/domain/actions';
import { parseCookReply } from '@/domain/cookcard';
import { useStore } from '@/state/store';
import { ok, warn } from '@/ui/feedback';
import { Button, Card, Input, Screen, T } from '@/ui/kit';

/** Records the cook's picks, missing items and change requests from the Cook page message. */
export default function CookReply() {
  const update = useStore((s) => s.update);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<string[] | null>(null);
  const [replyOk, setReplyOk] = useState(true);

  const apply = (t: string) => {
    const r = parseCookReply(t);
    if (!r.id && !Object.keys(r.picks).length && !Object.keys(r.missing).length && !r.change.length && !r.stop) {
      setNotes(['That doesn’t look like a Cook page reply. It starts with “WC:”.']);
      setReplyOk(false);
      warn('That isn’t a cook reply. Copy the cook’s whole WhatsApp message, then try again.');
      return;
    }
    let out: string[] = [];
    update((f) => {
      out = applyCookReply(f, r);
    });
    const good = !out.some((n) => /nothing was changed|Nothing in that reply/.test(n));
    setReplyOk(good);
    setNotes(out.length ? out : ['Reply saved.']);
    if (good) ok('Cook’s reply applied ✓');
    else warn(out[0] ?? 'Nothing was changed.');
  };

  return (
    <Screen title="Cook’s reply" subtitle="Copy the cook’s WhatsApp message, then paste it here." edges={['bottom']}>
      <Button
        label="Paste from clipboard"
        icon="📋"
        onPress={async () => {
          const t = await Clipboard.getStringAsync();
          if (!t.trim()) {
            warn('The clipboard is empty. Copy the cook’s message in WhatsApp first.');
            return;
          }
          setText(t);
          apply(t);
        }}
      />
      <Input label="Or paste it here" multiline value={text} onChangeText={setText} style={{ minHeight: 110, textAlignVertical: 'top' }} placeholder="WC:2026100… #p…=1" />
      <Button kind="secondary" label="Apply reply" onPress={() => apply(text)} blockedReason={!text.trim() && 'Paste the cook’s message first.'} />
      {notes ? (
        <Card tone={replyOk ? 'good' : 'warn'}>
          {notes.map((n, i) => (
            <T key={i}>{n}</T>
          ))}
          {replyOk ? <Button small kind="ghost" label="See shopping list" onPress={() => router.push('/cart')} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
