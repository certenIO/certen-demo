# Demo 1 — "Stop the $10 Million Mistake"

> **The lead demo.** Everyone in the room — engineer, banker, general, founder — already knows the
> nightmare: *the wrong person pushed a change to production.* This demo makes that nightmare
> impossible, on screen, in 90 seconds, with no jargon.
>
> Part of the [master plan](./demo_plan_overview.md). Uses the shared Certen Authorization Cockpit.

---

## 1. The one sentence that must land

**"A production upgrade cannot execute until every required approver has signed — and Certen proves it."**

What screams off the screen: a dangerous action sitting at `BLOCKED ⛔`, then one approval flips it
to `APPROVED ✓`, a cryptographic proof appears, and the contract version visibly changes on-chain.

---

## 2. Scenario

A protocol upgrade is proposed by the CI/CD pipeline:

- **Action:** Upgrade contract `acc://acme.acme/protocol` from **v6.0 → v6.1**
- **Policy:** Production upgrade requires **3 of 3** approvals — **CTO**, **Security Lead**, **Foundation**
- **Starting state:** CTO ✓, Security Lead ✓, Foundation ✗ → **BLOCKED**
- **The beat:** Foundation approves → **APPROVED** → Governance Proof generated → upgrade executes →
  on-chain version flips to v6.1.

This is deliberately the simplest scenario (flat 3-of-3), so it teaches the audience the engine
before Demos 2 and 3 add conditional policy and cross-chain.

---

## 3. On-screen script (target: 90 seconds)

| Beat | On screen (Cockpit) | Presenter says (optional) | Under the hood |
|------|---------------------|---------------------------|----------------|
| 0 | Cockpit loaded, rail ① shows "Upgrade protocol v6.0 → v6.1, initiated by CI/CD". Global stamp: **BLOCKED ⛔** | "A pipeline just tried to upgrade production." | Orchestrator already created the governance action via gateway; 2 of 3 signatures pre-seeded. |
| 1 | Rail ② lights up: "Requires 3 of 3: CTO · Security Lead · Foundation". | "Certen's policy: three sign-offs. No exceptions." | Policy Engine returned the required-approver set. |
| 2 | Rail ③ shows tiles: ✓ CTO, ✓ Security Lead, ✗ Foundation (2 of 3). | "Two are in. Foundation hasn't signed. So…" | `GET /v1/pending` reflects 2 collected signatures vs threshold 3. |
| 3 | Camera/eyes on the red **BLOCKED** stamp. | "Nothing moves. The upgrade is frozen." | Accumulate tx is PENDING; threshold not met → cannot execute. |
| 4 | Presenter clicks **Approve ▸** on the Foundation tile. Tile flips ✓; counter → 3 of 3. | "Watch what happens when Foundation signs." | Cockpit → orchestrator → `POST /v1/sign` with Foundation's real key. |
| 5 | Stamp animates **BLOCKED ⛔ → APPROVED ✓** (green). | (silence — let it land) | Threshold reached; Accumulate executes the governance tx. |
| 6 | Rail ④ **Proof** card materializes: proof id, Merkle root, G1 authority level, validator attestations. | "Certen just minted cryptographic proof of *who* approved *what*." | proofs_service generates the proof; orchestrator emits `proof.ready`. |
| 7 | Rail ⑤ **Execution** flips: "protocol version: **6.1** ✓" with a block-explorer link. | "And only now does the upgrade actually run." | api-bridge → `CertenAnchorV6_1` calls `DemoUpgradeable.setVersion("6.1")` on Base Sepolia. |
| 8 | (Optional skeptic-killer) Click the Proof card → expands into proofs_service Proof Explorer with the live Merkle path + the on-chain tx. | "Real proof. Real chain. Verify it yourself." | Embeds `/api/v1/proofs/{id}` + explorer link. |

**Reset for next run:** presenter clicks "Reset Scenario" → orchestrator re-seeds to 2-of-3 BLOCKED.

---

## 4. Certen components used

| Step | Component | Call |
|------|-----------|------|
| Propose upgrade | api-gateway | `POST /v1/governance` (or `/v1/transaction` targeting the upgrade intent) |
| Policy evaluation | Policy Engine (new) | rule: `actionType=contractUpgrade && env=production → require [CTO, Security, Foundation], threshold 3` |
| Approval state | api-gateway | `GET /v1/pending` → `collected_signatures`, `authorities[]`, `approved_authorities` |
| Cast approval | api-gateway | `POST /v1/sign` `{type: "pending_tx", signer_url: <role key page>}` with the role's real key |
| Proof | proofs_service | proof auto-generated; `GET /v1/proof/tx/:txHash` then `/api/v1/proofs/{id}/bundle` |
| Execution | api-bridge → certen-contracts | intent → `CertenAnchorV6_1.createAnchorWithLegs` → `CertenAccountV4.execute` → `DemoUpgradeable.setVersion` |

---

## 5. Scenario data (seeded)

- **Identity:** `acc://acme.acme` with key book `acc://acme.acme/book`, key page `.../book/1`,
  **acceptThreshold = 3**, three keys registered (CTO, Security Lead, Foundation).
