# Certen Demos — the Authorization Cockpit

> **One engine. Four stories. The action is the only thing that changes.**
>
> A self-contained, projection-ready demo suite that makes Certen's value scream off the screen:
> nothing high-value executes until policy is satisfied and *proven* — whether the actor is a
> person, a consortium of companies, a release pipeline, or an AI.

Presenter and planning material is kept out of this repository.
This README is how you **run** what those docs describe.

---

## What's in here

```
demos/
├── cockpit/         The Authorization Cockpit — the cinematic UI (Vite + React + MUI)
├── orchestrator/    The demo engine — Policy Engine, scenarios, SSE feed (Node + Fastify)
├── agent/           Demo 2's real Claude agent whose only action tool routes through Certen
├── contracts/       DemoUpgradeable / DemoTreasury Solidity + Foundry deploy script
├── scripts/         seed.ts (provision live identities) + preflight.ts (health checks)
├── qa/              Playwright checks — viewport, walkthrough, static-build verification
├── docker-compose.yml
└── .env.example
```

The cockpit is a pure function of one `ScenarioState` object the orchestrator streams over SSE.
Everything maps 1:1 to the Certen engine, so the audience literally watches *"same engine,
different action"* four times:

```
① Proposed Action → ② Policy → ③ Approvals → ④ Proof → ⑤ Execution
```

**Two views, toggled in the header.** **Diagram** (the default) draws the flow as an authority
graph — actor and action, each organization's seats converging into a proof node that gates
execution — with a proof journey on the right naming each phase of the real V6.1 cycle as it lands.
**Detail** is the text layout, and carries the *Without CERTEN → CERTEN did this → Why it matters*
band.

---

## Quick start (simulated mode — zero external dependencies)

```bash
cd demos
cp .env.example .env
npm install
npm run dev
```

- Orchestrator → http://localhost:8770
- **Cockpit → http://localhost:3001**  ← open this, full-screen, and present.

`npm run dev` runs both together. Simulated mode is fully self-contained: real proof hashes, real
explorer-link shapes, real choreography — no gateway, chain, or API keys required. It always works,
which makes it the safe default for a live room.

> Run them separately if you prefer: `npm run dev:orchestrator` and `npm run dev:cockpit`.

---

## Share it (self-contained static build)

The **production build is self-contained** — it runs the whole simulated engine in the browser, no
backend. Build it and host the folder anywhere:

```bash
npm run build:static     # → cockpit/dist  (drag to Netlify Drop, or `npx vercel deploy dist --prod`)
```

Full options in [`SHARE.md`](./SHARE.md). (`npm run dev` stays orchestrator-backed for local iteration.)

## Cockpit features (self-teaching, audit-driven)

- **No-scroll layout** — everything lands at **1280×720** and **1440×900** with no scrolling.
  Verified by `npm run qa:viewport` (Playwright; screenshots to `qa/shots/`).
- **Presenter-driven beats** — every act stops between beats, so each refusal and each signature is
  its own moment and nothing runs away from you mid-sentence. **Pace** (Cinematic / Standard /
  Instant, default Standard) and **Step mode** (advance with **Space**) live in the ⚙ popover, along
  with the build stamp — so "am I on the current bundle?" is a five-second check.
- **Step back one beat** — separate from Reset, which restarts the whole scenario.
- **Policy-engine throughput** — the volume the engine cleared on policy alone while the demo walked
  one exception. Without it, the screen reads as "every action needs three companies and a proof."
- **Evidence** — distinguishes an **Execution Proof** from a **Refusal Record** (refused actions are
  auditable, not an empty rail). Simulated artifacts are tagged **SAMPLE** and left unlinked.
- **Modes** — Diagram / Detail, Exec / Technical, a presenter-cues toggle (operator-only), and a
  Trust model drawer.
- **Live vs simulated** — a **SIMULATED** chip or, in live mode, a **LIVE** chip with real dependency
  health (gateway / proofs / RPCs), backed by `GET /api/demo-health`.

## The four demos

Open the cockpit, click a demo card, then click the **pulsing** button. Everything is a button —
never type during a demo. Entering a demo auto-resets it.

### Demo 1 · Regulated Asset Issuance — 3 acts, 12 beats
Tokenized gold across three companies: an issuer, a custodian holding the metal, a transfer agent
keeping the register. Each holds its own keys; some seats are people and some are that company's own
headless policy-engine signer.
1. A correct issuance — three companies, three thresholds, one proof, and only then does supply move.
2. **The keystroke.** A delivery arrives and the ceiling rises; then an operator keys in six extra
   zeros. The issuer's own officers approve it and so does the transfer agent. The custodian's
   reserve policy refuses — *arithmetically*, not because someone read carefully.
3. **Total compromise.** The attacker holds every one of the issuer's officer keys. That buys one
   seat of three. The custodian refuses on the gold; the transfer agent refuses on the register.

### Demo 2 · AI Agent Guardrails — 4 acts, 8 beats
An AI agent with its own key and real spending authority.
1. Within policy → it proves and executes on its own key. *Certen is policy, not a wall.*
2. $5M needs a person — so the agent splits it into six payments under the limit. Refused: the limit
   is a rolling window across everything the actor moved, not a per-transaction cap. Then a human
   co-signs the original and it executes.
3. **Prompt injection.** A genuine credential, a valid signature, and a payee that isn't on the
   register. No proof can form.
4. **Its key is stolen** — with a genuinely issued proof. The account re-derives the commitment,
   the destination changed, and nothing executes. *The blast radius of a stolen agent key is nothing.*

