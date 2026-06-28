# CERTEN Authorization Cockpit Audit and Implementation Runbooks

Date: 2026-06-28

Scope audited:
- `C:\Accumulate_Stuff\certen\demos`
- `C:\Accumulate_Stuff\certen\demos\docs\demo_overview_notes.md`
- `C:\Accumulate_Stuff\certen\independant_validator\docs\founders\README.md`
- Founder guide modules `01`, `03`, `04`, `05`, `07`, and `08`
- Rendered simulated cockpit at `http://localhost:3001`

Validation performed:
- Opened and stepped through all three cockpit demos in simulated mode.
- Captured the actual on-screen states at 1280x720.
- Ran `npm run build` in `C:\Accumulate_Stuff\certen\demos`.
- Ran `npm run preflight` in `C:\Accumulate_Stuff\certen\demos`.
- Both commands exited successfully.

## Executive Verdict

The demo platform is close, and the core idea is correct: one CERTEN engine, three business stories, only the action changes.

The brutal truth: the demos are still too optimized for people who already understand CERTEN. They show the engine, but they do not yet fully teach the ecosystem, the pain, the integration value, the trust model, or the reason CERTEN is more than multisig. A sharp founder or technical buyer will follow it. A sales-led partner meeting will leave too much unsaid.

The highest-value fixes are not a rewrite. They are:

1. Make the cockpit self-teaching.
2. Ensure all five rails fit in a no-scroll presentation viewport.
3. Make pending coordination and notification visible.
4. Explain proof levels and blocked-action audit records.
5. Add an integration-candidate lens: "this is how your backend, KMS, webhooks, and users plug in."
6. Tighten each demo around before/after pain, not just the successful flow.

The cockpit currently proves:

> Policy gates execution.

It needs to prove, intuitively:

> High-value intent becomes a pending on-chain authorization request; CERTEN coordinates the right approvers, records signatures, proves the decision, binds the proof to the exact outcome, executes only when allowed, and gives integrators one API surface to adopt the whole thing.

## What Is Already Strong

Keep these.

- The 5-rail model is right: Action, Policy, Approvals, Proof, Execution.
- The three chosen demo categories are right: production change control, AI agent guardrails, cross-chain treasury protection.
- Demo 2's small-transfer act is valuable because it shows CERTEN is policy, not a blanket wall.
- Demo 3's stolen-key attack is the strongest crypto-native moment.
- Demo 3's key-rotation recovery act is strategically excellent because it shows CERTEN can block and heal.
- The proof and explorer links create real credibility.
- The architecture in `demos` is well-separated: cockpit as pure `ScenarioState`, orchestrator owns choreography, policy rules are centralized.

## Critical Findings

### P0 - The payoff rails are often off-screen

At 1280x720, once a demo starts, rails 4 and 5 often fall below the visible viewport. This is fatal for a flagship demo because the proof and execution reveal are the emotional payoff.

Observed:
- Demo 1 blocked state shows action, policy, and approvals; proof/execution are below the fold.
- Demo 1 executed state still hides execution unless the page is scrolled.
- Demo 2 and Demo 3 have the same issue, especially with side panels.
- The sticky control deck can overlap proof/execution details.

Required fix:
- A sales demo viewport must show the complete engine state without manual scrolling.

### P0 - The demo explains what happened, but not enough why it matters

Current copy assumes the viewer knows why Accumulate, key pages, proofs, pending transactions, and validators matter.

Example:
- "Governance G2" is technically meaningful, but unexplained.
- "Proof of who approved what" is good but incomplete. The buyer also needs "and that the executed outcome matched the approved action."
- "Approvals 2 of 3" shows quorum math, but not CERTEN's coordination advantage.

Required fix:
- Add an on-screen explainer layer that answers:
  - What risk exists without CERTEN?
  - What did CERTEN create on-chain?
  - Who needs to sign?
  - Who has already signed?
  - Who was notified?
  - Why is execution still impossible?
  - What proof was generated?
  - What exactly was allowed or refused?

