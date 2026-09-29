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
