# Certen Demos — Master Plan & Overview

> **One engine. Three stories. The action is the only thing that changes.**
>
> This document is the umbrella plan for the three flagship Certen demos. Read it first.
> Each demo has its own implementation doc:
> - [`demo_1_stop_the_10m_mistake.md`](./demo_1_stop_the_10m_mistake.md)
> - [`demo_2_ai_agent_guardrails.md`](./demo_2_ai_agent_guardrails.md)
> - [`demo_3_cross_chain_treasury_protection.md`](./demo_3_cross_chain_treasury_protection.md)

---

## 1. The thesis the demos must prove

Certen is **not** a governance product. It is an **execution authorization layer** — the
gatekeeper that sits between *intent* and *execution* for any high‑value action, on any chain,
by any actor (human, multisig, or AI).

The same five‑step engine runs in all three demos:

```
   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐   ┌───────────┐
   │ 1. ACTION │ → │ 2. POLICY │ → │3. APPROVALS│ → │4. PROOF │ → │5. EXECUTE │
   │ proposed  │   │ evaluated │   │  collected │   │ minted  │   │  on-chain │
   └──────────┘   └──────────┘   └───────────┘   └─────────┘   └───────────┘
```

The only thing that differs between demos is the **action**:

| Demo | Action verb | Audience feels… |
|------|-------------|-----------------|
| 1. Stop the Production Mistake | `UpgradeContract()` | "This stops the wrong person breaking production." |
| 2. AI Agent Guardrails | `TransferFunds()` / `DeleteDatabase()` | "This is the seatbelt for autonomous AI." |
| 3. Cross-Chain Treasury Protection | `BridgeTransfer()` | "A stolen key can no longer drain the treasury." |

**Design mandate (from `demo_overview_notes.md`):** every demo must be *instantly understandable,
visually obvious, emotionally compelling, economically meaningful, and technically credible*. The
value of Certen must **scream off the screen with near‑zero explanation.**

---

## 2. The single visual that ties it all together: the Certen Authorization Cockpit

We build **one** screen used by all three demos. Its five rails map 1:1 to the engine, so the
audience literally watches "same engine, different action" three times.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  CERTEN  ·  Authorization Cockpit                              [ BLOCKED ⛔ ]       │  ← global verdict stamp
├──────────────────────────────────────────────────────────────────────────────────┤
│ ① PROPOSED ACTION                                                                  │
│   Upgrade contract  acc://acme.acme/protocol   v6.0 → v6.1   ·  initiated by: CI/CD │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ② POLICY (auto-evaluated)                                                          │
│   "Production upgrade → requires 3 of 3: CTO · Security Lead · Foundation"          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ③ APPROVALS                            2 of 3                                       │
│   [ ✓ CTO ]   [ ✓ Security Lead ]   [ ✗ Foundation   (Approve ▸) ]                  │  ← live tiles + approve buttons
├──────────────────────────────────────────────────────────────────────────────────┤
│ ④ PROOF            (appears only after policy is satisfied)                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ⑤ EXECUTION        (fires only after proof is minted)                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

When the final approval lands, the audience sees, in sequence and within seconds:
`BLOCKED ⛔` → `APPROVED ✓` → a **Proof** card materializes → the **Execution** rail flips the
on‑chain state. No narration required.

The cockpit is a standalone, projection‑optimized app in `demos/cockpit` that ports the
**certen-web-app** design system (MUI, dual‑tone orange/purple theme, motion system) into a single
cinematic control‑room layout.

**Self-teaching upgrades (from the cockpit audit, 2026‑06‑28):** the cockpit now teaches the
ecosystem, not just the engine. Per the [audit runbooks](./certen_authorization_cockpit_audit_runbooks.md)
it adds: a presentation‑safe **no‑scroll layout** (all five rails + payoff visible at 1280×720 and
1440×900, QA‑verified via `npm run qa:viewport`); a **"Why This Matters"** explainer strip
(pain → CERTEN did this → takeaway); **Approvals & Coordination** showing the pending tx and who's
signed vs notified; an **Evidence** rail that distinguishes *Execution Proof* from *Blocked Action
Record* and translates G0/G1/G2 to plain English; **Story/Builder** and **Executive/Technical**
modes; operator **presenter cues**; a **Trust model** drawer; and a **SIMULATED CHOREOGRAPHY** /
**LIVE** health chip.

---

## 3. Architecture — what's real vs. what we build