### P0 - Pending transaction service value is missing

Your instinct is correct. The current demos show multisig state, but they do not show the pain CERTEN removes:

- manual coordination
- "who still owes a signature?"
- stale chats and spreadsheets
- unclear authority paths
- lack of live inbox notifications
- no shared audit trail while waiting

Required fix:
- Upgrade "Approvals" to "Approvals & Coordination."
- Show pending transaction creation and notification events.
- Show the missing signer as a live inbox item, not just a red tile.

### P1 - Blocked actions need an audit artifact, not an empty proof rail

In refused cases, the proof rail says proof appears once policy is satisfied. That is true for execution proof, but confusing in attack demos.

For blocked/refused actions, CERTEN still has something valuable:
- the pending action hash
- the submitted signature(s)
- the authority policy
- the insufficient quorum reason
- the audit record that the action did not execute

Required fix:
- Split proof rail states:
  - `Execution Proof` for approved actions.
  - `Blocked Action Record` for refused actions.

### P1 - The integration candidate story is underdeveloped

Partners need to see how they adopt CERTEN:

- one API Gateway
- API key
- idempotency key
- KMS/HSM/callback/local signing provider
- webhooks
- proof bundle URL
- audit log
- no need to wire Accumulate, proofs, pending service, validators, and chain RPCs themselves

The current demo shows the engine, not the adoption path.

Required fix:
- Add a "Builder Lens" or "Integration View" per demo that maps the cockpit action to 3-5 API events.

### P1 - Copy is strong but not calibrated for cold audiences

Examples:
- "The execution authorization layer" is correct but abstract.
- "Nothing high-value executes until policy is satisfied and proven" is strong.
- "policy engine evaluates automatically" is too internal.
- "G0/G1/G2" needs inline translation.
- "Base Sepolia" and "$250M" need explicit simulated/testnet value-equivalent framing.

Required fix:
- Use pain-first headers and short proof translations.

## Demo-by-Demo Audit Matrix

### Demo 1 - Stop the Production Mistake

Keep:
- Simple universal story.
- Clear 3-of-3 approval state.
- Strong visual flip from blocked to approved.
- On-chain version change is a good concrete outcome.

Fix:
- The current state assumes the viewer already knows why a contract upgrade matters.
- The proof/execution payoff is below the fold at 1280x720.
- Missing pending-service narrative: Foundation is not just absent; Foundation has a pending approval to act on.
- "$10M production system" is useful but not grounded in consequence.
- "Governance G1" needs translation.

Recommended on-screen copy:
- Header hook: "A production change is proposed. It cannot run until every required authority signs."
- Pain: "Without CERTEN, missing approvals are process failures."
- CERTEN move: "CERTEN turns the release into a pending on-chain authorization request."
- Approval summary: "2 signed, 1 notified, 0 execution."
- Proof translation: "G1: the right authority set signed and met threshold."
- Execution detail: "Only after proof: version changed from 6.0 to 6.1."

Demo 1 acceptance test:
- Ask a non-technical viewer: "Why was it blocked?" Expected answer: "Foundation had not signed."
- Ask: "What changed after approval?" Expected answer: "The proof was generated and then the upgrade executed."
- Ask: "Where does this plug in?" Expected answer: "CI/CD or release process."

### Demo 2 - AI Agent Guardrails

Keep:
- Best market-facing story.
- Three-act sequence is strong.
- Small transfer proves CERTEN is not a blanket blocker.
- Delete database act is emotionally clear.

Fix:
- The tool boundary is too subtle. It must be obvious that the agent cannot call money/database tools directly.
- The model name is visible but not important enough to deserve the visual weight it receives.
- Refused delete action has no evidence artifact in the proof rail.
- The act sequence may be too long unless the operator can choose executive vs technical pacing.

