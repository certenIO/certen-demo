# Demo 3 — "Cross-Chain Treasury Protection"

> **The crypto-native demo.** Everyone in this audience has watched a bridge get drained or a
> treasury get rugged by one compromised key. You don't have to explain the pain — it already
> lives in them. This demo shows Certen making that specific catastrophe impossible.
>
> Part of the [master plan](./demo_plan_overview.md). Uses the shared Certen Authorization Cockpit.

---

## 1. The one sentence that must land

**"Moving treasury funds across chains takes a quorum — and a single stolen key is worthless."**

What screams off the screen: a legitimate $25M cross-chain transfer sailing through once the quorum
signs — and then an attacker with a *real, valid, compromised key* trying the same transfer and
getting **BLOCKED**, because one key is not a quorum.

---

## 2. Scenario (three acts)

### Act 1 — The legitimate transfer
- **Treasury:** a DAO treasury of **$250M**.
- **Action:** Move **$25M** from **Base** to **Arbitrum** (a couple of EVM testnets; in live mode
  these are real Base/Arbitrum Sepolia transactions).
- **Policy:** requires **3 of 3** — **Treasurer**, **Foundation**, **Security Council**.
- Start at **2 of 3 → BLOCKED**. Third approval arrives → **APPROVED** → Certen generates proof →
  **bridge transfer executes** (real withdraw on source + deposit on destination) and funds land.

### Act 2 — The attack that fails
- **Treasurer's key is compromised.** An attacker submits the same $25M transfer using that *valid*
  stolen key.
- Certen evaluates: Treasurer ✓ … but Foundation ✗, Security Council ✗ → **1 of 3 → BLOCKED.**
- **No money moves.** The attacker has a real key and it doesn't matter.

This is the emotional inversion of every bridge-hack headline: the thing that normally ends in
"$600M drained" instead ends in "nothing happened."

### Act 3 — The resolution: rotate the stolen key out (on-chain)
- Blocking the attack froze the treasury — but the compromised key is still in the set. Now the
  **two surviving authorities heal the breach.**
- **Policy:** emergency key rotation requires **2 of 3** — and deliberately a *lower* threshold than
  a fund move, so a compromised member **cannot block its own removal**. Foundation + Security
  Council suffice; the suspect key is excluded.
- They approve → **APPROVED** → Certen proof → a **single Accumulate key-page update**
  (`remove_key` the compromised entry + `add_key` a fresh one on `acc://dao-treasury.acme/book/1`).
  **Governance lives entirely on Accumulate** — this op never touches Base or Arbitrum.
- **The key insight:** that one Accumulate key-page change instantly re-secures **every external
  account the page controls, on every chain** — because any future action against those accounts
  must prove authority against the now-updated key book. No per-chain transaction, no fund
  migration, no redeploys.
- **Message:** Certen doesn't just *block* a stolen key — the survivors **neutralize** it with one
  governance transaction on a single control plane, and the whole multi-chain estate is healed at
  once. Block **and** heal.

---

## 3. On-screen script (target: 2.5 minutes)

### Act 1 — legitimate (75s)

| Beat | On screen | Presenter | Under the hood |
|------|-----------|-----------|----------------|
| 0 | Cockpit rail ① : "Bridge transfer **$25,000,000** · Base → Arbitrum · DAO Treasury ($250M)". Stamp **BLOCKED ⛔** | "The DAO wants to move twenty-five million across chains." | Orchestrator pre-created the transfer, 2 of 3 pre-signed. |
| 1 | Rail ② : "Cross-chain treasury move → **3 of 3**: Treasurer · Foundation · Security Council". | "Three independent authorities must agree." | Policy Engine. |
| 2 | Rail ③ : ✓ Treasurer, ✓ Foundation, ✗ Security Council (2 of 3). | "Two are in. The bridge is frozen until the third." | `GET /v1/pending`. |
| 3 | Click **Approve ▸ (Security Council)** → 3 of 3. Stamp → **APPROVED ✓**. | "Third sign-off…" | `POST /v1/sign`. |
| 4 | Rail ④ proof card appears (G1 authority, validator attestations, cross-chain anchor). | "Certen proves the quorum and binds it to the transfer." | proofs_service. |
| 5 | Rail ⑤ : "Bridge transfer executed ✓ — $25M on Base" + **two** explorer links (source + dest). A treasury bar shows $250M → $225M on source, +$25M on dest. | "Funds move — provably, across chains." | api-bridge multi-leg intent → `CertenAnchorV6_1` on both chains. |

