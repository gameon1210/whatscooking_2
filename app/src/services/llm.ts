// Gemini adapter (the one paid service). Used only to parse and phrase:
// photo -> dish names, free-text preference -> weights, unknown words -> dish names.
// Every feature has a rules-based fallback when no key is set.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { PrefTag } from '@/domain/types';

const KEY = 'gemini_api_key';
const MODEL_KEY = 'gemini_model';
export const DEFAULT_MODEL = 'gemini-flash-latest';

export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(v: string | null) {
  if (Platform.OS === 'web') return v ? AsyncStorage.setItem(KEY, v) : AsyncStorage.removeItem(KEY);
  return v ? SecureStore.setItemAsync(KEY, v) : SecureStore.deleteItemAsync(KEY);
}

export async function getModel(): Promise<string> {
  return (await AsyncStorage.getItem(MODEL_KEY)) || DEFAULT_MODEL;
}

export async function setModel(m: string) {
  await AsyncStorage.setItem(MODEL_KEY, m.trim() || DEFAULT_MODEL);
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function generate(parts: Part[]): Promise<string | null> {
  const key = await getApiKey();
  if (!key) return null;
  const model = await getModel();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function safeJson<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s.replace(/^```json|```$/g, '').trim()) as T;
  } catch {
    return null;
  }
}

export async function hasLlm(): Promise<boolean> {
  return !!(await getApiKey());
}

/** FR-221: suggest Indian dish names from a meal photo. */
export async function dishesFromPhoto(base64: string, mime = 'image/jpeg'): Promise<string[]> {
  const out = await generate([
    {
      text:
        'This is a photo of a home-cooked Indian meal. List the dishes you can see using common Indian home names ' +
        '(for example "rajma chawal", "aloo gobi", "idli sambar"). Reply as JSON: {"dishes": ["..."]}. Max 4 dishes.',
    },
    { inline_data: { mime_type: mime, data: base64 } },
  ]);
  return safeJson<{ dishes: string[] }>(out)?.dishes ?? [];
}

const TAGS: PrefTag[] = ['fried', 'spice', 'healthy', 'millet', 'greens', 'pulse', 'light', 'rice', 'roti', 'quick', 'nonveg', 'sweet'];

/** FR-217: free-text preference -> soft weights (-10..10 per tag). */
export async function preferenceWeights(text: string): Promise<Partial<Record<PrefTag, number>> | null> {
  const out = await generate([
    {
      text:
        `A family wrote this food preference: "${text}". Convert it to weights between -10 and 10 for these tags: ${TAGS.join(', ')}. ` +
        'Positive means show more, negative means show less. Only include tags the sentence is about. Reply as JSON: {"weights": {"tag": number}}',
    },
  ]);
  const w = safeJson<{ weights: Record<string, number> }>(out)?.weights;
  if (!w) return null;
  const clean: Partial<Record<PrefTag, number>> = {};
  for (const t of TAGS) if (typeof w[t] === 'number') clean[t] = Math.max(-10, Math.min(10, Math.round(w[t])));
  return clean;
}

/** FR-220 fallback: turn words the parser didn't know into dish names. */
export async function dishNamesFromText(text: string): Promise<string[]> {
  const out = await generate([
    {
      text: `Extract the Indian dish names from this meal note (may be Hinglish or an Indian language): "${text}". Reply as JSON: {"dishes": ["..."]}`,
    },
  ]);
  return safeJson<{ dishes: string[] }>(out)?.dishes ?? [];
}

// ---- Key walkthrough and connection test (1.0.4) ----

export const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

/** Tidies a pasted key: spaces, line breaks and quotes copied along with it. */
export function cleanKey(raw: string): string {
  return (raw ?? '').replace(/[\s"'`“”‘’]/g, '');
}

/** A plain-words check of a key's shape before anything is sent. null = looks right. */
export function keyFormatProblem(raw: string): string | null {
  const k = cleanKey(raw);
  if (!k) return 'Paste your key first.';
  if (!k.startsWith('AIza')) return 'Gemini keys begin with capital A, capital I, then “za”. Check you copied the key itself, not the project name or ID.';
  if (k.length < 35) return 'That looks cut short. Copy the whole key again.';
  if (k.length > 45) return 'That’s longer than a Gemini key. Copy only the key.';
  if (!/^[A-Za-z0-9_-]+$/.test(k)) return 'The key has characters a Gemini key doesn’t use. Copy it again.';
  return null;
}

export type KeyTestResult = 'ok' | 'bad_key' | 'not_enabled' | 'quota' | 'bad_model' | 'region' | 'offline' | 'server' | 'unknown';

/** Reads Gemini's answer to the test call (pure, so it can be tested without a network). */
export function classifyGeminiResponse(status: number, body: string): KeyTestResult {
  const b = (body ?? '').toUpperCase();
  if (status >= 200 && status < 300) return 'ok';
  if (b.includes('API_KEY_INVALID') || b.includes('API KEY NOT VALID') || b.includes('API_KEY_EXPIRED')) return 'bad_key';
  if (b.includes('LOCATION IS NOT SUPPORTED') || b.includes('USER LOCATION')) return 'region';
  if (b.includes('SERVICE_DISABLED') || b.includes('HAS NOT BEEN USED') || b.includes('IS DISABLED')) return 'not_enabled';
  if (status === 429 || b.includes('RESOURCE_EXHAUSTED')) return 'quota';
  if (status === 404) return 'bad_model';
  if (status === 400 || status === 401 || status === 403) return 'bad_key';
  if (status >= 500) return 'server';
  return 'unknown';
}

export const KEY_TEST_TEXT: Record<KeyTestResult, string> = {
  ok: 'It works ✓ Photo recognition and smarter parsing are on.',
  bad_key: 'Google didn’t accept this key. Copy it again from AI Studio, or create a new key there.',
  not_enabled: 'The key is real, but the Gemini API is off for its project. In AI Studio, create the key in a new project and try again.',
  quota: 'The key works, but its free limit is used up for now. Try again later (limits reset daily), or check your plan in AI Studio.',
  bad_model: 'The key works, but the model name isn’t available. Clear the Model field to use the default, then test again.',
  region: 'Google doesn’t offer the Gemini API where this phone is right now.',
  offline: 'Couldn’t reach Google. Check your internet connection and test again.',
  server: 'Google’s service had a problem. Wait a minute and test again.',
  unknown: 'Something unexpected came back from Google. Try again, or create a new key.',
};

/**
 * Makes one tiny request (a few tokens) to check the key, the model and the quota.
 * Uses the key given, or the saved one. Never throws.
 */
export async function testConnection(rawKey?: string, model?: string, fetcher: typeof fetch = fetch): Promise<KeyTestResult> {
  const key = rawKey ? cleanKey(rawKey) : await getApiKey();
  if (!key) return 'bad_key';
  const m = (model ?? (await getModel())).trim() || DEFAULT_MODEL;
  try {
    const res = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with the word OK.' }] }], generationConfig: { maxOutputTokens: 5, temperature: 0 } }),
    });
    const text = res.ok ? '' : await res.text().catch(() => '');
    return classifyGeminiResponse(res.status, text);
  } catch {
    return 'offline';
  }
}