Recommended on-screen copy:
- Header hook: "AI can propose actions. CERTEN decides what can execute."
- Tool boundary: "Only exposed tool: certen_execute(). No direct wallet or database access."
- Small transfer: "Routine action: policy allows it automatically."
- Large transfer: "High-value action: policy requires a human."
- Delete action: "Destructive action: senior approvals required; no approval path exposed in this meeting."
- Blocked evidence: "Request recorded, policy evaluated, no database call issued."

Demo 2 acceptance test:
- Ask: "Could the AI bypass CERTEN?" Expected answer: "No, its only execution tool routes through CERTEN."
- Ask: "Does CERTEN block everything?" Expected answer: "No, it allowed the small transfer."
- Ask: "Was the delete attempted against the database?" Expected answer: "No, CERTEN refused execution before any database call."

### Demo 3 - Cross-Chain Treasury Protection

Keep:
- Stolen-key attack is highly compelling.
- Treasury bar is intuitive.
- Key rotation recovery is a differentiator.
- Multi-leg execution fits CERTEN's cross-chain thesis.

Fix:
- Chain naming must be consistent across docs, cockpit, and talk track.
- Need explicit "testnet execution, value-equivalent labels" disclosure.
- Attack state should show "valid stolen signature recorded" as the headline.
- Key-rotation act should be optional advanced mode.
- Need more pending-service and audit-record detail.

Recommended on-screen copy:
- Header hook: "A stolen key is not enough to move treasury funds."
- Legit transfer: "3 independent authorities approve one cross-chain transfer."
- Attack: "Valid treasurer signature recorded. Quorum failed. No bridge legs created."
- Recovery: "One Accumulate key-page update removes the stolen key for every governed chain."
- Disclosure: "Executed on testnets; dollar values are value-equivalent demo labels."

Demo 3 acceptance test:
- Ask: "Why did the attacker fail?" Expected answer: "They had one valid key but not quorum."
- Ask: "Did funds move during the attack?" Expected answer: "No."
- Ask: "Why is key rotation powerful?" Expected answer: "One governance update re-secures every chain controlled by that key page."

## Cross-Cutting Product Recommendations

1. Add two modes:
   - `Executive`: shortest path, fewer proof fields, strongest business meaning.
   - `Technical`: deeper proof fields, API trace, trust model.

2. Add "pause points."
   - Each act should have one stable pause state where the presenter can stop talking and let the screen teach.
   - Pause points: blocked, approved/proof minted, refused, recovered.

3. Add a persistent "CERTEN did this" sentence.
   - Example: "CERTEN converted intent into a pending authorization request and blocked execution until policy was satisfied."

4. Add "not just multisig" evidence.
   - Pending coordination.
   - Proof generation.
   - Execution binding.
   - API Gateway integration.
   - Cross-chain authority propagation.

5. Add "what the partner implements" beside "what CERTEN handles."
   - Partner implements: submit action, hold keys/KMS, receive webhook, archive proof.
   - CERTEN handles: pending coordination, policy evaluation, proof generation, execution gate, audit trail.

6. Add recording-safe scripts.
   - No terminal.
   - No scroll.
   - No external dependency unless live mode intentionally selected.
   - Every click should be visible and meaningful.

## Runbook 1 - Make the Cockpit Presentation-Safe

Goal:
Ensure all five rails, the verdict, and the most relevant side panel are visible without manual scrolling at 1280x720 and 1440x900.

Files:
- `C:\Accumulate_Stuff\certen\demos\cockpit\src\components\CockpitView.tsx`
- `C:\Accumulate_Stuff\certen\demos\cockpit\src\components\Rail.tsx`
- `C:\Accumulate_Stuff\certen\demos\cockpit\src\components\ControlDeck.tsx`
- `C:\Accumulate_Stuff\certen\demos\cockpit\src\components\rails\*.tsx`

Steps:

1. Add a compact presentation layout.
   - Use `height: 100vh`.
   - Keep header to roughly 72px.
   - Keep control deck to roughly 72px and reserve layout space for it instead of overlaying content.
   - Make the rail stack fill the remaining height.

