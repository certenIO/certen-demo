# Certen Demos — the Authorization Cockpit

> **One engine. Three stories. The action is the only thing that changes.**
>
> A self-contained, projection-ready demo suite that makes Certen's value scream off the screen:
> nothing high-value executes until policy is satisfied and *proven* — whether the actor is a
> person, a multisig, or an AI.

The planning docs live in [`docs/`](./docs): start with [`docs/demo_plan_overview.md`](./docs/demo_plan_overview.md).
This README is how you **run** what those docs describe.

---

## What's in here

```
demos/
├── cockpit/         The Authorization Cockpit — the cinematic 5-rail UI (Vite + React + MUI)
├── orchestrator/    The demo engine — Policy Engine, scenarios, SSE feed (Node + Fastify)
├── agent/           Demo 2's real Claude agent whose only action tool routes through Certen
├── contracts/       DemoUpgradeable / DemoTreasury Solidity + Foundry deploy script
├── scripts/         seed.ts (provision live identities) + preflight.ts (health checks)
├── docs/            The full demo plan (overview + one doc per demo)
├── docker-compose.yml
└── .env.example
```

The cockpit is a pure function of one `ScenarioState` object the orchestrator streams over SSE.
Its five rails map 1:1 to the Certen engine, so the audience literally watches *"same engine,
different action"* three times:

```
① Proposed Action → ② Policy → ③ Approvals → ④ Proof → ⑤ Execution
```

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

The cockpit follows the [audit runbooks](./docs/certen_authorization_cockpit_audit_runbooks.md):

- **No-scroll layout** — all five rails + the proof/execution payoff are visible at **1280×720**
  and **1440×900** with no scrolling. Verified by `npm run qa:viewport` (Playwright; captures
  screenshots to `qa/shots/`).
- **Cinematic staged reveal** — the five rails are introduced one at a time with an **active-rail
  spotlight** (not-yet-reached rails are dimmed), so each action and result lands as its own beat
  and the verdict stamp holds until the approvals appear. **Pace** (Cinematic / Standard / Instant,
  default Cinematic) and **Step mode** (advance with **Space** or the on-screen button) live in the
  ⚙ presenter-settings popover.
- **"Why This Matters" strip** — every state shows *Without CERTEN → CERTEN did this → Why it
  matters*, so the screen teaches without narration.
- **Approvals & Coordination** — the live pending-tx hash, who has **Signed** vs been **notified**
  (inbox/webhook/KMS), and a coordination summary. Collapses to one line once quorum is reached.
- **Evidence rail** — distinguishes an **Execution Proof** from a **Blocked Action Record** (refused
  actions are auditable, not an empty rail) and translates **G0/G1/G2** to plain English.
- **Modes** (top-right): **Story / Builder** (Builder shows the API integration trace),
  **Exec / Technical** (Technical expands proof id / tx / Merkle), a **presenter-cues** toggle
  (operator-only), and a **Trust model** drawer.
- **Live vs simulated** — a **SIMULATED CHOREOGRAPHY** chip (tooltip explains it) or, in live mode,
  a **LIVE** chip with real dependency health (gateway / proofs / RPCs), backed by
  `GET /api/demo-health`.

## How to drive each demo

Open the cockpit, click a demo card, then click the **pulsing** button. Everything is a button —
never type during a demo.

### Demo 1 · Stop the $10M Mistake
1. **Propose the upgrade** → lands at **BLOCKED** (CTO ✓, Security ✓, Foundation ✗ — 2 of 3).
2. Click **Approve** on the Foundation tile → stamp slams **APPROVED** → a **Proof** card
   materializes → the **Execution** rail flips the on-chain version `6.0 → 6.1`.

### Demo 2 · AI Agent Guardrails (three acts)
1. **Wake the AI agent** → Act 1: the agent reasons live (right panel) and auto-executes a $250k
   transfer — *proves Certen is policy, not a blanket wall.*
2. **Now the agent moves $5,000,000** → **BLOCKED** (over $1M needs a human). Click **Approve**
   (Human) → executes with proof.
3. **Now the agent tries to delete the database** → **BLOCKED forever.** The Customer Records panel
   stays at **1,284,902 — untouched.** There is intentionally no approve button. Mic drop.

### Demo 3 · Cross-Chain Treasury Protection (two acts)
1. **Propose the $25M transfer** → **BLOCKED** at 2 of 3 (Treasurer ✓, Foundation ✓, Council ✗).
   Click **Approve** (Security Council) → proof → both bridge legs execute, treasury bar moves
   $250M → $225M / +$25M.
2. **Now: treasurer key is stolen** → the attacker resubmits with the *real* treasurer key →
   **1 of 3 → BLOCKED.** Funds never move.

Click **Reset** (or just re-enter the demo) to start clean. Entering a demo auto-resets it.

---

## Live mode — REAL on-chain execution + verification

In live mode the execution rail (⑤) sends a **real transaction** to demo contracts deployed on
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
| 1 · Stop the Mistake | `DemoUpgradeable.setVersion("6.1")` on Base Sepolia | re-reading `version()` == "6.1" |
| 2 · AI Guardrails | `DemoTreasury.withdraw()` on Base ($250k, then $5M); delete-DB **never** executes | balance delta |
| 3 · Treasury | `withdraw` on Base + `deposit` on Arbitrum (cross-chain); stolen-key attack **never** executes | balance delta on both chains |

Deployed contracts are recorded in [`contracts/deployments.json`](./contracts/deployments.json).
Redeploy your own with [`contracts/README.md`](./contracts/README.md) (Foundry). Top balances back
up between sessions with the treasury's `deposit` (or just redeploy).

**Pre-flight:** `DEMO_MODE=live npm run preflight` checks the orchestrator, the live gateway +
proofs service, **and that every demo contract has bytecode on-chain**. Must exit 0.

### Real Certen authorization on Kermit (rails ①–④)

Rails ①–④ (the multi-sig approval + Certen proof) drive against the **real API Gateway**, which is
wired to Accumulate (Kermit) + the proofs service. Validate the real path end-to-end:

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
- **Live mode 401s** → the gateway needs a valid `GATEWAY_API_KEY` with the right scopes; re-run
  `npm run preflight`.
