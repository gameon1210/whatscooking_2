// A beginner-friendly walkthrough for getting a Gemini key, plus a connection test (1.0.4).
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { AI_STUDIO_URL, cleanKey, DEFAULT_MODEL, getApiKey, getModel, KEY_TEST_TEXT, keyFormatProblem, KeyTestResult, setApiKey, setModel, testConnection } from '@/services/llm';
import { fail, ok, warn } from '@/ui/feedback';
import { Button, Card, Input, LinkText, Row, T } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

const STEPS: { title: string; body: string }[] = [
  { title: 'Open Google AI Studio', body: 'Tap the button below. Sign in with any Google account, the same one you use for Gmail is fine.' },
  { title: 'Create a key', body: 'Tap “Create API key”. If it asks for a project, choose “Create a new project”. Any name works.' },
  { title: 'Copy the key', body: 'Tap the copy icon next to the new key. It begins with capital A, capital I, then “za”, and is about 39 letters and numbers long.' },
  { title: 'Paste it here and test', body: 'Come back to this app, tap Paste, then Save and test. We’ll tell you in plain words if anything is wrong.' },
];

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  const c = useColors();
  return (
    <Row style={{ alignItems: 'flex-start' }} gap={space.md}>
      <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <T bold style={{ color: c.primary }}>
          {n}
        </T>
      </View>
      <View style={{ flex: 1 }}>
        <T bold>{title}</T>
        <T small muted>
          {body}
        </T>
      </View>
    </Row>
  );
}

/** `onChange` is told when a key is saved or removed. */
export function AiKeyGuide({ onChange, compact }: { onChange?: (hasKey: boolean) => void; compact?: boolean }) {
  const c = useColors();
  const [hasKey, setHasKey] = useState(false);
  const [key, setKey] = useState('');
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [result, setResult] = useState<KeyTestResult | null>(null);
  const [showSteps, setShowSteps] = useState(!compact);
  const [showModel, setShowModel] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    getApiKey().then((k) => {
      setHasKey(!!k);
      if (!k) setShowSteps(true);
    });
    getModel().then(setModelState);
  }, []);

  const problem = key ? keyFormatProblem(key) : null;

  const report = (r: KeyTestResult) => {
    setResult(r);
    if (r === 'ok') ok('Connected to Gemini ✓');
    else if (r === 'quota' || r === 'bad_model' || r === 'offline' || r === 'server') warn(KEY_TEST_TEXT[r]);
    else fail(KEY_TEST_TEXT[r]);
  };

  const saveAndTest = async () => {
    const k = cleanKey(key);
    const m = model.trim() || DEFAULT_MODEL;
    const r = await testConnection(k, m);
    // A key Google refused isn't saved, so a typo never silently replaces a working key.
    if (r === 'bad_key' || r === 'not_enabled' || r === 'region') return report(r);
    await setApiKey(k);
    await setModel(m);
    const saved = !!(await getApiKey());
    if (!saved) return fail('The key didn’t save on this phone. Please try again.');
    setKey('');
    setHasKey(true);
    onChange?.(true);
    report(r);
  };

  return (
    <View style={{ gap: space.md }}>
      <T small muted>
        Optional. A free Google Gemini key lets the app recognise dishes in meal photos and understand preferences written in your own words. Everything else works without it.
      </T>
      {hasKey ? (
        <Card tone="good">
          <T bold>✅ Key saved on this phone</T>
          <Row wrap>
            <Button small kind="secondary" label="Test connection" onPress={async () => report(await testConnection(undefined, model))} />
            <Button
              small
              kind="ghost"
              label="Remove key"
              onPress={async () => {
                await setApiKey(null);
                setHasKey(false);
                setResult(null);
                setShowSteps(true);
                onChange?.(false);
                ok('Key removed from this phone');
              }}
            />
          </Row>
        </Card>
      ) : null}

      {showSteps ? (
        <View style={{ gap: space.md }}>
          {STEPS.map((s, i) => (
            <Step key={s.title} n={i + 1} title={s.title} body={s.body} />
          ))}
          <Button kind="secondary" label="Open Google AI Studio" icon="↗" onPress={() => Linking.openURL(AI_STUDIO_URL).catch(() => fail(`Couldn’t open the browser. Go to ${AI_STUDIO_URL}`))} />
        </View>
      ) : (
        <LinkText label="How do I get a key? Show the steps" onPress={() => setShowSteps(true)} />
      )}

      <Input
        label={hasKey ? 'Replace with a new key' : 'Your key'}
        value={key}
        onChangeText={(t) => {
          setKey(t);
          setResult(null);
        }}
        onBlur={() => setTouched(true)}
        placeholder="AIza…"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        error={touched && problem}
      />
      <Row wrap>
        <Button
          small
          kind="secondary"
          label="Paste"
          icon="📋"
          onPress={async () => {
            const t = await Clipboard.getStringAsync().catch(() => '');
            if (!t.trim()) return warn('Nothing copied yet. Copy the key in AI Studio first.');
            setKey(cleanKey(t));
            setTouched(true);
            setResult(null);
          }}
        />
        <Button small label="Save and test" icon="✓" blockedReason={keyFormatProblem(key)} onBlocked={() => setTouched(true)} onPress={saveAndTest} />
      </Row>

      {result ? (
        <Card tone={result === 'ok' ? 'good' : result === 'quota' || result === 'offline' || result === 'server' ? 'warn' : 'bad'}>
          <T>{KEY_TEST_TEXT[result]}</T>
        </Card>
      ) : null}

      {showModel ? (
        <Input label="Model (advanced)" value={model} onChangeText={setModelState} autoCapitalize="none" placeholder={DEFAULT_MODEL} />
      ) : (
        <LinkText label="Advanced: choose the model" onPress={() => setShowModel(true)} />
      )}
      <T small muted style={{ color: c.muted }}>
        The key stays on this phone. Meal photos and the text you log are sent to Google only to recognise dishes. On Google’s free tier, Google may use what it receives to improve its products.
      </T>
    </View>
  );
}
