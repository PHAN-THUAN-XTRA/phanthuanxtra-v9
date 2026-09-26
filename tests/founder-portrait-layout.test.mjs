import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../public/style.css', import.meta.url), 'utf8');
const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(escaped + '\\{([^}]+)\\}', 'g'))].map(match => match[1]).join(';');
};

test('founder portrait stays within the page grid without stretching', () => {
  assert.match(rule('.founder-grid'), /grid-template-columns:minmax\(0,1\.05fr\) minmax\(0,\.95fr\)/);
  assert.match(rule('.founder-portrait'), /width:100%/);
  assert.match(rule('.founder-photo'), /width:100%;height:auto/);
  assert.match(rule('.founder-photo'), /aspect-ratio:3\/4/);
});

test('founder article portrait fits narrow columns', () => {
  assert.match(rule('.article-hero'), /grid-template-columns:minmax\(0,1fr\) minmax\(0,280px\)/);
  assert.match(rule('.article-hero img'), /max-width:100%;height:auto/);
  assert.match(css, /@media\(max-width:760px\)\{\.founder-grid\{grid-template-columns:minmax\(0,1fr\)/);
});
