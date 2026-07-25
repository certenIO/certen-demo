# Narrator script — YC video

Two columns throughout:

> **READ** — say this, close to verbatim.
>
> *UNDERSTAND* — background you need in your head so you can answer a question or improvise. **Do
> not say it on camera** unless someone asks. It is the difference between sounding like you built
> this and sounding like you memorised it.

**Setup before recording:** gear icon → pace **Cinematic**, certainty recap **off**, view **Diagram**.
Capture at 1600×900. Each demo opens on its brief card — start recording there, not mid-scenario.

---

## 0 · Cold open (launcher) — 15s

> **READ:** "Every system in this space records who approved something, and then trusts a key to
> execute it. We removed the key. Without a valid proof, the action isn't blocked — it's
> impossible."

> *UNDERSTAND:* The five words are **execution is conditional on proof**. The spine is
> **identity → policy → execution**, not identity → authorization → governance; governance is one
> application of the engine, not the product. The category is execution enforcement; the wedge is
> cryptographic change control, which maps to an existing budget line (ITGC, segregation of duties,
> SOC 2). If someone says "so it's multisig" — multisig is one key list inside one company. Keep
> moving; Demo 1 answers it visually in ten seconds.

---

## 1 · Regulated Asset Issuance — the flagship, ~70s

### Brief card (hold 5s)

> **READ:** "Tokenized gold. Three companies: one issues the token, one holds the metal, one keeps
> the register of who owns what."

> *UNDERSTAND:* This is the RWA thesis. Proof of reserves stops being a quarterly PDF and becomes a
> precondition of minting. The three-company split mirrors how regulated issuance actually works —
> issuer, custodian, transfer agent.

### Act 1 — a correct issuance

Click **Issue $50,000,000 of new tokens**.

> **READ:** "Look at the authority set. Three separate companies, each with its own identity and
> its own keys. Certen holds none of them."

> *UNDERSTAND:* The caption under REQUIRED AUTHORITY says this on screen, so you don't have to
> labour it. Each org is a distinct root identity with its own key book — no shared admin, no
> common root. The token contract has no owner.

Point at Helvetia's and Ledgerline's seats.

> **READ:** "Some of these signers are people. Some are the company's own policy engine — Helvetia's
> checks its vault records, Ledgerline's checks its holder registry. They run that software
> themselves and hold their own key."