2. Convert rails to fixed-height compact cards in presentation mode.
   - Action rail: max 118px.
   - Policy rail: max 104px.
   - Approvals rail: max 150px.
   - Proof rail: max 150px.
   - Execution rail: max 130px.

3. Collapse detailed proof fields by default.
   - Always show: proof level, validator quorum, proof id short hash, "verify" button.
   - Hide Merkle root and transaction hash behind expand/click.

4. Move verbose side panels into a bounded right column.
   - Treasury panel and agent panel must not force rail stack scroll.
   - Data panel should stay visible for Demo 2 Act 3.

5. Replace sticky overlay controls with a reserved footer.
   - Footer buttons must never cover rail content.

6. Add a viewport QA script.
   - Use Playwright or browser tooling.
   - For each demo and act, assert rails 1-5 are visible.
   - Capture 1280x720 and 1440x900 screenshots.

Acceptance criteria:
- At 1280x720, all five rail labels are visible in each major state.
- The final proof/execution payoff is visible without scrolling.
- Control buttons do not cover proof buttons, tx links, execution legs, or data panels.
- Demo operator can run all demos without touching the scroll wheel.

## Runbook 2 - Add a Self-Teaching Explainer Layer

Goal:
Make every state answer "what is happening and why should I care?" without relying on presenter narration.

Files:
- `cockpit/src/types.ts`
- `orchestrator/src/types.ts`
- `cockpit/src/components/CockpitView.tsx`
- `orchestrator/src/scenarios/*.ts`

Add these fields to `ScenarioState`:

```ts
interface ScenarioExplainer {
  pain: string;              // The bad thing that would happen without CERTEN
  certenMove: string;        // What CERTEN just did
  buyerTakeaway: string;     // Why the viewer should care
  integrationHint?: string;  // How a partner would plug this in
}
```

Render as a compact "Why This Matters" strip under the header or above the rails.

Rules:
- One sentence per field.
- Plain language only.
- No unexplained jargon.
- Must change by act.

Example copy:

Demo 1 blocked:
- Pain: "A production pipeline is trying to change a critical contract."
- Certen move: "CERTEN records the request as a pending authorization and freezes execution until the Foundation signs."
- Buyer takeaway: "A missing approval becomes a hard technical stop, not a process reminder."
- Integration hint: "In production this starts from your CI/CD system or release manager API."

Demo 2 blocked:
- Pain: "The AI wants to move $5M."
- Certen move: "The agent's only action tool routes through CERTEN, so policy blocks execution before money moves."
- Buyer takeaway: "Autonomous intent is allowed; autonomous execution is governed."
- Integration hint: "Partners wrap agent tools with `certen_execute()` instead of exposing direct transfer/delete tools."

Demo 3 attack:
- Pain: "An attacker has a real treasurer key."
- Certen move: "CERTEN records the signature but refuses execution because one key is not quorum."
- Buyer takeaway: "A stolen key becomes evidence, not a drain."
- Integration hint: "Custodians, bridges, and DAO tools can submit the same protected transaction flow through the API Gateway."

Acceptance criteria:
- A first-time viewer can explain each act after reading only the cockpit.
- Sales can pause on any state and read a single strip to re-anchor the room.
- The strip never exceeds two lines at 1280x720.

## Runbook 3 - Make Pending Coordination Visible

Goal:
Show that CERTEN does not merely check quorum. It creates and coordinates the pending approval process.

Files:
- `cockpit/src/types.ts`
- `orchestrator/src/types.ts`
- `cockpit/src/components/rails/ApprovalsRail.tsx`
- `orchestrator/src/scenarios/*.ts`

Rename rail:
- From: `Approvals`
- To: `Approvals & Coordination`

Add state:

```ts
interface CoordinationInfo {
  pendingTxHash?: string;
  inboxItems: Array<{
    role: string;
    status: 'notified' | 'signed' | 'missing' | 'not-eligible';
    channel?: 'inbox' | 'webhook' | 'kms' | 'operator';
    timestampLabel?: string;
  }>;
  coordinationSummary: string;
}
```

