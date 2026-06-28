# Demo 2 — "AI Agent Guardrails"

> **The highest-upside demo.** Everyone is worried about AI doing something stupid with real
> power. Nobody has an answer. Certen is the answer: **the safety layer between AI intent and
> execution.** This demo makes that visceral.
>
> Part of the [master plan](./demo_plan_overview.md). Uses the shared Certen Authorization Cockpit.

---

## 1. The one sentence that must land

**"The AI can decide anything it wants — but it cannot *execute* anything that breaks policy.
Certen sits between intent and action."**

What screams off the screen: a real AI agent autonomously *deciding* to move $5M and to delete the
customer database — and Certen catching both before a single dollar moves or a single row drops.

---

## 2. Why this demo is the strongest

The market fear is **AI autonomy**, not "decentralized authorization." Nobody wakes up wanting
governance. Everybody wakes up afraid of *"what happens when the agent does something catastrophic?"*
Certen reframes itself from a niche governance tool into **AI execution safety** — the most fundable
story on the table right now. This demo is the one that makes investors lean forward.

---

## 3. Scenario (two acts)

### Act 1 — The agent moves money
- An autonomous **AI treasury agent** (real LLM, model `claude-opus-4-8`) is given a goal and tools.
- It decides: **"Move $5M from Treasury A to Treasury B."**
- **Without Certen:** the agent would just execute. (Show this first — see §4 "the contrast cold-open".)
- **With Certen:** the action is submitted to Certen. Policy: *amount > $1M → human approval required.*
- Result: **BLOCKED — human approval missing.**
- A human approves → Certen issues proof → the transfer executes.

### Act 2 — The agent tries something catastrophic
- The same agent decides: **"Delete the customer database"** (e.g., to "free up storage / reduce cost").
- Policy: *destructive data action → requires CTO + Security approval.*
- Result: **BLOCKED.** No approvers are present. **The database is never touched.**
- This is the mic-drop: an AI tried to delete 1.2M customer records and *physically could not.*

---

## 4. On-screen script (target: 2.5 minutes)

### Cold open — the contrast (15s)
Split screen for one moment: **left = "Agent (no Certen)"**, **right = "Agent (with Certen)"**.
Same prompt to both. Left immediately shows "✅ executed — $5M moved." Right shows the action
arriving at Certen. Presenter: *"Same AI. Same decision. One has a seatbelt."* Then go full-screen
on the Certen cockpit.

### Act 1 (60s)

| Beat | On screen | Presenter | Under the hood |
|------|-----------|-----------|----------------|
| 1 | An **Agent Console** panel streams the LLM's reasoning: *"Treasury B is low; I'll move $5M from A."* Then: *"Submitting transfer to Certen."* | "Our AI agent just decided to move five million dollars." | Claude agent (tool-use) calls its only execution tool → Certen `POST /v1/transaction`. |
| 2 | Cockpit rail ① fills: "Transfer **$5,000,000** Treasury A → Treasury B · initiated by: AI Agent". Stamp: **BLOCKED ⛔** | "It can't just do it." | Policy Engine evaluates amount. |
| 3 | Rail ② : "Amount > $1,000,000 → **Human approval required**". Rail ③: ✗ Human (0 of 1). | "Certen's rule: anything over a million needs a human." | conditional policy rule fires. |
| 4 | Presenter clicks **Approve ▸ (Human)**. Stamp flips **APPROVED ✓**. | "A human signs off…" | `POST /v1/sign` with the human approver key. |
| 5 | Rail ④ proof appears; rail ⑤ shows "Transfer executed ✓" + explorer link. | "…and now, and only now, the money moves — with proof of who authorized it." | proofs_service + api-bridge execution. |

### Act 2 (45s)

| Beat | On screen | Presenter | Under the hood |
|------|-----------|-----------|----------------|
| 6 | Agent Console streams: *"To cut storage costs I'll delete the customer database."* A **Data Panel** shows "Customer Records: **1,284,902 rows**". | "Now watch it try something catastrophic." | Agent calls execution tool → Certen with `action=deleteDatabase`. |
| 7 | Cockpit rail ① : "**DELETE customer database** · initiated by: AI Agent". Stamp: **BLOCKED ⛔** (red, emphatic). | "It wants to delete 1.2 million customer records." | Policy Engine: destructive action rule. |
| 8 | Rail ② : "Destructive data action → requires **CTO + Security** approval". Rail ③: ✗ CTO, ✗ Security (0 of 2). | "Two senior approvals required. Neither is here." | required-approver set. |
| 9 | Data Panel stays **1,284,902 rows — untouched.** Stamp stays **BLOCKED.** Presenter does *not* approve. | "The AI is stopped. The data is safe. The seatbelt held." | no signatures → action can never execute. |