### Demo 3 · Stop the Production Mistake — 3 acts, 7 beats
1. A correct release: three authorities sign, the version changes only against the proof.
2. **The pipeline is compromised** — valid CI credentials, the normal release path, a backdoored
   build. All three authorities are legitimate, and none of them recognises the release.
3. **The gate is sized to the action.** Same engineer, same contract, a different call: replacing
   the code needs the two senior keys, not the three release authorities. This act *resolves* — the
   claim is that the right people can still ship.

### Demo 4 · Cross-Chain Treasury Protection — 4 acts, 10 beats
1. A legitimate $25M cross-chain transfer: three authorities, one proof, both legs.
2. The treasurer key is stolen, then a second authority is phished. Both signatures genuine. Nothing
   moves.
3. **The replayed proof** — the strongest single frame in any demo. The attacker stops faking
   authority and reuses authority that was real: the proof that moved $25M in Act 1. Three of three
   genuine signatures, and it is still refused. A proof authorizes one action, once, bound to one
   destination.
4. Revoke both compromised keys in one action, then reassign control to a fresh key — every account
   on every chain those keys controlled is re-secured without touching those chains.

---

## Live mode — REAL on-chain execution + verification

In live mode the execution rail sends a **real transaction** to demo contracts deployed on
**Base Sepolia** and **Arbitrum Sepolia**, then **reads the contract state back to prove it** and
shows the real block-explorer link. This is genuinely verifiable by anyone.

```bash
# .env  (the live URLs below are already the defaults in .env.example)
DEMO_MODE=live
EVM_SPONSOR_PRIVATE_KEY=0x…       # the sponsor key = the contracts' authorizer
                                  # (use api-bridge/.env EVM_SPONSOR_PRIVATE_KEY → 0x3242…185FC8)
```

Then `npm run dev` and present. What happens on chain per demo:

| Demo | Real on-chain action | Verified by |
|------|----------------------|-------------|
| 1 · Asset Issuance | `DemoTreasury` mint of XAUV supply on Base Sepolia | balance delta; the over-mint and the compromised-issuer mints **never** execute |
| 2 · AI Guardrails | `DemoTreasury.withdraw()` on Base Sepolia ($250k, then $5M); the split-payment evasion, the unlisted payee and the stolen-key call **never** execute | balance delta |
| 3 · Change Control | `DemoUpgradeable.setVersion()` on Base Sepolia | re-reading `version()`; the backdoored build **never** executes |
| 4 · Treasury | `withdraw` on Base Sepolia + `deposit` on Arbitrum Sepolia; the stolen-key and replayed-proof attempts **never** execute | balance delta on both chains |

Deployed contracts are recorded in [`contracts/deployments.json`](./contracts/deployments.json).
Redeploy your own with [`contracts/README.md`](./contracts/README.md) (Foundry). Top balances back
up between sessions with the treasury's `deposit` (or just redeploy).

**Pre-flight:** `DEMO_MODE=live npm run preflight` checks the orchestrator, the live gateway +
proofs service, **and that every demo contract has bytecode on-chain**. Must exit 0.

### Real Certen authorization on Kermit

The approval + proof path drives against the **real API Gateway**, which is wired to Accumulate
(Kermit) + the proofs service. Validate the real path end-to-end:

```bash
GATEWAY_API_KEY=ck_live_… DEMO_MODE=live npm --workspace orchestrator run kermit:check
```

This creates a **real ADI + key page on Kermit**, runs a governance op (add keys, set threshold 3),
and reads the inbox — using the Ed25519 multi-sig signer in `orchestrator/src/gateway/signer.ts`.
A gateway API key is the one credential you must supply (minting it needs gateway DB/admin access).

**Safety net:** every live call is best-effort with a timeout. If a chain, the gateway, or the
proofs service is slow/unreachable, that step auto-degrades to synthesized data so the demo never
stalls in front of a prospect. The cockpit header shows a **LIVE** vs **SIMULATED** chip.

---

## Demo 2's real AI agent (for skeptics)

The cockpit uses a pre-recorded agent transcript for perfect timing. To show a **real** model get
blocked, run the harness live:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run agent -- --preset cutcosts
```

It runs `claude-opus-4-8` with exactly one tool — `certen_execute` — so the model has no way to act
except through Certen. Watch it reason, try to delete the database, and get refused. See
[`agent/README.md`](./agent/README.md).

Note what this does and does not prove: it demonstrates that the model is **confined to one tool**
against a local mirror of the Certen ruleset. It is not the on-chain proof path — that is live mode
above.

---

## Docker

```bash
cd demos && docker compose up -d --build
# cockpit → http://localhost:3001 · orchestrator → http://localhost:8770
```

---

## Ports

| Service | Address |
|---------|---------|
| Cockpit | http://localhost:3001 |
| Orchestrator | http://localhost:8770 |
| API Gateway (live) | https://gateway.kompendium.co |
| Proofs service (live) | https://proofs.kompendium.co |
| Base Sepolia / Arbitrum Sepolia | public RPCs (see `.env`) |

## Troubleshooting

- **Cockpit shows "Cannot reach the orchestrator"** → the orchestrator isn't on :8770. Run
  `npm run dev:orchestrator`. It auto-retries once the orchestrator is up.
- **A demo looks stuck mid-reveal** → the choreography has deliberate ~1–2s beats (blocked → proof
  → execute). Give it a moment; controls are disabled (`busy`) during the reveal.
- **A fix looks like it didn't land** → check the build stamp in the ⚙ popover. A cached `index.html`
  silently serves an old bundle.
- **Live mode 401s** → the gateway needs a valid `GATEWAY_API_KEY` with the right scopes; re-run
  `npm run preflight`.