**Principle: the engine is real, the choreography is scripted.** Nothing in the authorization path
is faked. Amounts are display labels over testnet value; approvals are real signatures; proofs are
real Certen proofs; execution is a real on‑chain transaction.

### Real Certen stack (used as‑is, lightly extended)

| Component | Path | Role in demos |
|-----------|------|---------------|
| **api-gateway** (Fastify :8090) | `certen/api-gateway` | The authorization brain. `POST /v1/transaction` & `/v1/governance` (propose), `GET /v1/pending` (inbox/approval state), `POST /v1/sign` (cast approval/vote), `GET /v1/proof/*` (proof retrieval). Multi-sig = Accumulate key-page `acceptThreshold` (M-of-N). |
| **Accumulate testnet** (Kermit) | external | Holds the identities (ADIs), key books/pages, and the M-of-N thresholds that *are* the policy enforcement. |
| **proofs_service** (Go :8080) | `certen/proofs_service` | Generates the 4-component proof (Merkle + anchor + chained L1-L3 + governance G0-G2 + validator attestations). Has its own React Proof Explorer we can embed for the "proof" reveal. |
| **api-bridge** (Express :8085) | `certen/api-bridge` | Executes the approved action on an EVM testnet via intents → `CertenAnchorV6_1`. Used for Demo 1 (upgrade call), Demo 3 (cross-chain transfer). |
| **certen-contracts** | `certen/certen-contracts` | `CertenAnchorV6_1`, `BLSZKVerifierV2`, `CertenAccountV4` (ERC-4337), factory. Plus one tiny new demo contract (see below). |
| **key-vault-signer** | `certen/key-vault-signer` | Browser-extension signer for real human approvals (Ed25519/secp256k1/BLS). Used where we want a visibly human "approve" click. |

### New build artifacts (demo-specific; small, well-scoped)

| New artifact | Where it lives | Why it's needed |
|--------------|----------------|-----------------|
| **A. Demo Cockpit** | new route `/cockpit` in `certen-web-app` | The single cinematic screen in §2. Reuses existing theme/components. |
| **B. Demo Orchestrator** | new tiny service `certen/demos/orchestrator` (Node/Fastify) **or** `api-gateway/src/demo/*` behind a feature flag | Owns scenario definitions, drives the real gateway/bridge/proofs, holds the demo actors' signing keys (provider-mode), and exposes a clean SSE/websocket feed the cockpit subscribes to. Keeps all demo glue in ONE place so the core products stay pure. |
| **C. Policy Engine** | `api-gateway/src/policy/*` (real product feature) | Today the gateway only enforces flat key-page thresholds. Demos 2 & 3 need **conditional** policy ("amount > $1M → human approval", "action == deleteDatabase → CTO+Security"). The policy engine evaluates the proposed action against declarative rules and selects the required approver set / threshold, then renders the human-readable policy string in rail ②. This is genuinely on the product roadmap, not throwaway. **Bring Your Own Policy Engine:** in production this is the customer's *existing* off-chain rules service (OPA, Sentinel, fraud/AML, homegrown) — Certen turns its decision into an Ed25519 signature on an Accumulate key page, where the chain enforces the threshold. See [`demo_2_ai_agent_guardrails.md` §7](./demo_2_ai_agent_guardrails.md#7-bring-your-own-policy-engine--how-your-rules-become-cryptographic-gates). |
| **D. AI Agent harness** | `certen/demos/agent` | Demo 2 only. A Claude-powered agent (model `claude-opus-4-8`, tool-use) whose *only* execution tool routes through Certen instead of executing directly — making Certen visibly "the safety layer between AI intent and execution." |
| **E. Demo target contracts** | `certen-contracts/evm/src/demo/` | `DemoUpgradeable.sol` (a `version` string only the CertenAccount/anchor can change — Demo 1) and a `DemoTreasury` flow for Demo 3. Lets execution flip *visible on-chain state*. |

### The shared flow (every demo)

```
Cockpit (web-app)  ──subscribe (SSE)──►  Demo Orchestrator
      │                                         │
      │ "propose action"                        ├─► api-gateway  /v1/transaction|/v1/governance   (propose + policy)
      │                                         │      └─► Policy Engine: evaluate → required approvers/threshold
      │ "Foundation approves" (button)          ├─► api-gateway  /v1/sign                          (cast real signature)
      │                                         │      └─► Accumulate: threshold reached → tx executes
      │                                         ├─► proofs_service  proof minted                   (rail ④)
      │                                         └─► api-bridge → CertenAnchorV6_1 on testnet       (rail ⑤ execution)
      ▼
  rails ①→⑤ update live as orchestrator emits events
```

