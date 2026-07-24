# Demo — Regulated Asset Issuance (RWA)

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