**Reset:** "Reset Scenario" returns row count and clears both actions.

---

## 5. The AI agent harness (new build artifact D)

This is what makes the demo credible — it must be a **real** agent, not a scripted string.

- **Model:** `claude-opus-4-8` (latest Claude Opus; tool-use / function calling).
- **Pattern — the whole point:** the agent is given goals and a small toolset, but its **only**
  action-taking tool is `certen_execute(action, params)`. There is *no* direct "transfer money" or
  "delete database" tool. Every action the agent wants to take is routed through Certen. The agent
  literally cannot act except through the authorization layer. This is the architectural punchline:
  *Certen is the agent's hands, and the hands have a governor.*
- **Flow:** agent reasons → calls `certen_execute` → harness translates to `POST /v1/transaction`
  with the action type + amount → Certen returns the policy decision (BLOCKED + required approvals)
  → harness feeds that result back to the agent → the agent *narrates* that it's blocked. This makes
  the agent's own transcript show it being governed, which is far more compelling than a UI label.
- **Location:** `certen/demos/agent/` (Node + Anthropic SDK). Streams reasoning tokens to the
  cockpit's Agent Console via the orchestrator SSE feed.
- **Two goals seeded:** a treasury-rebalance goal (triggers the $5M move) and a cost-cutting goal
  (triggers the delete attempt). The operator picks which goal to run.

> Note: when building this, follow the `claude-api` skill for current model IDs, tool-use schema,
> and streaming. Use the latest Claude Opus model; do not hardcode an older snapshot.

---

## 6. The Policy Engine rules this demo needs (new build artifact C)

Demo 2 is the reason the Policy Engine exists — flat key-page thresholds cannot express these:

```yaml
rules:
  - name: large-transfer
    when:   { actionType: transfer, amountUsd: { gt: 1000000 } }
    require: { approvers: [Human], threshold: 1 }

  - name: destructive-data
    when:   { actionType: deleteDatabase }      # any destructive data op
    require: { approvers: [CTO, Security], threshold: 2 }

  - name: default-allow-small
    when:   { actionType: transfer, amountUsd: { lte: 1000000 } }
    require: { approvers: [], threshold: 0 }     # auto-executes (shows Certen isn't a blanket blocker)
```

The engine returns a `policy_decision { verdict: blocked|allowed, required:[...], collected:[...],
humanReadable: "Amount > $1M → human approval required" }`. The cockpit renders `humanReadable`
verbatim in rail ②.

> **Nice optional beat:** before Act 1, have the agent move a *small* amount ($250k) that
> auto-approves and executes instantly. This proves Certen isn't a dumb "block everything" wall — it
> applies *policy*. Then the $5M hits the wall. The contrast sells the intelligence of the layer.

---

## 7. Certen components used

| Step | Component | Call |
|------|-----------|------|
| Agent decides + acts | AI harness (new) | Claude tool-use → `certen_execute` |
| Submit action | api-gateway | `POST /v1/transaction` (carries actionType + amountUsd metadata) |
| Policy evaluation | Policy Engine (new) | rules in §6 |
| Approval state / cast | api-gateway | `GET /v1/pending`, `POST /v1/sign` |
| Proof | proofs_service | proof on execution |
| Execution (Act 1 transfer) | api-bridge → contracts | intent → CertenAnchorV6_1 → transfer on Base Sepolia |
| Execution (Act 2 delete) | n/a | never executes — that's the point. The "database" is a demo Data Panel whose row count only changes if an approved delete action reaches execution (it never does). |

---

## 8. Scenario data (seeded)

- **Treasury A / Treasury B:** two chain accounts under a demo ADI on Base Sepolia, A funded.
- **Approvers:** `Human` (single approver key), `CTO`, `Security` (two keys). Held by orchestrator
  (provider mode) so the cockpit buttons can sign.
- **Data Panel state:** a counter (`customer_records = 1284902`) owned by the orchestrator;
  decrements only if a delete action ever reaches the execution rail (designed to never happen).
