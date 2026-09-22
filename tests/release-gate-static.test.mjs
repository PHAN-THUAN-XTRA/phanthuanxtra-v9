import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

 test('dual-AI executor is explicitly non-mutating', () => {
  const source = read('developer-gateway/ai-peer-executor.mjs');
  assert.match(source, /production_mutation\s*:\s*false/);
  assert.match(source, /independent_peer_workers\s*:\s*0/);
  assert.doesNotMatch(source, /wrangler\s+(deploy|delete|rollback)/i);
 });

test('AI continuity workflow does not grant production write permissions', () => {
  const source = read('.github/workflows/ai-peer-continuity.yml');
  assert.match(source, /contents:\s*read/);
  assert.doesNotMatch(source, /contents:\s*write/);
  assert.match(source, /Production mutations:\s*\*\*not attempted\*\*/);
});

test('AI unified executor keeps the one-queue rule', () => {
  const source = read('.github/workflows/ai-peer-executor.yml');
  assert.match(source, /ai-unified-executor-single-queue/);
  assert.match(source, /cancel-in-progress:\s*false/);
  assert.match(source, /base_branch.*main/i);
});

test('APK production identity is stable and launcher is exported', () => {
  const gradle = read('android/app/build.gradle');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(gradle, /applicationId\s+'com\.phanthuanxtra\.app'/);
  assert.match(gradle, /versionCode\s+3/);
  assert.match(gradle, /versionName\s+'1\.2\.0'/);
  assert.match(manifest, /android:name="\.OperatorHubActivity"/);
  assert.match(manifest, /android:exported="true"/);
  assert.match(manifest, /android\.intent\.action\.MAIN/);
  assert.match(manifest, /android\.intent\.category\.LAUNCHER/);
});

test('backup workflow verifies checksums and archive readability without secret values', () => {
  const source = read('.github/workflows/full-system-backup.yml');
  assert.match(source, /sha256sum -c SHA256SUMS/);
  assert.match(source, /tar -xzf full-system-backup\.tar\.gz/);
  assert.match(source, /secret_values_included!==false/);
  assert.match(source, /d1_sql_export!==true/);
  assert.match(source, /r2_object_content!==true/);
});

test('canonical status is the only project status markdown file', () => {
  const status = read('MASTER_PROJECT_STATUS.md');
  assert.match(status, /DUY NHẤT — CANONICAL PROJECT STATUS/);
  assert.match(status, /(?:Do not create competing checkpoint\/status Markdown files|never create competing checkpoint `?\.md` files|do not create competing checkpoint\/status Markdown files)/i);
});


test('homepage has no retired Gods Eye showcase or redirect loop source', () => {
  const index = read('public/index.html');
  const entry = read('src/entry.js');
  const deploy = read('scripts/deploy-cloudflare-api.mjs');
  assert.doesNotMatch(index, /God.?s Eye View|XTRA WORLD INTELLIGENCE|bilawalsidhu|gods-eye-view/i);
  assert.equal(fs.existsSync(new URL('../public/_redirects', import.meta.url)), false);
  assert.match(entry, /url\.pathname === "\/home"/);
  assert.match(entry, /new URL\("\/index\.html", request\.url\)/);
  assert.match(deploy, /"\/home", "\/home\/"/);
});
