import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
const browser = await chromium.launch();

async function run(demo, steps, out) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { localStorage.setItem('certen.pace', 'instant'); localStorage.setItem('certen.recap', '1'); });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.getByText(demo, { exact: false }).first().click();
  await page.waitForTimeout(700);
  for (const s of steps) {
    await page.getByRole('button', { name: s }).first().click();
    await page.waitForTimeout(3500);
  }
  await page.waitForTimeout(1800); // let recap auto-surface (1.2s)
  await page.screenshot({ path: join(shots, out) });
  await ctx.close();
  console.log('captured', out);
}

// safe variant — Demo 1 executes to the end
await run('Stop the Production Mistake', [/Propose/, /^Approve$/], 'recap-safe.png');
// refused variant — Demo 3 stolen-key attack
await run('Cross-Chain Treasury Protection', [/Propose the \$25M/, /^Approve$/, /treasurer key is stolen/], 'recap-refused.png');

await browser.close();