Display:
- Pending tx short hash.
- "Notifications sent" count.
- Each approver tile shows `Signed`, `Inbox notified`, `Webhook sent`, or `Not signed`.

Demo-specific examples:

Demo 1:
- Pending tx: `acc://acme.acme/protocol`
- CTO: Signed
- Security Lead: Signed
- Foundation: Inbox notified
- Summary: "Pending transaction is live on Accumulate. Foundation is the only missing signature."

Demo 2 Act 2:
- Human Approver: Webhook/inbox notified
- Summary: "The AI cannot bypass the pending authorization queue."

Demo 3 attack:
- Treasurer: Signed with compromised key
- Foundation: Did not sign
- Security Council: Did not sign
- Summary: "CERTEN records the stolen signature but refuses to escalate it to execution."

Acceptance criteria:
- Viewer understands the pending service removes manual coordination.
- Viewer sees that signatures accumulate on-chain over time.
- Attack demos show the bad signature as recorded and rejected, not invisible.

## Runbook 4 - Explain Proof Levels and Blocked Records

Goal:
Turn proof jargon into credibility and make refused actions auditable.

Files:
- `cockpit/src/components/rails/ProofRail.tsx`
- `cockpit/src/types.ts`
- `orchestrator/src/scenarios/*.ts`
- `orchestrator/src/lib/util.ts`

Add:

```ts
type EvidenceKind = 'execution-proof' | 'blocked-action-record' | 'pending-record';

interface EvidenceInfo {
  kind: EvidenceKind;
  title: string;
  plainMeaning: string;
  proofLevel?: 'G0' | 'G1' | 'G2';
  proofLevelMeaning?: string;
  auditFacts: string[];
  explorerUrl?: string;
  bundleUrl?: string;
}
```

Map proof levels:
- G0: "This transaction was included and final on Accumulate."
- G1: "The right authority set signed and met threshold."
- G2: "The approved payload and executed outcome match."

Approved action examples:
- Demo 1: G1 or G2 depending actual proof support. If using "outcome bound" language, prefer G2 or explain exactly what is bound.
- Demo 2 small transfer: G0 is acceptable if low-value auto policy; explain "included and final."
- Demo 2 $5M: G1/G2 preferred.
- Demo 3 transfer: G2 required because value moved.
- Demo 3 key rotation: G1 acceptable if proving authority set update; G2 if proving exact key removed/added.

Blocked action examples:
- Demo 2 delete: "Blocked Action Record: action requested, policy evaluated, 0 of 2 approvals, execution refused."
- Demo 3 stolen key: "Blocked Action Record: valid treasurer signature recorded, quorum not met, no bridge intent executed."

Acceptance criteria:
- No refused action leaves the proof rail looking empty or irrelevant.
- G0/G1/G2 never appears without a plain-English translation.
- Technical buyers see enough proof substance to ask deeper questions instead of doubting the label.

## Runbook 5 - Add a Before/After Contrast Beat to Each Demo

Goal:
Make the pain visceral before showing the solution.

Files:
- `orchestrator/src/scenarios/*.ts`
- `cockpit/src/components/CockpitView.tsx`
- New optional component: `cockpit/src/components/ContrastStrip.tsx`

Add a compact contrast strip with two columns:
- Without CERTEN
- With CERTEN

Demo 1:
- Without: "Pipeline pushes upgrade; one missed approval can break production."
- With: "Pending authorization blocks execution until all required signers approve."

Demo 2:
- Without: "Agent tool directly moves funds or deletes data."
- With: "Agent can only call `certen_execute`; policy decides whether action can proceed."

Demo 3:
- Without: "One stolen key can trigger an irreversible bridge transfer."
- With: "The stolen key creates a recorded attempt, but no quorum means no execution."

Implementation:
- Show contrast strip before first action and keep a one-line collapsed version during the demo.
- Do not make it a marketing hero. Keep it operational and compact.

