# Narrator script — YC video

Two columns throughout:

> **READ** — say this, close to verbatim.
>
> *UNDERSTAND* — background you need in your head so you can answer a question or improvise.
> **Do not say it on camera** unless someone asks. It is the difference between sounding like you
> built this and sounding like you memorised it.

**Setup:** gear icon → pace **Cinematic**, view **Diagram**. Capture at 1600×900. Start recording on
each demo's brief card, not mid-scenario.

**Every click is listed.** Each act now stops between beats so you can talk over each one — nothing
runs away from you. The proof journey on the right fills over ~13 seconds after a proof forms; you
have time to name each phase as it lands.

---

## Time budget — you cannot film all 34 beats

| Demo | Beats | For a 3-minute video |
|---|---|---|
| 1 · Regulated Asset Issuance | 11 | **Film all of it.** This is the pitch. |
| 2 · AI Agent Guardrails | 8 | Film Acts 2 and 4. Skip 1 and 3. |
| 3 · Stop the Production Mistake | 6 | Cut entirely, or Act 3 only. |
| 4 · Cross-Chain Treasury | 9 | **Act 3 only** — the replayed proof. |

If you have 90 seconds of demo time: Demo 1 in full, then Demo 4 Act 3 as the closer.

---

## 0 · Cold open (launcher) — 15s

> **READ:** "Every system in this space records who approved something, then trusts a key to execute
> it. We removed the key. Without a valid proof, the action isn't blocked — it's impossible."

> *UNDERSTAND:* Five words: **execution is conditional on proof**. Spine is **identity → policy →
> execution**, not identity → authorization → governance — governance is one application, not the
> product. Category is execution enforcement; wedge is cryptographic change control, which maps to
> an existing budget line (ITGC, segregation of duties, SOC 2).

---

## 1 · Regulated Asset Issuance — 11 beats, ~90s

### Brief card (hold 5s)

> **READ:** "Tokenized gold. Three companies: one issues the token, one holds the metal, one keeps
> the register of who owns what."

### Act 1 — a correct issuance

**① Click `Issue $50,000,000 of new tokens`**

> **READ:** "Three separate companies, each with its own identity and its own keys. Certen holds
> none of them. Some of these signers are people; some are the company's own policy engine —
> Helvetia's checks its vault records, Ledgerline's checks its holder registry."

> *UNDERSTAND:* This is the **headless off-chain policy-engine signer**. Certen ships it; the org
> runs it and holds the key. It discovers a pending transaction naming that org's authority, asks
> that org's own policy engine, signs with the org's key, submits the vote. The key can live in
> Vault and never leave. This is how off-chain reality — an assay, a KYC registry, a biometric
> re-auth — gates an on-chain action. It's also the answer to "our compliance logic is proprietary":
> you don't hand it over, you plug it in.

Point at the first journey step, spinning amber.

> **READ:** "Notice the intent isn't recorded yet. On Accumulate it stays pending until every key
> page meets its own threshold. Nothing here claims approval before it happens."

**② `Authorize`** (Meridian) · **③ `Evaluate`** (Helvetia) · **④ `Evaluate`** (Ledgerline)

> **READ:** "Each company meets its own internal threshold. Only now is the intent recorded. Proven
> against the ledger. Authorised by seven independent validators. And bound to this exact action —
> that binding is what makes the thing that executes the same as the thing that was approved."

> *UNDERSTAND:* "Bound to the exact action" is the `executionCommitment` —
> `keccak256(chainId · target · value · calldata)`. The journey deliberately waits on the real
> execution before its fifth step; that pause is yours to fill.

> **READ:** "Three companies, one proof — and only now does supply change. Three hundred million
> outstanding, against three hundred and twelve million of attested gold."

### Act 2 — the keystroke *(lead with this if you film only one act)*

**⑤ Click `Now an operator makes a mistake`**

> **READ:** "A new delivery lands. The custodian re-attests — six hundred and twelve million now
> backed. The operator goes to mint three hundred million against it."

**⑥ Click `Operator keys in the mint`**

> **READ:** "They key three hundred *trillion*. Six extra zeros. Watch who catches it — and who
> doesn't. Meridian's own officers approve it; it's their operator's number. Ledgerline approves it
> too; the destination is perfectly legitimate. Two of the three companies have signed off, and
> neither of them is looking at the vault."

**⑦ Click `Evaluate`** (Helvetia)

> **READ:** "The vault controller signs. Then the policy engine does the arithmetic — and refuses.
> Not because someone read the number carefully. Because the tokens would not have been backed by
> anything."