### Act 2 — the attack (45s)

| Beat | On screen | Presenter | Under the hood |
|------|-----------|-----------|----------------|
| 6 | A red **"⚠ Compromised key detected"** banner. Rail ① : "Bridge transfer **$25,000,000** · initiated by: **Treasurer (key compromised)**". Stamp **BLOCKED ⛔** | "Now the treasurer's key is stolen. The attacker tries the exact same move." | Orchestrator submits transfer signed *only* by the treasurer key. |
| 7 | Rail ③ : ✓ Treasurer, ✗ Foundation, ✗ Security Council (**1 of 3**). | "One real, valid key. Still not enough." | threshold not met. |
| 8 | Stamp stays **BLOCKED ⛔**. Treasury bar **does not move.** | "No quorum, no transfer. The attack is dead on arrival." | no execution; funds untouched. |
| 9 | (skeptic-killer) Click the blocked action → shows the single valid Treasurer signature recorded *and rejected for insufficient quorum* — auditable. | "Even the attacker's action is logged and provable." | `/v1/pending` + audit log. |

**Reset:** restores treasury balances and resets to Act-1 2-of-3 state.

---

## 4. Certen components used

| Step | Component | Call |
|------|-----------|------|
| Propose cross-chain transfer | api-gateway | `POST /v1/transaction` (multi-leg intent: Base leg + Arbitrum leg) |
| Policy evaluation | Policy Engine (new) | `actionType=bridgeTransfer → require [Treasurer, Foundation, SecurityCouncil], threshold 3` |
| Approval state / cast | api-gateway | `GET /v1/pending`, `POST /v1/sign` |
| Proof (cross-chain) | proofs_service | multi-leg proof; `GET /v1/proof/tx/:txHash`, intent legs `/api/v1/intents/{id}/legs` |
| Execution | api-bridge → certen-contracts | `POST /api/v2/intents` multi-leg → `CertenAnchorV6_1.createAnchorWithLegs` on source + dest chains |

The cross-chain machinery (multi-leg intents, `CertenAnchorV6_1`, anchors per chain) **already
exists** in api-bridge + certen-contracts — this demo mostly *wires and stages* it rather than
building new execution.

---

## 5. Scenario data (seeded)

- **Treasury ADI:** `acc://dao-treasury.acme`, key page threshold **3**, three role keys
  (Treasurer, Foundation, Security Council).
- **Chain accounts:** source `DemoTreasury` on **Base Sepolia**, destination `DemoTreasury` on
  **Arbitrum Sepolia** (the canonical chain story; both deployed — see `contracts/deployments.json`).
  Source funded to represent $250M (display label).
- **Balances:** displayed treasury bar driven by real on-chain balances of the demo accounts;
  $250M/$25M are labels scaling the testnet amounts.
- **Compromised-key path:** the orchestrator can submit the same transfer signed by *only* the
  Treasurer key, simulating a stolen single key. No second/third key is applied → stays at 1 of 3.
- **Pre-seed (Act 1):** transfer created, Treasurer + Foundation pre-signed, Security Council left.

---

## 6. What exists vs. what to build

| Need | Status | Work |
|------|--------|------|
| Multi-leg cross-chain intents + execution | ✅ exists | api-bridge `/api/v2/intents`, `CertenAnchorV6_1` |
| Cross-chain proof (legs, anchors) | ✅ exists | proofs_service intents/legs endpoints |
| M-of-N quorum enforcement | ✅ exists | key-page threshold |
| `bridgeTransfer` policy rule + role labels | 🔨 build | Policy Engine rule + Treasurer/Foundation/Council labels |
| Compromised-key submission path | 🔨 build | orchestrator action: submit transfer with only Treasurer key |
| Treasury balance bar + dual explorer links in cockpit | 🔨 build | cockpit extensions |
| Base→Arbitrum staging on testnets | ✅ done | source/dest `DemoTreasury` deployed + funded (deployments.json) |