Acceptance criteria:
- The first 10 seconds of each demo establish the danger.
- Viewers understand what CERTEN prevented, not just what CERTEN executed.

## Runbook 6 - Demo 1 Improvements: Change Control for Buyers

Goal:
Make Demo 1 the easiest universal entry point.

Current strength:
- Simple and broad.
- No crypto knowledge required.

Current weakness:
- "Upgrade contract" may still feel crypto-specific.
- "$10M production system" is a label, not a visible consequence.

Implementation:

1. Rename headline in launcher:
   - Current: "Stop the $10M Mistake"
   - Recommended: "Stop the Production Mistake"
   - Badge remains: `Change Control`
   - Keep `$10M` in the action amount.

2. Add impacted systems panel:
   - Protocol contract
   - Customer-facing API
   - Treasury controls
   - Compliance audit trail

3. Add "wrong path" microcopy:
   - "Without CERTEN: a missing Foundation sign-off is a process failure."
   - "With CERTEN: a missing Foundation sign-off is an execution stop."

4. Clarify who signs:
   - CTO = technical owner
   - Security Lead = risk owner
   - Foundation = governance owner

5. Add integration path:
   - "Triggered by CI/CD via API Gateway"
   - "Approval requested via inbox/webhook"
   - "Proof bundle attached to release record"

Acceptance criteria:
- Non-crypto enterprise prospects understand this as release/change control.
- Demo can be completed in 90 seconds.
- Viewer can say: "CERTEN turns approvals into a hard execution gate."

## Runbook 7 - Demo 2 Improvements: AI Guardrails

Goal:
Make Demo 2 the flagship for autonomous systems.

Current strength:
- Strongest market relevance.
- Small transfer -> large transfer -> destructive action sequence is excellent.

Current weakness:
- The architectural constraint "the agent only has one action tool" is too buried in console text.
- Model name is visible but the tool boundary is not.

Implementation:

1. Add an "Agent Tool Boundary" panel above the agent console.
   - Text: "Allowed tool: certen_execute()"
   - Text: "No direct wallet, database, or admin tool exposed"

2. Add tool-call badges:
   - `intent: transfer`
   - `amount: $5,000,000`
   - `policy: human required`
   - `execution: blocked`

3. Make small-transfer act explicitly optional in sales mode.
   - Executive flow: show it in 20 seconds.
   - Technical flow: linger and explain policy not wall.

4. For delete action, add a blocked evidence record.
   - "Request recorded"
   - "Policy evaluated"
   - "0 of 2 senior approvals"
   - "No database call issued"

5. Replace "The AI can decide anything" with:
   - "AI can propose anything. CERTEN decides what can execute."

Acceptance criteria:
- Viewer understands CERTEN wraps agent tools.
- Viewer understands CERTEN allows safe autonomous actions and blocks unsafe ones.
- Viewer does not think CERTEN is an AI model, monitoring layer, or after-the-fact audit log.

## Runbook 8 - Demo 3 Improvements: Treasury, Attack, Recovery

Goal:
Make Demo 3 the crypto-native proof that CERTEN prevents theft and recovers control.

Current strength:
- Stolen-key attack is very strong.
- Key rotation is strategically differentiated.

Current weakness:
- Chain names are inconsistent between docs and implementation.
- Recovery act may be too much for a first meeting unless staged.
- Pending coordination is missing.

Implementation:

1. Pick one canonical chain story.
   - Recommended implementation-aligned copy: `Base -> Arbitrum`
   - Add disclosure: "testnet execution, value-equivalent labels."
   - Update docs that still say Ethereum -> Base or Ethereum -> other chain.

2. Split into default and advanced flow.
   - Default sales flow: Act 1 legitimate transfer + Act 2 stolen-key block.
   - Advanced technical flow: Act 3 key rotation recovery.

3. Add "valid signature, insufficient authority" badge in attack state.
   - This is the core insight.