> *UNDERSTAND:* PYUSD-class error — a hand-keyed figure every downstream system accepted. The
> refusal is a policy **constraint**, not a quorum shortfall: no number of signatures satisfies it.
> That's the distinction that makes this not multisig.

**Land it:** *"It didn't need a human to catch it. It was arithmetically impossible to prove."*

### Act 3 — total compromise (three beats, three different reasons)

**⑧ Click `Now the issuer is completely compromised`**

> **READ:** "Now assume the worst. Not a phish — a total compromise. The attacker holds every one of
> Meridian's officer keys."

**⑨ Click `Attacker mints $2,000,000,000 to their own address`** — watch the three keys sign.

> **READ:** "Every key signs. That seat is legitimately satisfied — the attacker really does control
> that company. And it buys them one seat of three."

**⑩ Click `Helvetia checks the vault`**

> **READ:** "Helvetia refuses. Two billion dollars of tokens against six hundred and twelve million
> of gold. The arithmetic doesn't close, and no signature can make it close."

**⑪ Click `Ledgerline checks the register`**

> **READ:** "Ledgerline refuses for a completely different reason — that wallet isn't a holder of
> record. One of three. No proof. No tokens — and the refusal just went to both other companies and
> Meridian's own security team. **The attacker's first attempt is the alert.**"

> *UNDERSTAND:* If asked "what if they compromise the custodian too?" — they still need the transfer
> agent, and they still need the gold to exist. The reserve constraint isn't a signature; no amount
> of key theft satisfies it. **Close:** every infinite-mint exploit in this market began with an
> attacker holding valid issuer credentials.

---

## 2 · AI Agent Guardrails — 8 beats, ~70s

### Brief card

> **READ:** "An AI agent with its own key and real spending authority over the treasury."

**① Click `Wake the AI agent`** *(skippable)*

> **READ:** "It rebalances into the same tokenized gold. Within policy, so it proves and executes on
> its own key. Certen is policy, not a wall."

### Act 2 — it tries to route around its own limit *(film this)*

**② Click `Now the agent subscribes for $5,000,000`**

> **READ:** "Five million needs a person."

**③ Click `The agent tries to route around the limit`**

> **READ:** "Watch what it does. It splits the payment into six of nine hundred thousand — each one
> individually under the limit. Refused, because the limit isn't per transaction. It's what this
> agent has moved in the last hour. It fails on the first payment."

> *UNDERSTAND:* The failure mode prompts cannot fix — the agent isn't malicious, it's *optimising*.
> The limit is a policy constraint over a rolling window across all of the actor's activity.

**④ Click `Authorize`**

> **READ:** "A person co-signs the original five million, and it executes. The seatbelt works in
> both directions."

### Act 3 — prompt injection *(skippable)*

**⑤ Click `Now the agent is manipulated`**

> **READ:** "It's told to replace the token's code with an attacker's contract — one that could mint
> without limit. It authorises the call with its own key, quite happily."

**⑥ Click `CERTEN asks for the two senior keys`**

> **READ:** "Neither the CTO nor Security signs. No proof, so its account won't run it."

### Act 4 — its key is stolen *(film this — it's the close)*

**⑦ Click `Now the agent’s own key is stolen`**

> **READ:** "Now the worst case. The attacker has the agent's signing key, and a proof that was
> genuinely issued for a gold purchase. The signature is real. The proof is real. Everything about
> this checks out."

**⑧ Click `The account re-derives the commitment`**

> **READ:** "And it still doesn't execute — because that proof authorises one call: that token, that
> amount, that recipient. Change the destination and you've changed the commitment."

> *UNDERSTAND:* On-chain this reverts with *"runtime params do not match anchor execution
> commitment"*. Four guarantees reproduced adversarially against a real validator-attested proof:
> can't substitute a different call, forged proof reverts, a used proof can't be replayed, and the
> gate is a pre-condition — nothing partial. **Close:** the blast radius of a stolen agent key is
> nothing.

---

## 3 · Stop the Production Mistake — 6 beats, ~50s *(cut first)*

**① `Propose the upgrade`** · **② `Authorize`**

> **READ:** "A release pipeline changing a ten-million-dollar production contract. Three authorities
> sign, and the version changes only against the proof."

**③ Click `Now a hotfix skips review`** — watch the CTO's signature land, then nothing.

> **READ:** "Two in the morning. An on-call engineer with a genuine fix and real credentials. The
> CTO signs. The other two are asleep."

