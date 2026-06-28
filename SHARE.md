# Sharing the Authorization Cockpit (simulated)

The simulated cockpit is **self-contained** — the production build runs the entire demo engine
in the browser (no orchestrator, no backend, no API keys). So sharing it is just hosting a folder
of static files and sending a link.

> Why this works: `npm run dev` is orchestrator-backed (for local iteration), but the **production
> build** (`VITE_STATIC=1`, set in `cockpit/.env.production`) bundles the same scenario engine to
> run in-page. Verified: it reaches EXECUTED + the certainty recap with every backend call blocked.

## 1. Build it

```bash
cd C:\Accumulate_Stuff\certen\demos
npm install            # first time only
npm run build:static   # → produces cockpit/dist  (a self-contained static site)
```

`cockpit/dist/` is the whole app. Nothing else needs to run.

## 2. Host it — pick one

### A) Netlify Drop — zero friction (recommended for a quick share)
1. Open <https://app.netlify.com/drop>
2. Drag the **`demos/cockpit/dist`** folder onto the page.
3. You get a public URL instantly (e.g. `https://certen-cockpit-xyz.netlify.app`). Send it.

No account strictly required for a temporary drop; sign in to keep it / rename it.

### B) Vercel CLI — deploy the prebuilt folder
```bash
cd C:\Accumulate_Stuff\certen\demos\cockpit
npx vercel deploy dist --prod
```
First run prompts a quick login + project name, then prints the production URL. Because we deploy
the **prebuilt `dist`**, Vercel just serves the static files (no build step on their side, so no
workspace/install concerns).

### C) Vercel via Git (if you want auto-deploys on push)
In the Vercel project settings:
- **Root Directory:** `demos/cockpit`
- **Install Command:** `cd ../.. && npm install` (installs the workspace so the build resolves)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

(A) or (B) are simpler for a one-off founder review; (C) is for a living link.

## Notes
- The app is a single-page app with **no client-side routing**, so no redirect/rewrite config is
  needed on any host.
- The header shows a **SIMULATED CHOREOGRAPHY** chip so the viewer knows it's deterministic demo
  data; the security model + "execution only on proof" gates are explained in-app (header chip) and
  in the post-demo certainty recap.
- To sanity-check a build is truly self-contained: `npm run preview:static` then
  `node qa/static-verify.mjs` (loads the build with all `:8770` calls blocked and runs a demo).
