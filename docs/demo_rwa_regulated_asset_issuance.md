# Demo — Regulated Asset Issuance (RWA)

## Language rules (read first)

The audience is YC partners, not Accumulate users. **Nothing on screen uses our vocabulary**, and
neither should the narration. If a word only makes sense to someone who already knows the product,
it is banned.

| Never say | Say instead |
|---|---|
| G0 / G1 / G2, proof level | "the action that ran is the action they approved" |
| ADI, identity URL, `acc://…` | the company's name |
| key book, key page, threshold | "2 of 3 approvers" |
| attestation, attested reserves | "the gold in the vault", "the vault was counted" |
| outstanding supply, mint | "tokens issued", "issue tokens" |
| quorum, authority set | "all three companies" |
| hashes, `0x…` addresses | "Fund wallet", "Attacker's wallet" |
| custodian, transfer agent | "holds the gold", "keeps the register" |

**The one line the video must land** — everyone else records who approved and then trusts a key to
execute. Certen removed the key. Without a valid proof the action isn't blocked, it is *impossible*.
That sentence is on screen permanently under the outcome node, and it is the only claim here that
no competitor can make.

**The spine is identity → policy → execution.** Not identity → authorization → governance —
governance is one application of the engine, not the product.

## Proof artifacts — what they are, and what you may say about them

Small monospace lines sit under the proof and execution nodes. They exist to answer the unspoken
question *"is this a real system or a mockup?"* — nobody needs to parse them.

| On screen | What it is in the live system |
|---|---|
| `proof c87ab49f` | first 8 hex of the intent UUID, exactly how the V6.1 cycle abbreviates a run |
| `commitment 0x6625b7…afaa` | the `executionCommitment` binding chainId · target · value · keccak256(calldata) — the reason the executed action *must* equal the approved one |
| `7 of 7 checked independently · 5 required` | the live run reports `achieved 7 / total 7 / required 5 · met = true` |
| `Base Sepolia · 0x81a0…aee6` | the execution transaction (TX3, `executeGovernanceProofDirect`) |
| `refusal record … signed & permanent` | the artifact almost nobody else produces — evidence of what did **not** happen |
| `0x9C4dA2f1…A81f` beside the no-key line | the ADI-derived abstract account. Owner is `keccak256(adiURL)[-20:]`; **no private key for it exists** |

**You are filming in simulated mode, so every artifact carries a `SAMPLE` tag and no link.**
The shapes, counts and vocabulary are faithful to the real Sepolia cycle, but these specific
hashes are synthesized. Narrate accordingly:

- ✅ *"Every action produces a proof and an on-chain transaction — that's the shape of a real run."*
- ✅ *"Even the refusal is a signed, permanent record."*
- ❌ *"Click that and you'll see it on Basescan."* — you can't, in this mode.

To make them real, run the orchestrator with `DEMO_MODE=live` and a funded sponsor key; the
`SAMPLE` tags disappear and the explorer links appear automatically.

**Source of truth** for all of the above:
`C:\Accumulate_Stuff\certen\onboarding_v6_1_proof_cycle.html` (the 9-phase V6.1 cycle) and
`C:\Accumulate_Stuff\certen\agent_contract_call_proof_cycle.html` (the agent contract-call run).


**Scenario id:** `rwa-issuance` · **Launcher position:** Demo 1 · **Acts:** 3
**Filming mode:** press `F` for film mode, set pace to **Cinematic**, recap **off**.

The flagship RWA demo. A tokenized gold issuance whose authority set spans **three separate
companies**, each with its own identity and its own internal key hierarchy — plus a policy
constraint bound to physical custody that no number of signatures can satisfy.

---

## The setup

| | Entity | Identity | Own key page | Gates |
|---|---|---|---|---|
| Issuer | Meridian Bullion Corp | `acc://meridian.issuer` | `book/board · page 1` — 2 of 3 officers | mint · burn · transfer |
| Custodian | Helvetia Vault AG | `acc://helvetia.custody` | `book/attestation · page 1` — 2 of 2 | mint · burn only |
| Transfer agent | Ledgerline Transfer Agency | `acc://ledgerline.ta` | `book/ops · page 1` — 2 of 2 | mint · burn only |

The custodian's second key is a **Reserve Policy Engine**, not a person: it signs only if the mint
stays inside signed custody. The transfer agent's second key is a **Registrar** that checks the
holder registry. Neither is a rubber stamp, and neither is reachable from a stolen issuer key.

**Scoping matters:** custodian and transfer agent gate *supply changes only*. Routine secondary
transfers don't touch custody, so they aren't in the path (`regulated-asset-transfer`, auto).

**Numbers**

