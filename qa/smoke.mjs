/**
 * Smoke test: drives every demo to its terminal state by repeatedly pressing whatever
 * advancing control the scenario offers, and fails on any page error or dead end.
 *
 * Prereqs: cockpit served at COCKPIT_URL (default http://localhost:3010).
 * Run: node qa/smoke.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.COCKPIT_URL ?? 'http://localhost:3010';
const OUT = process.env.OUT ?? 'qa/shots/smoke';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('certen.pace', 'instant');
  localStorage.setItem('certen.step', '0');
  localStorage.setItem('certen.recap', '0');
  localStorage.setItem('certen.view.v2', '1');
});

const errors = [];
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`EXCEPTION: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });
const titles = await page.locator('.MuiCard-root h4').allTextContents();
console.log('scenarios:', titles.join(' | '));

let failures = 0;
for (const title of titles) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByText(title, { exact: true }).first().click();
  await page.waitForTimeout(900);

  // Press advancing controls (anything in the deck that isn't Reset) plus any in-rail
  // Authorize / Evaluate buttons, until nothing advances.
  let steps = 0;
  for (; steps < 14; steps++) {
    const inRail = page.getByRole('button', { name: /^(Authorize|Evaluate|Approve)/ }).first();
    if (await inRail.count()) { await inRail.click(); await page.waitForTimeout(3200); continue; }
    const deck = page.getByRole('button', { name: /^(?!Reset|Details|Bundle|Verify|Why|tx|Presenter|Diagram|Detail|Execution only|Summary).+/ }).last();
    if (!(await deck.count())) break;
    const label = (await deck.textContent())?.trim() ?? '';
    if (/^Reset/.test(label)) break;
    await deck.click();
    await page.waitForTimeout(3400);
  }

  const verdict = await page.locator('text=/EXECUTED|BLOCKED|REFUSED/').first().textContent().catch(() => null);
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 2);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await page.screenshot({ path: `${OUT}/${slug}.png` });

  const bad = steps === 0 || !verdict;
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '}  ${title.padEnd(34)} steps=${String(steps).padStart(2)} verdict=${verdict ?? 'none'} pageScrolls=${scrolls}`);
}

await browser.close();
if (errors.length) { console.log('\nPAGE ERRORS:'); errors.slice(0, 12).forEach((e) => console.log(' ', e)); }
console.log(failures || errors.length ? `\nFAILURES: ${failures}, errors: ${errors.length}` : '\nall demos ok');
process.exit(failures || errors.length ? 1 : 0);