4. Add "single control plane" panel in key rotation.
   - "Accumulate key page updated once."
   - "Base and Arbitrum accounts inherit new authority automatically."
   - "No fund migration. No redeploy. No per-chain emergency scramble."

5. Add blocked-action audit record.
   - Pending transfer hash.
   - Treasurer signature recorded.
   - Quorum failed.
   - Execution legs not created.

Acceptance criteria:
- Crypto prospects understand why one compromised key cannot drain treasury.
- Technical prospects understand recovery is one Accumulate governance update, not per-chain cleanup.
- The demo does not exceed 2.5 minutes in default mode.

## Runbook 9 - Add Builder / Integration Candidate Mode

Goal:
Make the same demo useful for integration candidates, not just end customers.

Files:
- `cockpit/src/types.ts`
- `cockpit/src/components/IntegrationPanel.tsx` (new)
- `orchestrator/src/scenarios/*.ts`

Add a mode toggle:
- `Story`
- `Builder`

Story mode:
- pain, policy, approval, proof, execution

Builder mode:
- API calls, webhook events, signing provider, proof bundle

For each scenario, show a 4-step integration trace:

Demo 1:
1. `POST /v1/transaction` from CI/CD release pipeline
2. `GET /v1/pending` or webhook: Foundation approval required
3. `POST /v1/sign` from Foundation KMS/KeyVault
4. Webhook: `transaction.executed` + proof bundle URL

Demo 2:
1. AI tool calls `certen_execute(action, params)`
2. Gateway evaluates policy
3. Human approval requested if needed
4. Execution/proof returned to agent harness

Demo 3:
1. Treasury system submits bridge transfer
2. Pending approvals discovered and notified
3. Quorum proof generated
4. Multi-leg execution + proof bundle + audit trail

Acceptance criteria:
- Integration candidate understands adoption path in under 60 seconds.
- Sales can switch from story to builder view without opening docs or terminals.
- Builder mode explains API Gateway as the "one front door."

## Runbook 10 - Add Sales Operator Mode

Goal:
Equip the sales team to run these demos consistently.

Files:
- `cockpit/src/components/PresenterCuePanel.tsx` (new)
- `cockpit/src/types.ts`
- `orchestrator/src/scenarios/*.ts`

Add optional presenter cues hidden by default:

```ts
interface PresenterCue {
  say: string;
  waitFor?: string;
  objection?: string;
  answer?: string;
}
```

Operator-only panel:
- Shows one sentence to say.
- Shows next click.
- Shows "if asked" objection response.

Example Demo 3 attack:
- Say: "The attacker has a real treasurer key. CERTEN accepts that fact, records the signature, and still refuses the transfer."
- Wait for: "1 of 3 visible."
- Objection: "Is this just multisig?"
- Answer: "The quorum lives on Accumulate, pending coordination is automated, and the resulting proof can authorize or refuse execution across external chains."

Acceptance criteria:
- A sales rep can run the demos after one dry run.
- The customer-facing screen stays clean.
- Presenter cues can be turned off for recording.

## Runbook 11 - Security and Objection Handling

Goal:
Pre-answer common concerns in the product surface.

Add a small "Trust Model" drawer or modal with these answers:

1. Is this just multisig?
   - No. Multisig is one authority primitive. CERTEN adds pending discovery, coordination, proof generation, cross-chain execution binding, validator attestation, and API integration.

2. Does CERTEN hold our keys?
   - It can be configured so keys stay in your KMS/HSM/callback signer. Provider mode is optional. Local provider is for dev/test or self-hosted scenarios.

3. What do we trust?
   - Accumulate consensus, target chain consensus, standard cryptography, and 2/3+ validator quorum. Not one UI, server, RPC node, or single validator.

4. Can a proof be replayed for a different action?
   - The execution commitment binds chain, target, value, and calldata. The proof cannot authorize a different payload.

5. What happens if the network is slow?
   - The cockpit may use replay for demo safety; production execution waits for the configured proof/finality requirements.

