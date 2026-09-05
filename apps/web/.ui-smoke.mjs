import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
const server = process.env.UI_START_SERVER ? spawn(process.execPath, [fileURLToPath(new URL('./bin/vite.js', import.meta.resolve('vite/package.json'))), 'dev', '--host', '127.0.0.1', '--port', '5181', '--strictPort'], { stdio: 'inherit' }) : null;
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const baseURL = process.env.UI_BASE_URL ?? (server ? 'http://127.0.0.1:5181' : 'http://127.0.0.1:5180');
page.on('pageerror', (error) => errors.push(error.message));
try {
  if (server) {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !ready; attempt++) {
      try { ready = (await fetch(`${baseURL}/masuk`, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
      if (!ready) await delay(500);
    }
    assert.equal(ready, true, 'Server pengujian belum siap');
  }
  await page.goto(`${baseURL}/masuk`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await expect(async () => {
    await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
    await expect(page.getByLabel('Nama lengkap')).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 60000 });
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  console.log(JSON.stringify({ title: await page.title(), heading: await page.getByRole('heading', { level: 1 }).innerText(), font: await page.locator('h1').evaluate((element) => getComputedStyle(element).fontFamily), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors }));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.evaluate(() => document.fonts.check('16px "Newsreader Variable"')), true);
  await page.screenshot({ path: '.svelte-kit/paviliun-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Masuk ke Paviliun', exact: true }).click();
  await page.waitForTimeout(150);
  console.log('Validation focus:', await page.locator(':focus').getAttribute('name'));
  assert.equal(await page.locator(':focus').getAttribute('name'), 'email');
  await page.getByRole('button', { name: 'Buat akun', exact: true }).click();
  console.log('Required name:', await page.getByLabel('Nama lengkap').getAttribute('required'));
  await page.route('**/api/auth/sign-in/social', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Provider unavailable', code: 'PROVIDER_NOT_FOUND' }) }));
  await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).click();
  await page.waitForTimeout(800);
  console.log('Google failure:', await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).isEnabled(), await page.getByRole('status').innerText());
  assert.equal(await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).isEnabled(), true);
  assert.match(await page.getByRole('status').innerText(), /Google belum dapat dimulai/);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    console.log('Viewport:', width, 'overflow:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: '.svelte-kit/paviliun-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.getByRole('button', { name: 'Lanjutkan dengan Google' }).evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.goto(`${baseURL}/bayar/tautan-tidak-valid`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Tautan tidak tersedia' }).waitFor();
  assert.equal(await page.getByRole('button', { name: /Siapkan QRIS/ }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('Browser errors:', errors);
  assert.deepEqual(errors, []);
} finally { await browser.close(); server?.kill(); }