- **Agent goals:** `rebalance-treasury` (→ $5M move; optionally a $250k pre-move) and `cut-costs`
  (→ delete DB).

---

## 9. What exists vs. what to build

| Need | Status | Work |
|------|--------|------|
| Submit action, multi-sig, proof, execution | ✅ exists | gateway + proofs + bridge |
| Conditional policy (amount, action-type → approver set) | 🔨 build | Policy Engine (artifact C) — **critical path** |
| Real AI agent that acts only through Certen | 🔨 build | AI harness (artifact D) |
| Agent Console + Data Panel in cockpit | 🔨 build | cockpit extensions |
| `transfer` + `deleteDatabase` action types in gateway intent schema | 🔨 build | add actionType/amount metadata pass-through to Policy Engine |

---

## 10. Implementation checklist

- [ ] Policy Engine rules from §6; pass-through of `actionType`/`amountUsd` from `/v1/transaction`.
- [ ] AI harness: Claude `claude-opus-4-8` tool-use, single `certen_execute` tool, streaming to SSE.
- [ ] Two seeded goals; small-amount auto-approve beat.
- [ ] Cockpit: Agent Console (streaming reasoning) + Data Panel (row counter) + the 5 rails.
- [ ] Orchestrator scenario `ai-guardrails`: `start(goal)`, `approve/human`, `reset`.
- [ ] Act 1 execution leg (real transfer Base Sepolia); Act 2 wired so delete *cannot* execute.
- [ ] Cold-open contrast view ("agent without Certen" vs "with Certen").
- [ ] Golden-path recording + replay mode.

---

## 11. Live-demo safety

- The agent's LLM call is the one nondeterministic element. Mitigation: run the agent **before** the
  audience sees the screen during `start`, cache its decision + reasoning transcript, and stream the
  cached transcript during the demo so timing is perfect. (It's still a *real* agent decision, just
  pre-rolled — same as Demo 1's pre-seeded signatures.) `replay` mode uses the cached transcript.
- Act 2 must *never* execute the delete even if mis-clicked — there are simply no approver keys for
  it in the room, and the orchestrator refuses to expose an `approve` button for the destructive
  scenario. Belt and suspenders.

---

## 12. Success criteria

A viewer says, unprompted: *"The AI literally couldn't do the dangerous thing without a human —
and even then, only with proof."* If an investor immediately asks "can this wrap **our** agents?",
the demo has done its job.

---

## 13. Cockpit specifics (tool boundary, evidence, modes)

- An **Agent Tool Boundary** panel sits above the agent console: ✓ `certen_execute()` vs ✗ direct
  wallet / database / RPC. This makes the architectural constraint unmissable — the model has no
  other way to act.
- Act 2 ($5M) shows a **Pending Authorization Record** (blocked, human notified via webhook). Act 3
  (delete) shows a **Blocked Action Record**: *"request recorded, policy evaluated, 0 of 2 senior
  approvals, no database call issued"* — refused actions are auditable, not invisible.
- Use **Exec** mode for a 20-second small-transfer beat; **Technical** mode to linger on policy.

---

## 14. Sales scripts

**30s (executive):** "An AI agent decides to move money. Its only tool routes through CERTEN. A
$250k transfer is within policy — it runs automatically. Then it wants $5 million — blocked until a
human signs. Then it tries to delete the customer database — refused before a single row is touched.
Autonomous intent is allowed; autonomous execution is governed."

**90s (standard):** Add the tool-boundary panel ("no direct wallet or database tool"); show the
auto-approve vs blocked contrast (CERTEN is policy, not a wall); on the delete, point at the Blocked
Action Record and the untouched 1,284,902 rows.

**3-min (technical):** **Builder** mode shows the trace: agent → `certen_execute` → `POST
/v1/transaction` (policy) → human `POST /v1/sign` → `transaction.executed`/refusal. Offer the live
`npm run agent` harness so a skeptic can watch a real `claude-opus-4-8` get blocked.

**If asked:**
- *"Could the AI bypass CERTEN?"* → No — its only execution tool is `certen_execute`; there's no
  direct transfer/delete tool.
- *"Does CERTEN block everything?"* → No — it auto-approved the $250k. Policy decides per action.
- *"Was the delete attempted on the DB?"* → No — refused upstream; recorded as evidence.
