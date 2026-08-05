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

/**
 * Walk the scenario to its end by always clicking the one advancing control.
 *
 * Naming a specific button here is what rotted the previous version of this gate twice over: it
 * clicked `Approve`, which no longer exists, and it expected the recap after a single act, which
 * stopped being true when this demo grew to three. Both failures looked like a broken build.
 *
 * So: click whatever advances, ignore the chrome, and stop when the presenter's `Summary` button
 * appears — that button is only rendered on a terminal state, which makes it the end condition
 * rather than something to assert separately.
 */
const CHROME = /^(Diagram|Detail|Back|Reset|Reset scenario|Summary)$/i;
let executedSeen = 0;
for (let step = 0; step < 20; step++) {
  if (await page.getByRole('button', { name: /^Summary$/ }).count()) break;
  executedSeen = Math.max(executedSeen, await page.getByText('EXECUTED', { exact: false }).count());

  const candidates = await page.getByRole('button').all();
  let clicked = false;
  for (const b of candidates) {
    const label = ((await b.textContent()) || '').trim();
    if (!label || CHROME.test(label)) continue;
    if (!(await b.isEnabled())) continue;
    await b.click();
    clicked = true;
    break;
  }
  if (!clicked) break;
  await page.waitForTimeout(2200);
}
const executed = Math.max(executedSeen, await page.getByText('EXECUTED', { exact: false }).count());

// The recap no longer surfaces itself — it used to cover the frame the moment an act resolved,
// so it is now a presenter-triggered 'Summary' button. Click it before asserting on its content.
await page.getByRole('button', { name: /^Summary$/ }).first().click();
await page.waitForTimeout(700);
const recap = await page.getByText(/CERTEN was (certain|not certain)/i).count();
await page.screenshot({ path: join(shots, 'static-verify.png') });
await browser.close();

console.log(`orchestrator calls blocked: ${blocked}`);
console.log(`EXECUTED visible: ${executed > 0} | certainty recap: ${recap > 0} | console errors: ${errors.length}`);
if (errors.length) console.log('errors:', errors.slice(0, 5).join(' | '));
process.exit(executed > 0 && recap > 0 ? 0 : 1);
