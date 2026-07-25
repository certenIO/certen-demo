/** Confirms the summary modal never opens itself, and that the manual trigger works. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT='qa/shots/recap'; mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1600,height:900}});
await ctx.addInitScript(()=>{localStorage.setItem('certen.pace','instant');localStorage.setItem('certen.view.v2','1');}); // recap left at its default
const p=await ctx.newPage();
await p.goto('http://localhost:3010',{waitUntil:'networkidle'});
const DEMO=process.env.DEMO ?? 'Regulated Asset Issuance';
await p.getByText(DEMO,{exact:true}).first().click(); await p.waitForTimeout(700);

// drive to the TRUE end of the demo — the summary is per demo, not per act
for(let i=0;i<14;i++){
  let btn=p.getByRole('button',{name:/^(Authorize|Evaluate)/}).first();
  if(!(await btn.count())) btn=p.getByRole('button',{name:/^(?!Reset|Summary|Diagram|Detail|Presenter).+/}).last();
  if(!(await btn.count())) break;
  const label=(await btn.textContent())?.trim()??'';
  if(/^Reset/.test(label)||!label) break;
  await btn.click(); await p.waitForTimeout(2600);
}
await p.waitForTimeout(9000); // well past the old 1.2s auto-open, and past the full journey
const modal=async()=>p.getByText('What just happened',{exact:false}).count().catch(()=>0);
const dialogs=async()=>p.locator('[role="dialog"], .MuiModal-root').count();
console.log('after settling — dialogs open:', await dialogs());
await p.screenshot({path:`${OUT}/terminal-no-modal.png`});
const btn=p.getByRole('button',{name:/^Summary/});
console.log('summary button present:', await btn.count());
if(await btn.count()){ await btn.click(); await p.waitForTimeout(900);
  console.log('dialogs after clicking Summary:', await dialogs());
  await p.screenshot({path:`${OUT}/summary-opened.png`}); }
await b.close();
