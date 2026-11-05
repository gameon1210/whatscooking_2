// Gemini adapter (the one paid service). Used only to parse and phrase:
// photo -> dish names, free-text preference -> weights, unknown words -> dish names.
// Every feature has a rules-based fallback when no key is set.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { PrefTag } from '@/domain/types';

const KEY = 'gemini_api_key';
const MODEL_KEY = 'gemini_model';
export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

export function resolveModel(model?: string | null): string {
  const name = model?.trim().replace(/^models\//, '');
  return !name || name === 'gemini-flash-latest' ? DEFAULT_MODEL : name;
}

export async function getApiKey(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function setApiKey(v: string | null) {
  if (Platform.OS === 'web') return v ? AsyncStorage.setItem(KEY, v) : AsyncStorage.removeItem(KEY);
  return v ? SecureStore.setItemAsync(KEY, v) : SecureStore.deleteItemAsync(KEY);
}

export async function getModel(): Promise<string> {
  return resolveModel(await AsyncStorage.getItem(MODEL_KEY));
}

export async function setModel(m: string) {
  await AsyncStorage.setItem(MODEL_KEY, resolveModel(m));
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
type GeminiOutput = { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };

async function requestGemini(key: string, model: string, parts: Part[], options: { maxOutputTokens?: number } = {}, fetcher = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', ...options } }),
      signal: controller.signal,
    });
    return { status: res.status, body: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

function outputText(body: string): string | null {
  const parts = safeJson<GeminiOutput>(body)?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts) ? parts.filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('') || null : null;
}

async function generate(parts: Part[]): Promise<string | null> {
  const key = await getApiKey();
  if (!key) return null;
  const { status, body } = await requestGemini(key, await getModel(), parts);
  const result = classifyGeminiResponse(status, body);
  if (result !== 'ok') throw new Error(KEY_TEST_TEXT[result]);
  return outputText(body);
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

export async function mealsFromPlanText(text: string, start: string, end: string, today: string): Promise<unknown> {
  const result = await generate([{ text: [
    `Today is ${today}. The selected planning dates are ${start} through ${end}.`,
    'Extract the meal decisions stated in the note. Use the first selected date for a meal with no day stated.',
    'Recognize Indian dish names and Hinglish or Hindi. Include only stated dishes. For a weekday, use its first occurrence on or after the first selected date.',
    'Return JSON of this shape: {"meals":[{"date":"YYYY-MM-DD","slot":"breakfast|lunch|snack|dinner","dish":"dish name"}]}. Use one dish per meal and omit unclear meals.',
    `Meal note: ${JSON.stringify(text)}`,
  ].join('\n') }]);
  return safeJson<unknown>(result);
}

// ---- Key walkthrough and connection test (1.0.4) ----

export const AI_STUDIO_URL = 'https://aistudio.google.com/apikey';

/** Tidies a pasted key: spaces, line breaks and quotes copied along with it. */
export function cleanKey(raw: string): string {
  return (raw ?? '').replace(/[\s"'`“”‘’]/g, '');
}

/** Catch common copy mistakes. Google validates the credential itself. */
export function keyFormatProblem(raw: string): string | null {
  const k = cleanKey(raw);
  if (!k) return 'Paste your key first.';
  if (!k.startsWith('AQ.') && !k.startsWith('AIza')) return 'Copy the API key from AI Studio. New keys start with “AQ.” and older keys start with “AIza”.';
  if (k === 'AQ.' || /…|\.\.\./.test(k) || (k.startsWith('AIza') && k.length < 35)) return 'That looks cut short. Tap the copy icon next to the API key in AI Studio.';
  if (!/^[A-Za-z0-9._~+/=-]+$/.test(k)) return 'Copy just the API key using the copy icon in AI Studio.';
  return null;
}

export type KeyTestResult = 'ok' | 'bad_key' | 'restricted' | 'not_enabled' | 'quota' | 'bad_model' | 'region' | 'offline' | 'server' | 'unknown';

/** Reads Gemini's answer to the test call (pure, so it can be tested without a network). */
export function classifyGeminiResponse(status: number, body: string): KeyTestResult {
  const b = (body ?? '').toUpperCase();
  if (status >= 200 && status < 300) return 'ok';
  if (b.includes('API_KEY_INVALID') || b.includes('API KEY NOT VALID') || b.includes('API_KEY_EXPIRED') || b.includes('REPORTED AS LEAKED')) return 'bad_key';
  if (b.includes('LOCATION IS NOT SUPPORTED') || b.includes('USER LOCATION')) return 'region';
  if (b.includes('SERVICE_DISABLED') || b.includes('HAS NOT BEEN USED') || b.includes('IS DISABLED')) return 'not_enabled';
  if (status === 429 || b.includes('RESOURCE_EXHAUSTED')) return 'quota';
  if (status === 404) return 'bad_model';
  if (status === 401) return 'bad_key';
  if (status === 403 || /API_KEY_\w+_BLOCKED|UNRESTRICTED STANDARD KEY/.test(b)) return 'restricted';
  if (status >= 500) return 'server';
  return 'unknown';
}

export const KEY_TEST_TEXT: Record<KeyTestResult, string> = {
  ok: 'It works ✓ Photo recognition and smarter parsing are on.',
  bad_key: 'Google didn’t accept this key. Copy it again from AI Studio, or create a new key there.',
  restricted: 'Google denied access. Check the key’s restrictions in AI Studio, or create a new Gemini key there.',
  not_enabled: 'The key is real, but the Gemini API is off for its project. In AI Studio, create the key in a new project and try again.',
  quota: 'Google reported a quota limit. Check this project’s usage and limits in AI Studio, then try again.',
  bad_model: 'The key works, but the model name isn’t available. Clear the Model field to use the default, then test again.',
  region: 'Google doesn’t offer the Gemini API where this phone is right now.',
  offline: 'Google didn’t respond. Check your connection and test again.',
  server: 'This Gemini model is busy or temporarily unavailable. Wait a minute, or choose another model under Advanced.',
  unknown: 'Google didn’t return a usable reply. Test again or check the model under Advanced.',
};

/**
 * Makes one tiny request (a few tokens) to check the key, the model and the quota.
 * Uses the key given, or the saved one. Never throws.
 */
export async function testConnection(rawKey?: string, model?: string, fetcher: typeof fetch = fetch): Promise<KeyTestResult> {
  try {
    const key = rawKey === undefined ? await getApiKey() : cleanKey(rawKey);
    if (!key) return 'bad_key';
    const selectedModel = model === undefined ? await getModel() : resolveModel(model);
    const { status, body } = await requestGemini(key, selectedModel, [{ text: 'Return exactly this JSON: {"ok":true}' }], { maxOutputTokens: 64 }, fetcher);
    const result = classifyGeminiResponse(status, body);
    if (result !== 'ok') return result;
    return safeJson<{ ok?: boolean }>(outputText(body))?.ok === true ? 'ok' : 'unknown';
  } catch {
    return 'offline';
  }
}