| | Attested custody | Outstanding | This mint |
|---|---|---|---|
| Act 1 | $312,400,000 (1,614 bars) | $250,000,000 | $50,000,000 ✓ |
| Act 2 | $612,400,000 (3,166 bars, new delivery) | $300,000,000 | $300,000,000,000,000 ✗ |
| Act 3 | $612,400,000 | $300,000,000 | $2,000,000,000 ✗ |

---

## Act 1 — a correct issuance

**Click:** `Issue $50,000,000 of new tokens`, then `Authorize` / `Evaluate & sign` on each of the
three columns, left to right.

> "Meridian wants to issue fifty million dollars of tokenized gold. Look at the authority set —
> three separate companies. Not three keys in one company's multisig. Three companies, three
> identities, three internal quorums, no shared root."
>
> *(clicking through)* "Meridian meets its own two-of-three. Helvetia's vault controller signs,
> and then its reserve policy engine checks the arithmetic against the bar list it signed this
> morning. Ledgerline confirms the destination is a holder of record."
>
> "Three companies, one proof — and only now does supply change. Three hundred million
> outstanding, against three hundred and twelve million of attested gold."

**Watch for:** all three columns green, `3 of 3 orgs`, the supply bar stopping short of the green
custody line, rail ⑤ confirming `$250,000,000 → $300,000,000`.

---

## Act 2 — the keystroke (the PYUSD-class error)

**Click:** `Now an operator makes a mistake` → `Operator keys in the mint` → then the single
`Evaluate & sign` on Helvetia.

Acts 1 and 3 aside, this is the one to lead with if you only have time for one.

> "A new delivery lands in the vault. Helvetia re-attests — six hundred twelve million now backed.
> The operator goes to mint three hundred million against it."
>
> *(after the submit)* "Three hundred million, keyed as three hundred **trillion**. Six extra
> zeros. Now watch who catches it."
>
> "Meridian's own officers approve it — it's their operator's number. Ledgerline approves it too;
> the destination is perfectly legitimate. Two of the three companies have signed off, and neither
> of them is looking at the vault."
>
> *(clicking Helvetia)* "The vault controller signs. And then the reserve policy engine does the
> arithmetic — and refuses. Not because someone read the number carefully. Because the tokens
> would not have been backed by anything."

**Watch for:** the red hatched bar running off the chart past the custody line, **489,876×
attested custody**, two green columns and one red, `REFUSED`.

**Line to land:** *"This is the class of error behind the three hundred trillion dollar stablecoin
mint. It didn't need a human to notice. It was arithmetically impossible to prove."*

---

## Act 3 — the issuer is completely compromised

**Click:** `Now the issuer is completely compromised` → `Attacker mints $2,000,000,000 to their own
address`. Then narrate over the animation — no further clicks.

> "Now assume the worst. Not a phish — a total compromise. The attacker holds every one of
> Meridian's officer keys, and is signing perfectly valid, correctly formed requests."
>
> *(as the issuer column fills)* "Watch the issuer column. Every key signs. That seat is
> legitimately satisfied — the attacker really does control that company."
>
> "And it buys them one seat of three. Helvetia refuses: two point three billion against six
> hundred twelve million of gold. Ledgerline refuses: the destination isn't a holder of record."
>
> "One of three. No proof. No tokens. And the refusal was just broadcast to Helvetia, Ledgerline
> and Meridian's own security team — **the attacker's first attempt is the alert.**"

**Watch for:** amber compromised issuer at `3/3` keys, two red refusals, `1 of 3 orgs`, and rail ⑤:
*"Total compromise of the issuer produced zero tokens and three notifications."*

**Line to land:** *"Every infinite-mint exploit in this market started with an attacker holding
valid issuer credentials. Here those credentials are one third of an authority set spanning three
companies in three jurisdictions — and the reserve constraint isn't a signature at all, so no
amount of key theft satisfies it."*

**If asked "what if they compromise the custodian too?"** — they still need the transfer agent, and
they still need the gold to exist.

---

## Pairing with Demo 2

Demo 2 (AI Agent Guardrails) now operates on **the same XAUV asset**: the agent buys it, subscribes
into it, and in Act 3 is manipulated into trying to swap the token's implementation for one with a
backdoor mint. Filmed back to back the story is one arc — the asset is issued under a three-company
proof, then traded by an autonomous agent under the same engine.

## Presenter notes

- `F` toggles film mode mid-take. Pace lives in the settings popover (gear icon).
- Act 2 and Act 3 drive themselves after the first click, so nothing depends on click order.
- Everything runs in-browser (`VITE_STATIC=1`) — no orchestrator, no backend, no network.
- QA: `node qa/rwa-qa.mjs` screenshots every beat; `node qa/smoke.mjs` drives all four demos.
