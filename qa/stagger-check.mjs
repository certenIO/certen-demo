import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const OUT='qa/shots/stagger'; mkdirSync(OUT,{recursive:true});
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1600,height:900}});
await ctx.addInitScript(()=>{localStorage.setItem('certen.pace','cinematic');localStorage.setItem('certen.recap','0');localStorage.setItem('certen.view.v2','1');});
const p=await ctx.newPage();
await p.goto('http://localhost:3010',{waitUntil:'networkidle'});
await p.getByText('Regulated Asset Issuance',{exact:true}).first().click();
await p.waitForTimeout(900);
await p.getByRole('button',{name:/Issue \$50,000,000/}).click(); await p.waitForTimeout(2500);
for (let i=0;i<3;i++){ const btn=p.getByRole('button',{name:/^(Authorize|Evaluate)/}).first();
  if(await btn.count()){await btn.click(); await p.waitForTimeout(3000);} }
// now sample the journey as it fills
// Read the journey's actual rendered state: which step labels are showing, and whether the
// chain step is mid-flight. Counting SVGs alone can't distinguish "executing" from "done".
const read=async()=>p.evaluate(()=>{
  const el=[...document.querySelectorAll('*')].find(e=>e.textContent?.trim().startsWith('PROOF JOURNEY')&&e.children.length);
  if(!el)return'-';
  const done=el.querySelectorAll('svg[data-testid$="RoundedIcon"]').length;
  const spinning=el.querySelectorAll('.MuiCircularProgress-root').length;
  const exec=/Executing…/.test(el.textContent||'')?' EXECUTING':'';
  return `${done} landed${spinning?` +${spinning} in-flight`:''}${exec}`;});
for (let t=0;t<44;t++){
  await p.screenshot({path:`${OUT}/t${String(t).padStart(2,'0')}.png`});
  console.log(`t=${t*400}ms`, await read());
  await p.waitForTimeout(400);
}
await b.close();
