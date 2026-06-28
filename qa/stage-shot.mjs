// One-off: capture the staged reveal mid-animation (Cinematic). Run with cockpit up.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await ctx.addInitScript(() => {
  localStorage.setItem('certen.pace', 'cinematic');
  localStorage.setItem('certen.step', '0');
  localStorage.setItem('certen.builder', '0');
  localStorage.setItem('certen.technical', '0');
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
await page.getByText('Stop the Production Mistake', { exact: false }).first().click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Propose/ }).first().click();
await page.waitForTimeout(1300); // ~1 rail revealed
await page.screenshot({ path: join(shots, 'stage-t1.png') });
await page.waitForTimeout(1200); // ~2-3 rails
await page.screenshot({ path: join(shots, 'stage-t2.png') });
await browser.close();
console.log('captured stage-t1.png, stage-t2.png');