---

## 7. Implementation checklist

- [ ] Seed `dao-treasury` ADI: 3 role keys, threshold 3, source + dest chain accounts, funded.
- [ ] Policy Engine rule for `bridgeTransfer` → 3 named authorities.
- [ ] Orchestrator scenario `treasury-protection`: `start` (create + pre-sign Treasurer & Foundation),
      `approve/security-council`, `attack` (submit same transfer signed only by Treasurer), `reset`.
- [ ] Execution: multi-leg intent that debits source, credits dest via `CertenAnchorV6_1` on both chains.
- [ ] Cockpit: treasury balance bar (source/dest), dual explorer links, compromised-key banner.
- [ ] Skeptic-killer: blocked action shows the single recorded signature + audit entry.
- [ ] Golden-path recording (both acts) + replay mode.

---

## 8. Live-demo safety

- Cross-chain execution has the most moving parts. Mitigation: keep both legs on fast testnets
  (Base/Arbitrum Sepolia, sub-5s blocks). Rail ⑤ shows per-leg progress with a per-leg timeout; on
  timeout it degrades to `replay` with cached explorer links. Rails ①–④ (the authorization story)
  are the payload and complete with one `POST /v1/sign`.
- Act 2 (the attack) has **no execution leg at all** — it's pure authorization rejection, so it's
  the most robust beat. If anything is flaky live, lead harder on Act 2: it needs only `/v1/pending`.
- Pre-fund generously; a failed source-leg due to gas/credits is the most likely live failure.

---

## 9. Success criteria

A crypto-native viewer says, unprompted: *"So even with the treasurer's actual key, the attacker
gets nothing — it needs the whole quorum, and CERTEN proves the quorum."* When they connect it to a
hack they remember, the demo has landed.

---

## 10. Cockpit specifics (attack record, single control plane, modes)

- **Chain story is canonical Base → Arbitrum** across docs, cockpit, and execution (real testnet
  txs in live mode; value-equivalent `$` labels). The amount carries a `*` → tooltip discloses
  "testnet · value-equivalent."
- The attack (Act 2) headline is **"Valid signature recorded. Quorum failed. No bridge legs
  created,"** with a **Blocked Action Record**: valid treasurer signature recorded, quorum 1 of 3,
  balances unchanged. The stolen key becomes evidence, not a drain.
- Act 3 (advanced) is an **Accumulate key-page update** (governance lives on Accumulate, not the
  external chains). The execution rail makes the "single control plane" point: one key-page change
  re-secures Base and Arbitrum at once — no per-chain transaction.
- **Default sales flow:** Act 1 + Act 2 (≤2.5 min). Run Act 3 only for technical audiences.

---

## 11. Sales scripts

**30s (executive):** "A DAO moves $25M across chains. Three independent authorities must sign —
two have, so it's frozen. Third signs… proof generated, funds move on both chains. Now the
treasurer's key is stolen and the attacker tries the same move: one valid key, still blocked, no
money moves. A stolen key is evidence, not a drain."

**90s (standard):** Add the coordination rail (who signed / who's notified, pending hash); the
treasury bar moving Base −$25M / Arbitrum +$25M; on the attack, the Blocked Action Record. Disclose
testnet/value-equivalent.

**3-min (technical):** Run Act 3 — the surviving two authorities rotate the stolen key out with one
Accumulate key-page update (2-of-3 recovery threshold so the suspect can't block its own removal);
emphasize Base + Arbitrum inherit the new authority with no per-chain transaction. **Builder** mode
shows the `POST /v1/transaction` → pending → `POST /v1/sign` quorum → multi-leg execute + proof
trace.

**If asked:**
- *"Why did the attacker fail?"* → One valid key is not quorum; CERTEN records it and refuses.
- *"Did funds move during the attack?"* → No.
- *"Don't you fix every chain on rotation?"* → No — authority lives on Accumulate; one key-page
  update re-secures every chain it controls.