6. Are the dollars real?
   - Demo uses testnet transactions with value-equivalent labels. The control path, proof path, and execution shape are the point.

Acceptance criteria:
- Sales has crisp answers for the first security questions.
- Technical buyers can drill into proof levels without derailing the main demo.

## Runbook 12 - Live vs Simulated Credibility

Goal:
Avoid credibility loss when the cockpit says simulated.

Implementation:

1. Replace simple `SIMULATED` chip with:
   - `SIMULATED CHOREOGRAPHY`
   - Tooltip/click text: "Uses deterministic demo data; proof and explorer links mirror live shapes. Switch to live mode for real gateway/proof/EVM execution."

2. In live mode, show dependency health:
   - Gateway
   - Proofs service
   - Accumulate/Kermit
   - Base/Arbitrum RPC
   - Demo contracts

3. Add "Proof authenticity" details:
   - Simulated: "synthetic proof-shaped record"
   - Live: "gateway/proofs service returned proof"

4. In preflight output, create a cockpit-readable status endpoint.
   - `GET /api/demo-health`
   - Cockpit can show green/yellow/red.

Acceptance criteria:
- No one confuses simulated values with production dollars.
- No one thinks the live architecture is fake because the safe demo mode is simulated.
- Sales can state exactly what is live, simulated, and value-equivalent.

## Runbook 13 - Documentation Corrections

Goal:
Make docs match the implemented demos and the refined sales story.

Files:
- `demos\README.md`
- `demos\docs\demo_plan_overview.md`
- `demos\docs\demo_1_stop_the_10m_mistake.md`
- `demos\docs\demo_2_ai_agent_guardrails.md`
- `demos\docs\demo_3_cross_chain_treasury_protection.md`

Required corrections:

1. Normalize product name.
   - Use `CERTEN` consistently.
   - Avoid `CERTN` unless that is an intentional brand variant.

2. Normalize chain story.
   - If implementation stays Base -> Arbitrum, docs must say Base -> Arbitrum.

3. Add pending-service language.
   - Every multi-approval demo should mention pending transaction discovery and notification.

4. Add blocked-action evidence.
   - Docs should distinguish execution proof from refusal audit record.

5. Add sales scripts.
   - For each demo:
     - 30-second executive version
     - 90-second standard version
     - 3-minute technical version
     - "if asked" objection responses

Acceptance criteria:
- Sales docs and cockpit say the same thing.
- No demo operator has to reconcile conflicting chain names or proof claims live.

## Recommended Implementation Order

### Phase 1 - Must Fix Before Heavy Sales Use

1. Presentation-safe no-scroll cockpit layout.
2. Self-teaching explainer strip.
3. Pending coordination visible in approvals rail.
4. Proof level translations and blocked-action records.
5. Docs chain-name/copy corrections.

Expected effort: 2-4 focused engineering days.

### Phase 2 - Partner/Integration Readiness

1. Builder mode.
2. Integration trace panel.
3. Trust model drawer.
4. Sales operator cues.

Expected effort: 3-5 focused engineering days.

### Phase 3 - Live Demo Hardening

1. Cockpit-readable health endpoint.
2. Live/simulated detail chip.
3. Golden-path screenshot/video regeneration.
4. 1280x720, 1440x900, and projector dry-run QA.

Expected effort: 2-3 focused engineering days.

## Final Target Demo Arc

The three demos should leave the prospect with this exact mental model:

1. Someone or something proposes a high-value action.
2. CERTEN turns that intent into an on-chain authorization request.
3. Policy determines who must approve.
4. Pending coordination tells the right people/systems what they owe.
5. Signatures accumulate against the authority set.
6. If quorum fails, CERTEN records the attempt and refuses execution.
7. If quorum succeeds, CERTEN generates proof.
8. Execution happens only after proof.
9. The outcome is verifiable later by customers, auditors, counterparties, and integrators.

If a potential partner can say that back after seeing the demos, the cockpit is ready.