**④ Click `Page the other two authorities`**

> **READ:** "Paged twice. Still one of three. There's no button anyone can press to make tonight an
> exception."

**⑤ Click `Now the build pipeline is compromised`**

> **READ:** "Now the attacker owns the build pipeline outright. Valid CI credentials, the normal
> release path, a backdoored build."

**⑥ Click `CERTEN asks all three authorities`**

> **READ:** "None of them recognises this release. None signs. The pipeline was never an authority —
> it only proposes. It asks, and it gets nothing, and three people now know something is wrong with
> the build system."

> *UNDERSTAND:* The wedge demo — cryptographic change control, ITGC, segregation of duties. In most
> shops CI/CD holds the deploy key, which is why supply-chain attacks reach production.

---

## 4 · Cross-Chain Treasury — 9 beats, ~70s *(Act 3 is the one to film)*

**① `Propose the $25M transfer`** · **② `Authorize`**

> **READ:** "A DAO moving twenty-five million across chains. Three authorities, one proof, both
> legs."

**③ Click `Now: treasurer key is stolen`** — watch the stolen signature land.

> **READ:** "A real treasurer key, stolen. The signature lands, and it's genuine. And nothing
> follows it. One of three."

**④ Click `The attacker phishes a second authority`**

> **READ:** "So they pivot and phish the Foundation. Now the attacker holds two of the three
> authorities, both signatures genuine. Still nothing moves."

### Act 3 — the replayed proof *(the strongest single frame in any demo)*

**⑤ Click `Now the attacker replays a real proof`** — let all three signatures land one at a time.

> **READ:** "Now they stop trying to fake authority and reuse authority that was real. This is the
> proof that moved twenty-five million dollars in Act 1. One signature. Two. Three. Every one of
> them genuine. Three of three — on paper this is a fully authorised transfer."

**⑥ Click `CERTEN checks the anchor`**

> **READ:** "Refused. A proof authorises one action, once. That one already did its job in Act 1,
> and it was bound to a different destination. Genuine signatures, spent authority."

**⑦ `Now revoke the compromised keys`** · **⑧ `Authorize`** · **⑨ `Authorize`**

> **READ:** "The surviving authorities revoke both compromised keys in one action — and every
> account on every chain those keys controlled is re-secured at the same moment."

> *UNDERSTAND:* One Accumulate key-page update. Governance lives on the ledger, so the external
> accounts it controls are re-secured without touching those chains.

---

## Closing — 10s

> **READ:** "One engine. Asset issuance, AI agents, treasury, change control — only the action
> changes. Execution is conditional on proof."

> *UNDERSTAND:* If you have one more sentence, make it the moat: there is no admin key anywhere in
> this system; the executing account is ADI-derived and no private key for it exists.

---

## Language rules

The audience is YC partners, not Accumulate users. **Nothing on screen uses our vocabulary** —
neither should you. The one exception is the technical line under each proof-journey step, which is
deliberately technical and which you should not read aloud.

| Never say | Say instead |
|---|---|
| G0 / G1 / G2, proof level | "the action that ran is the action they approved" |
| ADI, identity URL, `acc://…` | the company's name |
| key page, threshold, M-of-N | "2 of 3 approvers" |
| attestation, attested reserves | "the gold in the vault", "the vault was counted" |
| outstanding supply, mint | "tokens issued", "issue tokens" |
| quorum, authority set | "all three companies" |
| custodian, transfer agent | "holds the gold", "keeps the register" |

**Don't say "approved" while the first journey marker is still spinning** — it's pending until every
key page meets its threshold, and the screen is careful about that distinction.

---

## Things you may be asked

| Question | Answer |
|---|---|
| "Isn't this just multisig?" | Multisig is one key list in one company. This is separate companies with separate identities, plus constraints no signature count can satisfy — and the executing account has no key. |
| "Is this live or a mock?" | The proof cycle is real and runs on Sepolia; this recording is simulated, which is why artifacts are marked SAMPLE. |
| "What if the policy engine is wrong?" | It's the organisation's own engine, on their infrastructure, against their records. Certen doesn't write it and can't override it. |
| "What stops Certen?" | Certen never holds a key. Every seat signs from the organisation that owns it. |
| "Why Accumulate?" | Identity and authority are first-class on the ledger, so one key rotation re-secures every chain those keys controlled. |
| "Three companies is a lot of coordination." | They already coordinate — issuer, custodian and transfer agent all exist today. This replaces email and PDFs with a gate. |
