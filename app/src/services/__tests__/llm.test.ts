// 1.0.4: AI key walkthrough checks and the connection test, without a network.
// jest.mock calls are hoisted above this import by ts-jest.
import { classifyGeminiResponse, cleanKey, keyFormatProblem, testConnection } from '@/services/llm';

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-secure-store', () => ({}));
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (k: string) => store[k] ?? null,
    setItem: async (k: string, v: string) => void (store[k] = v),
    removeItem: async (k: string) => void delete store[k],
  },
}));

const GOOD = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';

test('pasted keys are tidied: spaces, line breaks and quotes', () => {
  expect(cleanKey(` "${GOOD}"\n`)).toBe(GOOD);
});

test('the format check explains the common mistakes in plain words', () => {
  expect(keyFormatProblem(GOOD)).toBeNull();
  expect(keyFormatProblem('')).toMatch(/Paste/);
  expect(keyFormatProblem('my-project-12345')).toMatch(/capital A, capital I/);
  expect(keyFormatProblem('AIzaSyA12')).toMatch(/cut short/);
  expect(keyFormatProblem(GOOD + GOOD)).toMatch(/longer/);
});

test('Google’s answers map to a plain result', () => {
  expect(classifyGeminiResponse(200, '')).toBe('ok');
  expect(classifyGeminiResponse(400, '{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}')).toBe('bad_key');
  expect(classifyGeminiResponse(403, 'SERVICE_DISABLED: Generative Language API has not been used in project')).toBe('not_enabled');
  expect(classifyGeminiResponse(429, 'RESOURCE_EXHAUSTED')).toBe('quota');
  expect(classifyGeminiResponse(404, 'models/foo is not found')).toBe('bad_model');
  expect(classifyGeminiResponse(400, 'User location is not supported for the API use.')).toBe('region');
  expect(classifyGeminiResponse(503, '')).toBe('server');
});

test('the connection test sends one tiny request with the key in a header', async () => {
  const fetcher = jest.fn(async () => ({ ok: true, status: 200, text: async () => '' })) as unknown as typeof fetch;
  expect(await testConnection(GOOD, 'gemini-flash-latest', fetcher)).toBe('ok');
  const [url, init] = (fetcher as unknown as jest.Mock).mock.calls[0];
  expect(url).toContain('gemini-flash-latest:generateContent');
  expect(url).not.toContain(GOOD);
  expect(init.headers['x-goog-api-key']).toBe(GOOD);
  expect(JSON.parse(init.body).generationConfig.maxOutputTokens).toBeLessThanOrEqual(5);
});

test('no internet reads as offline, not as a bad key', async () => {
  const fetcher = jest.fn(async () => {
    throw new TypeError('Network request failed');
  }) as unknown as typeof fetch;
  expect(await testConnection(GOOD, undefined, fetcher)).toBe('offline');
});

test('a refused key reads as bad_key', async () => {
  const fetcher = jest.fn(async () => ({ ok: false, status: 400, text: async () => 'API key not valid. Please pass a valid API key.' })) as unknown as typeof fetch;
  expect(await testConnection(GOOD, undefined, fetcher)).toBe('bad_key');
});