- **Roles → keys:** each role is a distinct Ed25519 key on the page. The orchestrator holds all
  three in provider mode (so a button can sign as any role). For maximum drama, optionally wire the
  **Foundation** approval to a physical key-vault-signer click.
- **Target contract:** `DemoUpgradeable` deployed on Base Sepolia, owner = the ACME `CertenAccountV4`,
  initial `version = "6.0"`, `setVersion()` callable **only** by the anchor/account (so it visibly
  cannot be upgraded except through Certen).
- **Pre-seed:** before show, orchestrator submits the upgrade governance action and casts the CTO +
  Security Lead signatures, leaving exactly Foundation outstanding.

---

## 6. What exists vs. what to build

| Need | Status | Work |
|------|--------|------|
| Propose governance action | ✅ exists | `POST /v1/governance`, pending poller, `/v1/sign` |
| M-of-N threshold enforcement | ✅ exists | Accumulate key-page `acceptThreshold` |
| Proof generation + explorer | ✅ exists | proofs_service + Proof Explorer UI |
| On-chain execution path | ✅ exists | api-bridge intents → CertenAnchorV6_1 → CertenAccountV4 |
| Human-readable policy string + named roles | 🔨 build | Policy Engine maps key-page keys → role labels (CTO/Security/Foundation) and renders the policy sentence |
| `DemoUpgradeable.sol` | 🔨 build | ~30-line contract: `string version`; `setVersion(string)` gated to anchor/account; `VersionChanged` event |
| Cockpit 5-rail screen + stamp animation | 🔨 build | shared artifact A |
| Orchestrator scenario `stop-the-mistake` | 🔨 build | start/approve/reset + SSE events |

---

## 7. Implementation checklist

- [ ] Write & deploy `DemoUpgradeable.sol` to Base Sepolia; set owner to ACME `CertenAccountV4`.
- [ ] Seed ACME identity: key page with 3 role keys, threshold 3, funded credits, Base Sepolia chain account.
- [ ] Policy Engine rule for `contractUpgrade` → 3 named approvers; role-label mapping for key pages.
- [ ] Orchestrator scenario `stop-the-mistake`: `start` (propose + pre-sign CTO & Security), `approve/foundation`, `reset`.
- [ ] Cockpit: bind rails to the scenario's SSE feed; wire the Foundation **Approve** button.
- [ ] Execution leg: on threshold-met, submit the upgrade intent so the anchor calls `setVersion("6.1")`.
- [ ] Skeptic-killer: proof card → Proof Explorer deep link + Base Sepolia explorer link.
- [ ] Record golden-path video; verify `replay` mode reproduces beats 0→8 with no network.

---

## 8. Live-demo safety

- Pre-seed is done at `start`/`reset`, not live — so the only live calls during the demo are the
  one `POST /v1/sign` and the execution leg. Minimal surface to fail.
- If the on-chain execution leg is slow, rail ⑤ shows "executing…" with a 6s timeout, then falls
  back to `replay` showing the version flip + a cached explorer link. The authorization story
  (rails ①–④) is already complete and is the emotional payload.
- Keep `DemoUpgradeable` on a chain with sub-5s blocks (Base Sepolia) to make execution feel instant.

---

## 9. Success criteria

A viewer with zero context can say: *"It was blocked because one of three approvers was missing.
The moment they approved, it went through — and CERTEN proved it and ran the upgrade."* If they say
that unprompted, Demo 1 is done.

---

## 10. Pending coordination & evidence (what the cockpit shows)

- Rail ③ is **Approvals & Coordination**: it shows the live **pending transaction hash**, who has
  **Signed** vs been **Inbox notified**, and a summary ("Foundation is the only missing signature").
  This is the pain CERTEN removes — no chasing people in chat, no spreadsheet of who still owes a
  signature.
- Rail ④ before approval is a **Pending Authorization Record** (the action exists on-chain but
  cannot execute); after approval it becomes an **Execution Proof** (G2) with a plain-English
  translation: *"the right authorities signed AND the version set on-chain matches what was approved."*

---

## 11. Sales scripts

**30s (executive):** "A release pipeline tried to change a production contract. CERTEN turned it
into a pending authorization that physically can't run until all three owners — technical, risk,
governance — sign. Two signed; it's frozen. Foundation signs… approved, proof generated, upgrade
executed. A missing approval is now a hard stop, not a Slack reminder."

**90s (standard):** Add: the policy is auto-evaluated (rail ②); show the coordination rail (who's
notified, who's signed); land the proof translation (G2 = approved payload matches executed
outcome); click **Verify** to show it's real, not a label. Mention it starts from CI/CD via one API.

**3-min (technical):** Switch to **Technical** mode (expands proof id / tx / Merkle), then
**Builder** mode to walk the 4-call integration trace (`POST /v1/transaction` → pending/webhook →
`POST /v1/sign` from the Foundation KMS → `transaction.executed` + proof bundle). Note keys never
leave the customer.

**If asked:**
- *"Is this just multisig?"* → Multisig is one primitive. CERTEN adds pending discovery,
  coordination, proof generation, the execution gate, and one API to adopt it.
- *"Where does it plug in?"* → Your CI/CD or release-manager calls one endpoint; the proof bundle
  attaches to the release record.
