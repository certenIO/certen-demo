/**
 * Viewport QA (Runbook 1, step 6).
 *
 * Asserts the cockpit is presentation-safe: at 1280x720 and 1440x900, for each demo's blocked
 * state, the five rails render and the page does not require vertical scrolling. Captures
 * screenshots to qa/shots/.
 *
 * Prereqs: the cockpit must be running (npm run dev) at COCKPIT_URL (default http://localhost:3001),
 * and Playwright installed:  npx playwright install chromium
 * Run:  node qa/viewport-qa.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const COCKPIT_URL = process.env.COCKPIT_URL ?? 'http://localhost:3001';
const here = dirname(fileURLToPath(import.meta.url));
const shots = join(here, 'shots');
mkdirSync(shots, { recursive: true });

const SCENARIOS = ['Stop the Production Mistake', 'AI Agent Guardrails', 'Cross-Chain Treasury Protection'];
const VIEWPORTS = [
  { w: 1280, h: 720 },
  { w: 1440, h: 900 },
];

let failures = 0;

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  // Force the worst case for the no-scroll check: instant reveal (all rails shown), story/exec mode.
  await ctx.addInitScript(() => {
    localStorage.setItem('certen.pace', 'instant');
    localStorage.setItem('certen.step', '0');
    localStorage.setItem('certen.builder', '0');
    localStorage.setItem('certen.technical', '0');
  });
  const page = await ctx.newPage();
  for (const name of SCENARIOS) {
    try {
      await page.goto(COCKPIT_URL, { waitUntil: 'networkidle' });
      await page.getByText(name, { exact: false }).first().click();
      // press the first (emphasis) control to reach the first meaningful state
      await page.waitForTimeout(1200);
      const startBtn = page.getByRole('button', { name: /Propose|Wake the AI/ }).first();
      if (await startBtn.count()) await startBtn.click();
      await page.waitForTimeout(2500);

      // assert the five rail numbers are present
      const railsVisible = await page.evaluate(() => {
        const wanted = ['1', '2', '3', '4', '5'];
        const found = new Set();
        document.querySelectorAll('div').forEach((el) => {
          const t = (el.textContent || '').trim();
          if (wanted.includes(t) && el.clientWidth <= 40 && el.clientHeight <= 40) found.add(t);
        });
        return wanted.every((w) => found.has(w));
      });

      const measure = () =>
        page.evaluate(() => {
          const rails = document.querySelector('[data-qa="rails"]');
          if (!rails) return 9999;
          return rails.scrollHeight - rails.clientHeight;
        });

      const slug = name.toLowerCase().replace(/[^a-z]+/g, '-');
      const blockedOverflow = await measure();
      await page.screenshot({ path: join(shots, `${slug}-${vp.w}x${vp.h}-blocked.png`) });

      // drive through to the executed payoff (the tallest state: proof + execution legs)
      let execOverflow = blockedOverflow;
      const approve = page.getByRole('button', { name: 'Approve', exact: true }).first();
      if (await approve.count()) {
        await approve.click();
        await page.waitForTimeout(7000);
        execOverflow = await measure();
        await page.screenshot({ path: join(shots, `${slug}-${vp.w}x${vp.h}-executed.png`) });
      }

      const worst = Math.max(blockedOverflow, execOverflow);
      const ok = railsVisible && worst <= 8;
      if (!ok) failures++;
      console.log(`${ok ? '✓' : '✗'} ${name} @ ${vp.w}x${vp.h} — rails:${railsVisible} blocked:${blockedOverflow} executed:${execOverflow}`);
    } catch (e) {
      failures++;
      console.log(`✗ ${name} @ ${vp.w}x${vp.h} — ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();

console.log(failures === 0 ? '\n✓ Viewport QA passed — no-scroll at both viewports.' : `\n✗ ${failures} viewport check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