> *UNDERSTAND:* This is the **headless off-chain policy-engine signer**. Certen ships it; the
> organisation runs it and holds the key — Certen is never a custodian. It discovers a pending
> Accumulate transaction that names the org's authority, asks that org's own policy engine to
> approve or deny, signs with the org's key, and submits the vote. The key can live in Vault and
> never leave it. This is *how off-chain reality gates an on-chain action* — bullion assays, KYC
> registries, biometric re-auth (Trust Stamp is policy engine #1). It is also the answer to "our
> compliance logic is proprietary": you don't hand it over, you plug it in.

Click **Authorize**, then **Evaluate**, then **Evaluate**. Let the proof journey run.

> **READ:** "Each company meets its own internal threshold. Only then is the intent actually
> recorded. Then it's proven against the ledger, authorised by seven independent validators, and
> bound to this exact action — that binding is what makes the thing that executes the same as the
> thing that was approved."

> *UNDERSTAND:* The journey compresses the real 9-phase V6.1 cycle. "Bound to the exact action" is
> the `executionCommitment`: `keccak256(chainId · target · value · calldata)`. Note the first step
> **spins while signatures are outstanding** — on Accumulate the transaction is pending until every
> key page meets its M-of-N. Do not say "approved" before that marker turns green; the screen is
> being careful and so should you.

> **READ:** "Three companies, one proof — and only now does supply change. Three hundred million
> outstanding, against three hundred and twelve million of attested gold."

---

### Act 2 — the keystroke *(the one to lead with if you only have time for one)*

Click **Now an operator makes a mistake** → **Operator keys in the mint**.

> **READ:** "A new delivery lands, the custodian re-attests, and the operator goes to mint three
> hundred million against it. They key three hundred *trillion*. Six extra zeros."

Watch the two green columns fill.

> **READ:** "Meridian's own officers approve it — it's their operator's number. Ledgerline approves
> it too; the destination is perfectly legitimate. Two of the three companies have signed off, and
> neither of them is looking at the vault."

Click **Evaluate** on Helvetia.

> **READ:** "The vault controller signs. And then the policy engine does the arithmetic — and
> refuses. Not because someone read the number carefully. Because the tokens would not have been
> backed by anything."

> *UNDERSTAND:* This is the PYUSD-class error — a hand-keyed figure every downstream system
> accepted. The refusal is a policy **constraint**, not a quorum shortfall: no number of signatures
> can satisfy it. That distinction is the reason this is not multisig.

**Land this line:** *"It didn't need a human to catch it. It was arithmetically impossible to prove."*

---

### Act 3 — total compromise

Click **Now the issuer is completely compromised** → **Attacker mints $2,000,000,000…**. Then talk
over the animation; there is nothing more to click.

> **READ:** "Now assume the worst. Not a phish — a total compromise. The attacker holds every one of
> Meridian's officer keys and is signing perfectly valid, correctly formed requests."

As the issuer column fills amber:

> **READ:** "Watch the issuer column. Every key signs. That seat is legitimately satisfied — the
> attacker really does control that company. And it buys them one seat of three."

> **READ:** "Helvetia refuses: two point three billion against six hundred and twelve million of
> gold. Ledgerline refuses: the destination isn't a holder of record. One of three. No proof. No
> tokens — and the refusal was just broadcast to both other companies and Meridian's own security
> team. **The attacker's first attempt is the alert.**"

> *UNDERSTAND:* If asked "what if they compromise the custodian too?" — they still need the transfer
> agent, and they still need the gold to exist. The reserve constraint is not a signature; no amount
> of key theft satisfies it. **The close:** every infinite-mint exploit in this market began with an
> attacker holding valid issuer credentials.

---

## 2 · AI Agent Guardrails — ~60s

### Brief card

> **READ:** "An AI agent with its own key and real spending authority over the treasury."

> *UNDERSTAND:* Same engine, different actor — that's the point of showing it second. The agent
> holds its own ed25519 key and its own on-chain account and signs intents locally; the gateway
> never sees the key.

### Act 1 — routine

> **READ:** "It rebalances into the same tokenized gold from the last demo. Within policy, so it
> proves and executes on its own key. No human. Certen is policy, not a wall."

### Act 2 — it tries to route around its own limit *(the best beat in this demo)*

Click **Now the agent subscribes for $5,000,000**, then **The agent tries to route around the limit**.

> **READ:** "Five million needs a person. So watch what it does: it splits the payment into six of
> nine hundred thousand. Each one individually under the limit."

> **READ:** "Refused — because the limit isn't per transaction. It's what this agent has moved in
> the last hour. It fails on the first payment."

> *UNDERSTAND:* This is the failure mode prompts cannot fix: the agent isn't malicious, it's
> *optimising*. The limit is a policy constraint over a rolling window across all of the actor's
> activity. Then the human co-signs the original $5M and it executes — showing the seatbelt works,
> not just the blocker.

### Act 3 — prompt injection

> **READ:** "Now it's manipulated into replacing the token's code with an attacker's contract — one
> that can mint freely. That needs the CTO and Security. The agent can't get either, so there's no
> proof, and its account won't run it."

### Act 4 — its key is stolen *(the close)*

> **READ:** "Now the worst case. The attacker has the agent's signing key, and a proof that was
> genuinely issued for a gold purchase. They point it at their own wallet."

> **READ:** "The signature is real. The proof is real. And it still doesn't execute — because that
> proof authorises one call: that token, that amount, that recipient. Change the destination and
> you've changed the commitment."

> *UNDERSTAND:* On-chain this reverts with *"runtime params do not match anchor execution
> commitment"*. Four guarantees were reproduced adversarially against a real validator-attested
> proof: can't substitute a different call, forged/absent proof reverts, a used proof can't be
> replayed, and the gate is a pre-condition — nothing partial. **The close:** the blast radius of a
> stolen agent key is nothing.

---

## 3 · Stop the Production Mistake — ~40s *(cut first if short on time)*

> **READ (Act 1):** "A release pipeline changing a ten-million-dollar production contract. Three
> authorities, all three sign, and the version changes only against the proof."

> **READ (Act 2):** "Two in the morning. An on-call engineer with a genuine fix and real
> credentials. One authority is awake. Nothing ships — and there's no button anyone can press to
> change that."

> **READ (Act 3):** "Now the attacker owns the build pipeline outright. Valid CI credentials, the
> normal release path, a backdoored build. The pipeline was never an authority. It asks, and it
> gets nothing."

> *UNDERSTAND:* This is the wedge demo — cryptographic change control, ITGC, segregation of duties.
> Act 3's point is that CI/CD is a *proposer*, never an authority; in most shops it holds the deploy
> key, which is why supply-chain attacks reach production.

---

## 4 · Cross-Chain Treasury — ~45s *(strongest single act is #3)*

> **READ (Act 1):** "A DAO moving twenty-five million across chains. Three authorities, one proof,
> both legs."

> **READ (Act 2):** "A treasurer key is stolen. One of three — nothing moves. So they pivot and
> phish the Foundation. Now the attacker holds two of the three authorities, both signatures
> genuine. Still nothing moves."

> **READ (Act 3):** "Now they stop trying to fake authority and reuse authority that was real. This
> is the proof that moved twenty-five million dollars in Act 1 — every signature genuine. Three of
> three. And it's refused, because a proof authorises one action once. That one already did its
> job."

> **READ (Act 4):** "The surviving authorities revoke both compromised keys in one action — and
> every account on every chain those keys controlled is re-secured at the same moment."

> *UNDERSTAND:* Act 3 is the frame to screenshot for the application: **3 / 3 genuine signatures,
> REFUSED**. The anchor is consumed on first execution and was bound to a different destination.
> Act 4 is one Accumulate key-page update — governance lives on the ledger, so the external
> accounts it controls are re-secured without touching those chains.

---

## Closing — 10s

> **READ:** "One engine. Asset issuance, AI agents, treasury, change control — only the action
> changes. Execution is conditional on proof."

> *UNDERSTAND:* If you have one more sentence, make it the moat: *there is no admin key anywhere in
> this system; the executing account is ADI-derived and no private key for it exists.*

---

## Things you may be asked

| Question | Answer |
|---|---|
| "Isn't this just multisig?" | Multisig is one key list in one company. This is separate companies with separate identities, plus constraints no signature count can satisfy — and the executing account has no key. |
| "Is this live or a mock?" | The proof cycle is real and runs on Sepolia; this recording is in simulated mode, which is why the artifacts are marked SAMPLE. |
| "What if the policy engine is wrong?" | It's the organisation's own engine, running on their infrastructure against their records. Certen doesn't write it and can't override it. |
| "What stops Certen?" | Certen never holds a key. Every seat signs from the organisation that owns it. |
| "Why Accumulate?" | Identity and authority are first-class on the ledger, so a key rotation re-secures every chain those keys controlled in one transaction. |