---

## 4. Environment & infrastructure

| Item | Choice | Notes |
|------|--------|-------|
| Accumulate network | **Kermit testnet** (`https://kermit.accumulatenetwork.io/v3`) | Already wired in web-app config. Pre-fund credits. |
| EVM execution chain | **Base Sepolia** primary, **Arbitrum Sepolia** secondary | Demo 3 cross-chain uses both. Cheap, fast, reliable testnets. |
| Hosting | Re-use the live box `116.202.214.38` (Docker) OR a dedicated demo droplet | Run gateway, bridge, proofs, orchestrator + Postgres on one compose network. See `project_live_deployment_topology`. |
| Cockpit | Vite dev build on a laptop, OR Firebase Hosting | For a controlled room, run locally for lowest latency. |
| Money labels | testnet tokens displayed with `$` labels and big numbers ($10M, $5M, $25M, $250M) | State openly: "testnet, value-equivalent." Credibility comes from the *real proof + real chain tx*, not the dollar figure. |
| Identities/actors | Pre-provisioned ADIs with key pages + per-role signer keys held by the orchestrator (provider mode) and/or key-vault-signer for human clicks | Seeded by a setup script (see §7). |

---

## 5. Assumptions (master list)

These are the things that must be true for us to pull this off. Each is achievable with the
current stack.

1. **Real engine, scripted choreography.** We are allowed to pre‑provision identities, policies,
   accounts, and approver keys ahead of time. The *authorization decision* is live and real; the
   *setup* is canned.
