/**
 * Proof of self-containment: load the STATIC build and run a full demo with EVERY request to the
 * orchestrator (:8770) aborted. If it still reaches EXECUTED + the certainty recap, the engine is
 * truly running in the browser with no backend.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const TARGET = process.env.STATIC_URL ?? 'http://localhost:4180';
const shots = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

let blocked = 0;
await ctx.route('**', (route) => {
  if (route.request().url().includes(':8770')) { blocked++; return route.abort(); }
  return route.continue();
});
await ctx.addInitScript(() => localStorage.setItem('certen.pace', 'instant'));

const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(TARGET, { waitUntil: 'networkidle' });
await page.getByText('Stop the Production Mistake', { exact: false }).first().click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: /Propose/ }).first().click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /^Approve$/ }).first().click();
await page.waitForTimeout(4500);

const executed = await page.getByText('EXECUTED', { exact: false }).count();
const recap = await page.getByText('CERTEN was certain', { exact: false }).count();
await page.screenshot({ path: join(shots, 'static-verify.png') });
await browser.close();

console.log(`orchestrator calls blocked: ${blocked}`);
console.log(`EXECUTED visible: ${executed > 0} | certainty recap: ${recap > 0} | console errors: ${errors.length}`);
if (errors.length) console.log('errors:', errors.slice(0, 5).join(' | '));
process.exit(executed > 0 && recap > 0 ? 0 : 1);
