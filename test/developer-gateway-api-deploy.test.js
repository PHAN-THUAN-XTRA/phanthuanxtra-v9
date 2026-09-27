import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Developer Gateway API deploy enables Gemini free-first runtime vars', async () => {
  const source = await readFile(new URL('../scripts/deploy-developer-gateway-api.mjs', import.meta.url), 'utf8');
  assert.match(source, /name:\s*["']GEMINI_ENABLED["'][\s\S]*?type:\s*["']plain_text["'][\s\S]*?text:\s*["']true["']/);
  assert.match(source, /name:\s*["']GEMINI_MODEL["'][\s\S]*?type:\s*["']plain_text["'][\s\S]*?text:\s*["']gemini-2\.5-flash["']/);
  assert.match(source, /currentBindings\(\)/);
  assert.doesNotMatch(source, /GEMINI_API_KEY\s*[:=]\s*["'][^"']+["']/);
});