2. **Testnet is acceptable.** Demos run on Kermit + Base/Arbitrum Sepolia. Dollar amounts are
   display labels. (If a prospect demands mainnet, that's a separate hardening pass — out of scope.)
3. **The Policy Engine (artifact C) is greenlit as a real gateway feature.** Demos 2 & 3 require
   conditional policy that today's flat key-page threshold model can't express alone.
4. **One demo operator drives the cockpit.** Approvals are triggered by buttons in the cockpit
   (each wired to a real signer key) and/or by the key-vault-signer extension for "human" clicks.
   Multiple physical approvers are *not* required in the room.
5. **Network access from the demo machine** to Kermit, Base/Arbitrum Sepolia RPCs, the proofs
   service, and (Demo 2) the Claude API.
6. **A canned fallback exists.** Every demo has a recorded "golden path" video + a deterministic
   replay mode in the orchestrator (`DEMO_MODE=replay`) so a flaky network never produces a dead
   screen in front of a prospect. Live is default; replay is the safety net.
7. **Pre‑flight passes within 15 min of show time** (see §8 runbook): identities active, credits
   funded, contracts deployed, RPCs reachable, proofs service healthy.
8. **Claude API key available** for the Demo 2 agent (model `claude-opus-4-8`).

---

## 6. What must be built before any single demo works (shared work)

Build these once; all three demos depend on them. Per‑demo specifics are in each demo doc.

- [ ] **Policy Engine** (`api-gateway/src/policy/`): declarative rule schema (`when {actionType, amount, principal}` → `require {approvers[], threshold}`), evaluator, and a `policy_decision` object returned on `POST /v1/transaction|/v1/governance` and surfaced in `GET /v1/pending`. Render a human-readable policy string.
- [ ] **Demo Orchestrator service**: scenario registry, actor keystore (provider-mode signers per role), SSE/websocket event feed, `POST /demo/{scenario}/start`, `POST /demo/{scenario}/approve/{role}`, `POST /demo/{scenario}/reset`, and `DEMO_MODE=live|replay`.
- [ ] **Demo Cockpit** (`certen-web-app` route `/cockpit`): the 5-rail layout, SSE subscription, the `BLOCKED → APPROVED` stamp animation, proof-card reveal, execution-rail state flip. Reuse theme + approval components.
- [ ] **Seed/setup script** (`certen/demos/scripts/seed.ts`): provisions the ADIs, key books/pages with the right thresholds, per-role keys, chain accounts, funded credits, and deploys the demo contracts. Idempotent; prints a scenario manifest.
- [ ] **Pre-flight check script** (`certen/demos/scripts/preflight.ts`): asserts every dependency green; exits non-zero with a readable report otherwise.
- [ ] **Golden-path recordings**: one screen capture per demo as the fallback.

---

## 7. Setup runbook (one-time, before the event)

```bash
# 1. Bring up the stack (gateway, bridge, proofs, orchestrator, postgres)
cd certen/demos && docker compose up -d --build

# 2. Bootstrap an org + admin key in the gateway
cd ../api-gateway && npm run bootstrap "Certen Demo Org" --pretty

# 3. Deploy demo target contracts to Base/Arbitrum Sepolia
cd ../certen-contracts/evm && forge script script/DeployDemo.s.sol --broadcast --rpc-url base_sepolia

# 4. Seed identities, policies, approver keys, chain accounts (idempotent)
cd ../../demos && npx tsx scripts/seed.ts   # writes scenario-manifest.json

# 5. Verify everything is green
npx tsx scripts/preflight.ts                # must exit 0
```

The seed script produces a `scenario-manifest.json` consumed by both the orchestrator and the
cockpit, so all three components agree on URLs, key pages, thresholds, and contract addresses.

---

## 8. Day-of runbook & live-demo safety

**T‑15 min:** run `preflight.ts`; confirm all green. Pre‑warm the cockpit, log in, load each
scenario once with `reset`. Open the golden‑path videos in a background tab.

**Per demo:** keep the cockpit full‑screen. Drive only with the on‑screen buttons. Each demo is
**under 3 minutes**. If any live call exceeds its timeout, the orchestrator auto‑degrades that step
to `replay` and the cockpit shows the same result — the audience never sees a spinner of death.

**Hard rules:**
- Never type during a demo. Everything is a button.
- Never show a terminal. The cockpit is the only surface.
- If the room is skeptical about "is this real?", click the proof card → it expands into the
  proofs_service Proof Explorer showing the real Merkle path + validator attestations + the live
  block explorer link to the execution tx. That single move converts skeptics.

---

## 9. Demos at a glance

| | Demo 1 | Demo 2 | Demo 3 |
|---|--------|--------|--------|
| **Hook** | Stop a $10M upgrade mistake | Put a seatbelt on autonomous AI | A stolen key can't drain the treasury |
| **Action** | `UpgradeContract` v6.0→v6.1 | `TransferFunds $5M` then `DeleteDatabase` | `BridgeTransfer $25M` Eth→other chain |
| **Policy** | 3-of-3 (CTO, Security, Foundation) | amount>$1M → human; deleteDB → CTO+Security | 3-of-3 (Treasurer, Foundation, Security Council) |
| **Twist** | press button → instant APPROVED + execute | second action stays BLOCKED forever | compromised treasurer key alone → BLOCKED |
| **Proves** | change control / governance | AI safety / agentic future | crypto / cross-chain / theft resistance |
| **Net-new build** | DemoUpgradeable contract | AI agent harness + Policy Engine (amount/type rules) | cross-chain bridge wiring + compromised-key path |

---

## 10. Build phases & rough effort

| Phase | Scope | Output |
|-------|-------|--------|
| **P0 — Foundations** | Policy Engine, Orchestrator skeleton, seed + preflight scripts, Cockpit shell | The engine is demoable with a stub action |
| **P1 — Demo 1** | DemoUpgradeable contract, 3-of-3 governance scenario, execution rail flips on-chain version | Demo 1 end-to-end live |
| **P2 — Demo 3** | Cross-chain scenario, bridge execution Base↔Arbitrum, compromised-key blocked path | Demo 3 end-to-end live |
| **P3 — Demo 2** | AI agent harness (Claude tool-use), amount + action-type policy rules, two-action narrative | Demo 2 end-to-end live |
| **P4 — Polish & safety** | Stamp animations, proof reveal, golden-path recordings, replay mode, dry runs | Show-ready |

Recommended order is **1 → 3 → 2** for build (1 and 3 reuse the most existing machinery; 2 adds
the AI harness last), but **present 1 → 2 → 3** (governance → AI → crypto) for the strongest arc.

---

## 11. Success criteria

A demo succeeds when a non‑technical observer, with **no** explanation, can:
1. State what action was attempted.
2. State why it was blocked.
3. Watch it get approved and *understand that a rule, not a person, let it through*.
4. Believe the result is real (proof + on‑chain tx).

If we have to explain more than one sentence per rail, the demo isn't done yet.
