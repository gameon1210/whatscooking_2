import React, { useState } from 'react';
import { View } from 'react-native';

import { uid } from '@/domain/family';
import { describeWeights, parsePreference } from '@/domain/prefs';
import { hasLlm, preferenceWeights } from '@/services/llm';
import { useFamily, useStore } from '@/state/store';
import { Button, Card, Chip, Input, Row, Screen, T } from '@/ui/kit';

const EXAMPLES = ['Prefer healthier options', 'Less spicy for the kids', 'More millets', 'No fried food on weekdays', 'More dal and protein'];

/** FR-217: preferences in plain English become visible, editable soft rules. */
export default function Preferences() {
  const family = useFamily();
  const update = useStore((s) => s.update);
  const [text, setText] = useState('');
  const [who, setWho] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  if (!family) return null;

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const parsed = parsePreference(t);
    let weights = parsed.weights;
    let source: 'rules' | 'llm' = 'rules';
    if (await hasLlm()) {
      const w = await preferenceWeights(t).catch(() => null);
      if (w && Object.keys(w).length) {
        weights = w;
        source = 'llm';
      }
    }
    // "for the kids" -> apply to each child
    const kidWords = /\b(kids?|children|child|bachche|bacchon)\b/i.test(t);
    const targets = who ? [who] : kidWords ? family.members.filter((m) => m.ageBand === 'child' || m.ageBand === 'toddler').map((m) => m.id) : [undefined];
    update((f) => {
      for (const memberId of targets.length ? targets : [undefined]) f.preferences.push({ id: uid('pref'), memberId, text: t, weights, weekdays: parsed.weekdays, source });
    });
    setText('');
    setBusy(false);
  };

  return (
    <Screen title="Preferences" subtitle="Soft rules: they nudge suggestions but never override diet or fasting rules." edges={['bottom']}>
      <Card>
        <Input label="In your words" value={text} onChangeText={setText} placeholder="e.g. prefer healthier options" onSubmitEditing={add} />
        <Row wrap>
          {EXAMPLES.map((e) => (
            <Chip key={e} label={e} onPress={() => setText(e)} />
          ))}
        </Row>
        <T small muted bold>
          For
        </T>
        <Row wrap>
          <Chip label="Whole family" selected={!who} onPress={() => setWho(undefined)} />
          {family.members
            .filter((m) => m.eatsAtHome)
            .map((m) => (
              <Chip key={m.id} label={m.name} selected={who === m.id} onPress={() => setWho(m.id)} />
            ))}
        </Row>
        <T small muted>
          Preview: {text.trim() ? describeWeights(parsePreference(text).weights) : '—'}
        </T>
        <Button label="Add preference" onPress={add} loading={busy} disabled={!text.trim()} />
      </Card>
      {family.preferences.map((p) => (
        <Card key={p.id}>
          <T bold>“{p.text}”</T>
          <T small muted>
            {p.memberId ? `${family.members.find((m) => m.id === p.memberId)?.name} · ` : 'Whole family · '}
            {describeWeights(p.weights)}
            {p.weekdays?.length ? ' · some days only' : ''}
          </T>
          <View>
            <Button small kind="ghost" label="Delete" onPress={() => update((f) => void (f.preferences = f.preferences.filter((x) => x.id !== p.id)))} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
