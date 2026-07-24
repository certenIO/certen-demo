/**
 * Drives the RWA issuance demo end to end and screenshots every beat, in film mode,
 * at the aspect ratio the YC video will be filmed at.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.COCKPIT_URL ?? 'http://localhost:3010';
const OUT = process.env.OUT ?? 'C:/Users/jason/AppData/Local/Temp/claude/C--Accumulate-Stuff-certen-demos/d0513a41-7edc-4321-95f1-19165644105c/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

const FILM = process.env.FILM !== '0';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW ?? 1600), height: Number(process.env.VH ?? 900) }, deviceScaleFactor: 1 });
await ctx.addInitScript((film) => {
  localStorage.setItem('certen.pace', 'instant');
  localStorage.setItem('certen.step', '0');
  localStorage.setItem('certen.builder', '0');
  localStorage.setItem('certen.recap', '0');
  localStorage.setItem('certen.film', film ? '1' : '0');
}, FILM);

const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE EXCEPTION:', e.message));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot:', name);
};
const click = async (rx, label) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (!(await b.count())) { console.log('MISSING BUTTON:', label ?? String(rx)); return false; }
  await b.click();
  return true;
};

await page.goto(URL, { waitUntil: 'networkidle' });
await shot('00-launcher');

await page.getByText('Regulated Asset Issuance', { exact: false }).first().click();
await page.waitForTimeout(800);
await shot('01-idle');

// ── Act 1 ──
await click(/Issue \$50,000,000/, 'start');
await page.waitForTimeout(1500);
await shot('02-act1-proposed');

for (const [i, name] of [['a', 'issuer'], ['b', 'custodian'], ['c', 'ta']]) {
  const btn = page.getByRole('button', { name: /Authorize|Evaluate/ }).first();
  if (await btn.count()) { await btn.click(); await page.waitForTimeout(2600); }
  await shot(`03-act1-org-${i}-${name}`);
}
await page.waitForTimeout(4000);
await shot('04-act1-executed');

// ── Act 2 ──
if (await click(/an operator makes a mistake/, 'act2')) await page.waitForTimeout(2200);
await shot('05-act2-delivery');
if (await click(/Operator keys in the mint/, 'act2-submit')) await page.waitForTimeout(6000);
await shot('06-act2-breach-pending');
if (await click(/Evaluate|Authorize/, 'custodian')) await page.waitForTimeout(3500);
await shot('07-act2-refused');

// ── Act 3 ──
if (await click(/completely compromised/, 'act3')) await page.waitForTimeout(2200);
await shot('08-act3-setup');
if (await click(/Attacker mints/, 'act3-submit')) await page.waitForTimeout(9000);
await shot('09-act3-refused');

await browser.close();
console.log('done');
