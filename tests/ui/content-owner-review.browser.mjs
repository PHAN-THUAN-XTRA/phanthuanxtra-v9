// Real Chromium + the actual shared UI/API on a disposable in-memory fixture.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CONTENT_REVIEW_PLAYWRIGHT_MODULE || 'playwright');
const screenshotDir = process.env.CONTENT_REVIEW_SCREENSHOT_DIR || '/tmp/content-owner-review-proof';
await fs.mkdir(screenshotDir, { recursive: true });
const fixture = spawn(process.execPath, ['scripts/content-review-ui-fixture.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser, page;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Fixture startup timeout')), 15000);
    fixture.stdout.on('data', data => { if (data.toString().includes('Synthetic owner review UI fixture:')) { clearTimeout(timer); resolve(); } });
    fixture.on('exit', code => { clearTimeout(timer); reject(new Error('Fixture startup failed: ' + code)); });
  });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1 });
  const scriptErrors = []; page.on('pageerror', error => scriptErrors.push(error.message));
  await page.goto('http://127.0.0.1:8765/telegram-mini-app.html?view=content');
  await page.getByRole('button', { name: 'Xem / sửa nháp', exact: true }).waitFor();
  assert.ok((await page.locator('#contentReview').innerText()).includes('AI thật đang tắt'));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(screenshotDir, 'mini-mobile-list.png'), fullPage: true });
  await page.getByRole('button', { name: 'Xem / sửa nháp', exact: true }).click();
  await page.getByRole('button', { name: 'Đã kiểm tra lịch', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Đã ghi nhận kiểm tra' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Đã kiểm tra lịch', exact: true }).isEnabled(), false);
  await page.getByTestId('content-editor').locator('summary').click();
  await page.getByTestId('content-edit-title').fill('Nháp đã được owner sửa trên điện thoại');
  await page.getByTestId('content-edit-content').fill('Tiếng Việt riêng tư. <img src=x onerror="alert(1)">');
  let lost = false, edits = 0;
  await page.route('**/content-review/drafts/*', async route => {
    if (route.request().method() === 'PATCH') {
      edits++;
      if (!lost) { lost = true; await route.fetch(); await route.abort('failed'); return; }
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Lưu nháp riêng tư', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Đã lưu nháp riêng tư' }).waitFor();
  assert.equal(edits, 1); assert.equal(lost, true);
  assert.equal(await page.locator('.cr-content img').count(), 0);
  assert.ok((await page.getByTestId('content-proposal').innerText()).includes('Nội dung đã thay đổi'));
  assert.equal(await page.getByRole('button', { name: 'Đã kiểm tra lịch', exact: true }).isEnabled(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: path.join(screenshotDir, 'mini-mobile-stale-proposal.png'), fullPage: true });
  await page.getByRole('button', { name: 'Bỏ qua nháp', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Đã ghi nhận bỏ qua' }).waitFor();
  assert.equal(await page.locator('.cr-history').count(), 3);
  for (const admin of ['/admin-control.html', '/admin-control']) {
    await page.goto('http://127.0.0.1:8765' + admin);
    await page.getByRole('button', { name: 'Nội dung / Lịch', exact: true }).click();
    await page.getByRole('button', { name: 'Xem / sửa nháp', exact: true }).waitFor();
    assert.ok((await page.locator('#ownerContentReview').innerText()).includes('Nháp đã được owner sửa trên điện thoại'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({ path: path.join(screenshotDir, admin.endsWith('.html') ? 'admin-mobile-list.png' : 'admin-legacy-mobile-list.png'), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.screenshot({ path: path.join(screenshotDir, 'admin-desktop-list.png'), fullPage: true });
  assert.deepEqual(scriptErrors, []);
  console.log('OWNER REVIEW BROWSER: 360px Mini App + both Admin surfaces; no overflow; review/private edit; lost response reconciliation; stale schedule; safe text DOM; audit history: PASS');
} catch (error) {
  if (page) await page.screenshot({ path: path.join(screenshotDir, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  fixture.kill('SIGTERM');
}
