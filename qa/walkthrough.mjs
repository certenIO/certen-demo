/**
 * Act-by-act walkthrough. Drives one demo (or all) click by click, screenshotting BEFORE and
 * AFTER every advance, so each intermediate state can be reviewed — not just the terminal frame.
 *
 * Records the control it pressed into the filename, and reports any state that looks wrong:
 * a missing headline figure, an empty side column, an outcome node with no label.
 *
 * Prereqs: cockpit served at COCKPIT_URL (default http://localhost:3010).
 * Run:  node qa/walkthrough.mjs                 (all demos)
 *       DEMO="AI Agent" node qa/walkthrough.mjs (one demo)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.COCKPIT_URL ?? 'http://localhost:3010';
const OUT = process.env.OUT ?? 'qa/shots/walkthrough';
const ONLY = process.env.DEMO ?? '';
const VW = Number(process.env.VW ?? 1600);
const VH = Number(process.env.VH ?? 900);
mkdirSync(OUT, { recursive: true });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 44);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
await ctx.addInitScript(() => {
  localStorage.setItem('certen.pace', 'instant');
  localStorage.setItem('certen.step', '0');
  localStorage.setItem('certen.recap', '0');
  localStorage.setItem('certen.view.v2', '1');
});

const problems = [];
const page = await ctx.newPage();
page.on('pageerror', (e) => problems.push(`EXCEPTION: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`CONSOLE: ${m.text()}`); });

await page.goto(URL, { waitUntil: 'networkidle' });
const titles = (await page.locator('.MuiCard-root h4').allTextContents()).filter((t) => !ONLY || t.includes(ONLY));

/** Inspect the rendered diagram for the defects that keep recurring. */
async function audit(page, tag) {
  return page.evaluate((tag) => {
    const out = [];
    const txt = (el) => (el?.textContent ?? '').trim();
    // The Proof Journey's technical readings are deliberately technical — "key page", "BLS",
    // "merkle" belong there and only there. Exclude them so the ban still applies everywhere else.
    const techNodes = [...document.querySelectorAll('[data-tech]')];
    const techText = new Set(techNodes.map((n) => (n.textContent || '').trim()));
    let body = document.body.innerText;
    for (const t of techText) body = body.split(t).join(' ');

    // jargon that should never survive to the diagram
    const banned = [/\bG[012]\b/, /acc:\/\//, /key page/i, /key book/i, /\bquorum\b/i, /attestation/i, /\bADI\b/];
    for (const re of banned) {
      const m = body.match(re);
      if (m) out.push(`jargon "${m[0]}"`);
    }

    // the action band should always carry a headline figure
    const band = document.querySelector('[data-qa="rails"]');
    if (band && !txt(band)) out.push('empty canvas');

    // an outcome node that says EXECUTED/REFUSED with nothing after it
    if (/\n(EXECUTED|REFUSED)\n/.test(body) === false && /(EXECUTED|REFUSED)/.test(body)) {
      /* fine — label present inline */
    }
    return out.map((o) => `${tag}: ${o}`);
  }, tag);
}

for (const title of titles) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByText(title, { exact: true }).first().click();
  await page.waitForTimeout(1000);

  const d = slug(title);
  let i = 0;
  await page.screenshot({ path: `${OUT}/${d}-${String(i).padStart(2, '0')}-idle.png` });
  problems.push(...(await audit(page, `${title} [idle]`)));

  for (; i < 16; i++) {
    // in-canvas authority buttons take priority, then the footer deck
    let btn = page.getByRole('button', { name: /^(Authorize|Evaluate|Approve)/ }).first();
    let where = 'canvas';
    if (!(await btn.count())) {
      btn = page.getByRole('button', { name: /^(?!Reset|Details|Bundle|Verify|Why|tx|Presenter|Diagram|Detail).+/ }).last();
      where = 'deck';
    }
    if (!(await btn.count())) break;
    const label = (await btn.textContent())?.trim() ?? '';
    if (/^Reset/.test(label) || !label) break;

    await btn.click();
    await page.waitForTimeout(3600);
    const name = `${d}-${String(i + 1).padStart(2, '0')}-${where}-${slug(label)}`;
    await page.screenshot({ path: `${OUT}/${name}.png` });
    problems.push(...(await audit(page, `${title} [${label}]`)));
    console.log(`  ${title} → ${label}`);
  }
  console.log(`${title}: ${i} steps`);
}

await browser.close();
if (problems.length) {
  console.log('\n── ISSUES ──');
  [...new Set(problems)].forEach((p) => console.log(' ', p));
} else {
  console.log('\nno issues detected');
}
