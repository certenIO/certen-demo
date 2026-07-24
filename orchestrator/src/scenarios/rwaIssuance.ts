import { BaseScenario, blockedRecord, ctl, pendingRecord } from './base.js';
import { hash32, usd } from '../lib/util.js';
import { execAssetMint } from '../chain/exec.js';
import type {
  AuthorityGraphInfo,
  AuthorityOrg,
  ContrastInfo,
  EvidenceInfo,
  IntegrationTrace,
  PolicyConstraintResult,
  ScenarioMeta,
  ScenarioState,
  SupplyPanelInfo,
} from '../types.js';

// ── The asset ────────────────────────────────────────────────────────────────
const ASSET = 'Tokenized gold';
const TOKEN = 'Gold token · XAUV';
// The ADI-derived abstract account that performs the mint. No private key exists for it.
const ISSUANCE_ACCOUNT = '0x9C4dA2f1…A81f';
const FUND_ADDR = 'Fund wallet'; // the registered issuance destination
const ATTACKER_ADDR = "Attacker's wallet"; // not on the holder registry

// Reserve ceiling, in USD. Act 2 opens with a new bar delivery that raises it.
const ATTESTED_OPENING = 312_400_000;
const ATTESTED_AFTER_DELIVERY = 612_400_000;
const OUTSTANDING_OPENING = 250_000_000;

const MINT_ACT1 = 50_000_000;
const MINT_INTENDED = 300_000_000; // what the operator meant to type in Act 2
const MINT_FATFINGER = 300_000_000_000_000; // what they actually typed — six extra zeros
const MINT_ATTACK = 2_000_000_000;

const BARS_OPENING = '1,614 gold bars · Zurich vault';
const BARS_AFTER_DELIVERY = '3,166 gold bars · Zurich vault';

// ── The three organizations ──────────────────────────────────────────────────
// Each is a separate legal entity with its OWN root identity and its OWN key hierarchy.
// There is no shared admin key, and the token contract has no owner.
const ISSUER_ADI = 'acc://meridian.issuer';
const CUSTODY_ADI = 'acc://helvetia.custody';
const TA_ADI = 'acc://ledgerline.ta';

const CONTRAST: ContrastInfo = {
  without:
    'Issuance is one company’s internal control. Compromise it, or fat-finger it, and the tokens exist before anyone notices.',
  with:
    'Supply can only change against a proof that three independent companies each satisfied their own internal quorum — and that the mint stays inside signed custody. The token contract has no owner to bypass it.',
};

const INTEGRATION: IntegrationTrace = {
  frontDoor:
    'One API Gateway. Each company keeps its own keys in its own HSM and signs from its own systems — they never share a credential, and CERTEN never holds one.',
  steps: [
    { method: 'POST', endpoint: '/v1/transaction', actor: 'Issuer platform', label: 'Issuer proposes the mint', detail: 'contractCall leg: token · mint(to, amount) · expectedEvents' },
    { method: 'GET', endpoint: '/v1/pending', actor: 'Custodian · Transfer agent', label: 'Each co-signer is notified in its own system', detail: 'Webhook or polling — whatever each firm already runs' },
    { method: 'POST', endpoint: '/v1/sign', actor: 'Each firm’s own HSM', label: 'Each signs to its own internal quorum', detail: 'Keys never leave the signing organization' },
    { method: 'CONSENSUS', endpoint: '7 validators', actor: 'CERTEN quorum', label: 'Quorum proves the exact mint', detail: 'Binds chainId · token · recipient · amount · the custody attestation' },
    { method: 'ON-CHAIN', endpoint: 'CertenAccountV5', actor: 'Issuance account', label: 'Mint executes — or reverts', detail: 'No proof, no supply change. There is no admin mint path.' },
  ],
  certenHandles: ['Cross-company authority sets', 'Reserve-bound policy', 'Proof generation', 'On-chain issuance gate', 'Refusal records'],
  partnerImplements: ['Propose issuance', 'Each firm holds its own keys', 'Publish the custody attestation', 'Archive the proof'],
};

/**
 * Demo — "Regulated Asset Issuance".
 *
 * A tokenized gold issuance whose authority set spans three separate companies: the issuer,
 * the vault custodian, and the transfer agent. Custodian and transfer agent gate supply changes
 * (mint / burn) only — secondary transfers move without them.
 *
 *   Act 1: a correct $50M issuance — all three companies satisfy their own quorums, mint executes.
 *   Act 2: an operator keys $300M as $300T — the custodian's reserve policy refuses automatically.
 *   Act 3: the issuer is fully compromised — valid credentials, and the mint still dies at 1 of 3.
 */
export class RwaIssuanceScenario extends BaseScenario {
  get meta(): ScenarioMeta {
    return {
      id: 'rwa-issuance',
      title: 'Regulated Asset Issuance',
      hook: 'Three companies. Three identities. Supply cannot move unless all three prove it.',
      badge: 'RWA',
      accent: 'primary',
    };
  }

  // Definite-assignment: every one of these is owned by blank(), which the base constructor
  // calls. Field initializers here would run AFTER super() and silently clobber it.
  private orgs!: AuthorityOrg[];
  private pendingTx!: string;
  private attested!: number;
  private outstanding!: number;
  private proposed!: number;
  private barList!: string;

  // ── org templates ──────────────────────────────────────────────────────────

  private issuerOrg(): AuthorityOrg {
    return {
      role: 'issuer',
      org: 'Meridian Bullion Corp',
      kind: 'Issues the token',
      adi: ISSUER_ADI,
      keyBook: 'book/board · page 1',
      threshold: 2,
      total: 3,
      scope: 'mint · burn · transfer',
      signers: [
        { label: 'Treasurer', detail: 'HSM · New York', signed: false },
        { label: 'CFO', detail: 'HSM · New York', signed: false },
        { label: 'Head of Issuance', detail: 'HSM · London', signed: false },
      ],
      status: 'pending',
      canApprove: true,
    };
  }

  private custodianOrg(): AuthorityOrg {
    return {
      role: 'custodian',
      org: 'Helvetia Vault AG',
      kind: 'Holds the gold',
      adi: CUSTODY_ADI,
      keyBook: 'book/attestation · page 1',
      threshold: 2,
      total: 2,
      scope: 'mint · burn only',
      signers: [
        { label: 'Vault Controller', detail: 'YubiHSM · Zürich', signed: false },
        { label: 'Automatic gold check', detail: 'automated · signs only if the gold is there', signed: false },
      ],
      status: 'pending',
      canApprove: true,
      automated: true,
    };
  }

  private taOrg(): AuthorityOrg {
    return {
      role: 'transfer-agent',
      org: 'Ledgerline Transfer Agency',
      kind: 'Keeps the register',
      adi: TA_ADI,
      keyBook: 'book/ops · page 1',
      threshold: 2,
      total: 2,
      scope: 'mint · burn only',
      signers: [
        { label: 'Compliance Officer', detail: 'KMS · Chicago', signed: false },
        { label: 'Automatic recipient check', detail: 'automated · approved-recipient list', signed: false },
      ],
      status: 'pending',
      canApprove: true,
      automated: true,
    };
  }

  /**
   * How many organizations have filled their seat. A compromised seat counts as FILLED — the
   * stolen keys really did satisfy that company's quorum, and pretending otherwise would soften
   * the point. The whole demo turns on one filled seat being worth nothing.
   */
  private orgsSatisfied(): number {
    return this.orgs.filter((o) => o.status === 'satisfied' || o.status === 'compromised').length;
  }

  private graph(headline: string, footnote?: string): AuthorityGraphInfo {
    return { headline, orgs: this.orgs.map((o) => ({ ...o, signers: o.signers.map((s) => ({ ...s })) })), footnote };
  }

  private supply(opts: { proposedLabel?: string; breach?: string; ageLabel?: string } = {}): SupplyPanelInfo {
    return {
      assetLabel: ASSET,
      attestedUsd: this.attested,
      attestedLabel: usd(this.attested),
      outstandingUsd: this.outstanding,
      outstandingLabel: usd(this.outstanding),
      proposedUsd: this.proposed,
      proposedLabel: opts.proposedLabel ?? (this.proposed ? usd(this.proposed) : '—'),
      attestation: {
        custodian: 'Helvetia Vault AG',
        detail: this.barList,
        ageLabel: opts.ageLabel ?? 'counted 22 min ago',
        fresh: true,
      },
      breach: opts.breach,
    };
  }

  /** Push the current authority graph + the mirrored flat approvals the recap/verdict read. */
  private syncAuthorities(headline: string, footnote?: string) {
    this.patch({
      authorities: this.graph(headline, footnote),
      approvals: {
        collected: this.orgsSatisfied(),
        threshold: 3,
        approvers: this.orgs.map((o) => ({
          role: o.role,
          label: o.org,
          detail: o.kind,
          approved: o.status === 'satisfied' || o.status === 'compromised',
          canApprove: !!o.canApprove,
          compromised: o.status === 'compromised',
        })),
      },
    });
  }

  protected blank(): ScenarioState {
    this.orgs = [];
    this.pendingTx = '';
    this.attested = ATTESTED_OPENING;
    this.outstanding = OUTSTANDING_OPENING;
    this.proposed = 0;
    this.barList = BARS_OPENING;

    return {
      id: this.meta.id,
      title: this.meta.title,
      subtitle: 'Tokenized gold · issuer · custodian · transfer agent',
      act: 0,
      totalActs: 3,
      mode: 'simulated',
      verdict: 'idle',
      action: null,
      policy: null,
      approvals: null,
      proof: null,
      execution: null,
      authorities: null,
      supply: this.supply(),
      explainer: {
        pain: 'One company controls issuance. Its internal approvals are the only thing between a keystroke and new supply.',
        certenMove: 'CERTEN makes supply changes executable only against a proof that three independent companies each authorized it, inside signed custody.',
        buyerTakeaway: 'Proof of reserves stops being a quarterly report and becomes a precondition of minting.',
        integrationHint: 'Each firm signs from its own HSM through one API.',
      },
      coordination: null,
      evidence: null,
      contrast: CONTRAST,
      integration: INTEGRATION,
      impactedSystems: ['Token supply', 'Holder registry', 'Custody attestation', 'Regulatory reporting'],
      controls: [ctl('start', 'Issue $50,000,000 of new tokens', 'primary', { emphasis: true })],
      busy: false,
      message: 'Ready',
    };
  }

  async start(): Promise<void> {
    await this.act(1);
  }

  /** 1/2/3 open an act; 21/31 are the second beat within acts 2 and 3. */
  async act(n: number): Promise<void> {
    if (n === 1) return this.actProperIssuance();
    if (n === 2) return this.actFatFinger();
    if (n === 21) return this.actFatFingerSubmit();
    if (n === 3) return this.actCompromisedIssuer();
    if (n === 31) return this.actCompromisedSubmit();
  }

  /** Evaluate the mint under the real policy engine and map its constraints for rail ②. */
  private evaluateMint(mintUsd: number, destinationRegistered: boolean) {
    return this.policyFor({
      actionType: 'assetMint',
      amountUsd: mintUsd,
      mintUsd,
      outstandingUsd: this.outstanding,
      attestedReservesUsd: this.attested,
      attestationAgeHours: 0.37,
      destinationRegistered,
      principal: TOKEN,
    });
  }

  private constraint(cs: PolicyConstraintResult[] | undefined, id: string) {
    return cs?.find((c) => c.id === id);
  }

  // ══ Act 1 — a correct issuance ══════════════════════════════════════════════
  private async actProperIssuance() {
    this.orgs = [this.issuerOrg(), this.custodianOrg(), this.taOrg()];
    this.proposed = MINT_ACT1;
    this.pendingTx = hash32();
    const decision = this.evaluateMint(MINT_ACT1, true);

    this.patch({
      act: 1,
      actLabel: 'Act 1 of 3 · correct issuance',
      verdict: 'blocked',
      proof: null,
      execution: { status: 'idle', headline: 'Supply cannot change without a proof from all three companies' },
      evidence: pendingRecord({
        plainMeaning:
          'The issuance is proposed and pending. Until all three companies satisfy their own quorums, no proof exists — and the token contract has no other way to mint.',
        auditFacts: [
          `Intent: mint ${usd(MINT_ACT1)} of XAUV to ${FUND_ADDR}`,
          'Authority set spans 3 separate legal entities',
          'Custody attestation attached to the intent',
        ],
        pendingTxHash: this.pendingTx,
      }),
      action: {
        verb: 'Issue tokens',
        summary: `${usd(MINT_ACT1)} of XAUV → ${FUND_ADDR}`,
        principal: TOKEN,
        initiator: 'Meridian Issuance',
        amountLabel: usd(MINT_ACT1),
        target: FUND_ADDR,
        icon: 'mint',
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'supply-changing action',
        threshold: decision.threshold,
        required: decision.required,
        constraints: decision.constraints,
      },
      supply: this.supply(),
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: [
          { role: 'issuer', status: 'notified', channel: 'operator', timestampLabel: 'just now' },
          { role: 'custodian', status: 'notified', channel: 'webhook', timestampLabel: 'just now' },
          { role: 'transfer-agent', status: 'notified', channel: 'webhook', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'Each firm was notified in its own system. None of them shares a key with the others.',
      },
      explainer: {
        pain: 'Normally the issuer alone decides that new tokens exist.',
        certenMove: 'The mint needs all three companies, each meeting its own internal quorum, inside signed custody.',
        buyerTakeaway: 'The people who hold the metal and the people who keep the register are structurally in the loop.',
        integrationHint: 'Each firm signs from its own HSM — no shared credential exists.',
      },
      presenterCue: {
        say: 'Meridian wants to issue fifty million dollars of tokenized gold. Watch the authority set: three separate companies, each with its own identity and its own internal quorum.',
        waitFor: '0 of 3 organizations',
        objection: 'Isn’t this just a 3-of-3 multisig?',
        answer: 'A multisig is one key list in one organization. This is three organizations, three key hierarchies, no shared root — plus a reserve constraint no key count can satisfy.',
      },
      controls: [ctl('reset', 'Reset', 'reset')],
      message: 'Pending — 0 of 3 organizations have authorized',
    });
    this.syncAuthorities(
      '3 of 3 organizations · each satisfying its own internal quorum',
      'No shared admin key exists across these three companies. The token contract has no owner.',
    );
  }

  // ══ Act 2 — the fat finger ══════════════════════════════════════════════════
  private async actFatFinger() {
    // A new bar delivery lands and the custodian re-attests, raising the ceiling. This is what
    // the operator is legitimately minting against.
    this.attested = ATTESTED_AFTER_DELIVERY;
    this.barList = BARS_AFTER_DELIVERY;
    this.orgs = [this.issuerOrg(), this.custodianOrg(), this.taOrg()];
    // Act 2 drives itself up to the custodian, so nothing is clickable until then.
    for (const o of this.orgs) o.canApprove = false;
    this.proposed = 0;
    this.pendingTx = hash32();

    this.patch({
      act: 2,
      actLabel: 'Act 2 of 3 · the keystroke',
      verdict: 'idle',
      proof: null,
      evidence: null,
      execution: null,
      coordination: null,
      banner: null,
      action: null,
      policy: null,
      authorities: null,
      approvals: null,
      supply: this.supply({ ageLabel: 'counted 4 min ago' }),
      explainer: {
        pain: 'A new delivery arrives, the custodian re-attests, and an operator types the mint by hand.',
        certenMove: 'CERTEN binds the mint to the signed custody figure, so the arithmetic is checked before any proof can form.',
        buyerTakeaway: 'A typo becomes an arithmetic impossibility instead of an incident.',
        integrationHint: 'The custody attestation is an input to policy, not a PDF filed afterwards.',
      },
      presenterCue: {
        say: 'A new delivery lands in the vault. The custodian re-attests — six hundred twelve million now backed. The operator goes to mint three hundred million against it.',
        waitFor: 'the raised custody ceiling',
      },
      controls: [ctl('act:21', 'Operator keys in the mint', 'primary', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'New delivery attested — custody ceiling raised to ' + usd(ATTESTED_AFTER_DELIVERY),
    });
    await this.beat(900);
  }

  /** Act 2, second beat — the mint is entered with six extra zeros. */
  private async actFatFingerSubmit() {
    this.proposed = MINT_FATFINGER;
    const decision = this.evaluateMint(MINT_FATFINGER, true);
    const custody = this.constraint(decision.constraints, 'within-attested-custody');

    this.patch({
      verdict: 'blocked',
      action: {
        verb: 'Issue tokens',
        summary: `${usd(MINT_FATFINGER)} of XAUV → ${FUND_ADDR}   (intended: ${usd(MINT_INTENDED)})`,
        principal: TOKEN,
        initiator: 'Meridian Operator',
        amountLabel: usd(MINT_FATFINGER),
        target: FUND_ADDR,
        note: `intended ${usd(MINT_INTENDED)}`,
        icon: 'mint',
        destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'supply-changing action',
        threshold: decision.threshold,
        required: decision.required,
        constraints: decision.constraints,
      },
      supply: this.supply({ breach: custody?.detail, ageLabel: 'counted 4 min ago' }),
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 2,
        inboxItems: [
          { role: 'issuer', status: 'notified', channel: 'operator', timestampLabel: 'just now' },
          { role: 'custodian', status: 'notified', channel: 'webhook', timestampLabel: 'just now' },
          { role: 'transfer-agent', status: 'notified', channel: 'webhook', timestampLabel: 'just now' },
        ],
        coordinationSummary: 'Six extra zeros. Every downstream system would have accepted this number.',
      },
      execution: { status: 'idle', headline: 'Supply cannot change without a proof from all three companies' },
      evidence: pendingRecord({
        plainMeaning: 'The mint is pending. The custody constraint is already failing — no quorum can make this arithmetic close.',
        auditFacts: [
          `Intent: mint ${usd(MINT_FATFINGER)} of XAUV`,
          `Attested custody: ${usd(this.attested)}`,
          'Reserve constraint: FAILING',
        ],
        pendingTxHash: this.pendingTx,
      }),
      presenterCue: {
        say: 'Three hundred million, keyed as three hundred trillion. Now watch who catches it — and who doesn’t.',
        waitFor: 'the supply bar leaving the chart',
        objection: 'Wouldn’t a human have caught this?',
        answer: 'Two of them didn’t. The issuer’s own officers approved it and so did the transfer agent. The only thing that caught it was a policy bound to physical custody.',
      },
      controls: [ctl('reset', 'Reset', 'reset')],
      message: 'Pending — mint exceeds attested custody',
    });
    this.syncAuthorities('0 of 3 organizations · each satisfying its own internal quorum');

    // The two organizations whose checks this number does NOT violate approve it — on camera,
    // automatically, so the only remaining click is the one that matters. The issuer's officers
    // are approving their own operator's typo; the transfer agent's registry check passes because
    // the destination is perfectly legitimate. Neither of them is looking at the vault.
    await this.beat(600);
    await this.autoSatisfy(this.orgs[0], 'Meridian’s own officers approved it');
    await this.autoSatisfy(this.orgs[2], 'Ledgerline approved it — the destination is a registered holder');

    const custodian = this.orgs[1];
    custodian.canApprove = true;
    this.syncAuthorities(
      '2 of 3 organizations · only the custodian is left',
      'Two companies have signed off. Neither of them checks the vault.',
    );
    this.patch({
      busy: false,
      message: '2 of 3 — awaiting the custodian',
      presenterCue: {
        say: 'The issuer approved its own operator’s typo. The transfer agent approved it too — the destination is perfectly legitimate. Now the custodian.',
        waitFor: '2 of 3, custodian pending',
      },
    });
  }

  /** Fill an organization's seat without a click, signature by signature. */
  private async autoSatisfy(org: AuthorityOrg, message: string) {
    this.patch({ busy: true, message });
    let signed = 0;
    for (const s of org.signers) {
      if (signed >= org.threshold) break;
      s.signed = true;
      signed += 1;
      this.syncAuthorities(this.state.authorities?.headline ?? '', this.state.authorities?.footnote);
      await this.beat(380);
    }
    org.status = 'satisfied';
    org.canApprove = false;
    org.note = `${org.threshold} of ${org.total} internal quorum met`;
    this.syncAuthorities(
      `${this.orgsSatisfied()} of 3 organizations · each satisfying its own internal quorum`,
      this.state.authorities?.footnote,
    );
    await this.beat(450);
  }

  // ══ Act 3 — the issuer is fully compromised ═════════════════════════════════
  private async actCompromisedIssuer() {
    this.orgs = [this.issuerOrg(), this.custodianOrg(), this.taOrg()];
    // Nothing here is clickable: the attacker cannot summon the other two companies, and the
    // presenter shouldn't be able to either.
    for (const o of this.orgs) o.canApprove = false;
    this.proposed = 0;
    this.pendingTx = hash32();

    this.patch({
      act: 3,
      actLabel: 'Act 3 of 3 · issuer fully compromised',
      verdict: 'idle',
      proof: null,
      evidence: null,
      execution: null,
      coordination: null,
      action: null,
      policy: null,
      authorities: null,
      approvals: null,
      supply: this.supply({ ageLabel: 'counted 4 min ago' }),
      banner: {
        kind: 'danger',
        text: 'Meridian’s issuance identity is fully compromised. The attacker holds all three officer keys and is signing valid, correctly-formed requests.',
      },
      explainer: {
        pain: 'This is how every infinite-mint exploit actually happens: the attacker has valid issuer credentials.',
        certenMove: 'Valid issuer credentials satisfy one seat of three. The custodian and transfer agent are separate companies the attacker does not control.',
        buyerTakeaway: 'Total compromise of one party buys the attacker nothing but an alert.',
        integrationHint: 'Refusal records are notifications — the attempt is the alarm.',
      },
      presenterCue: {
        say: 'Now assume the worst. The attacker owns the issuer completely — every officer key, valid signatures, correct API calls.',
        waitFor: 'the attacker submitting',
      },
      controls: [ctl('act:31', 'Attacker mints $2,000,000,000 to their own address', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'Issuer identity compromised',
    });
    await this.beat(900);
  }

  /** Act 3, second beat — the attacker submits, and the other two companies refuse. */
  private async actCompromisedSubmit() {
    this.proposed = MINT_ATTACK;
    const decision = this.evaluateMint(MINT_ATTACK, false);
    const custody = this.constraint(decision.constraints, 'within-attested-custody');
    const registry = this.constraint(decision.constraints, 'registered-destination');

    this.patch({
      verdict: 'blocked',
      busy: true,
      action: {
        verb: 'Issue tokens',
        summary: `${usd(MINT_ATTACK)} of XAUV → ${ATTACKER_ADDR}`,
        principal: TOKEN,
        initiator: 'Attacker · stolen keys',
        amountLabel: usd(MINT_ATTACK),
        target: ATTACKER_ADDR,
        note: 'attacker address',
        icon: 'mint',
        destructive: true,
      },
      policy: {
        humanReadable: decision.humanReadable,
        rule: decision.rule,
        trigger: 'supply-changing action',
        threshold: decision.threshold,
        required: decision.required,
        constraints: decision.constraints,
      },
      supply: this.supply({ breach: custody?.detail, ageLabel: 'counted 4 min ago' }),
      execution: { status: 'idle', headline: 'Supply cannot change without a proof from all three companies' },
      message: 'Attacker submitting with valid issuer credentials…',
    });
    this.syncAuthorities('3 of 3 organizations · each satisfying its own internal quorum');
    await this.beat(700);

    // The compromised issuer satisfies its own seat instantly — all three officer keys are the
    // attacker's. This is meant to look alarming: the issuer column goes fully signed.
    const issuer = this.orgs[0];
    for (const s of issuer.signers) {
      s.signed = true;
      this.syncAuthorities('3 of 3 organizations · each satisfying its own internal quorum');
      await this.beat(420);
    }
    issuer.status = 'compromised';
    issuer.canApprove = false;
    issuer.note = 'All 3 officer keys signed — the attacker holds every one of them.';
    issuer.filmNote = 'signed with stolen keys';
    this.syncAuthorities('1 of 3 organizations · issuer seat filled by stolen keys');
    await this.beat(900);

    // Certen routes the request to the other two companies automatically — they are in the
    // authority set, so the attacker cannot route around them. Both refuse on their own policy.
    const custodian = this.orgs[1];
    custodian.status = 'refused';
    custodian.canApprove = false;
    custodian.note = custody?.detail ?? 'mint exceeds attested custody';
    custodian.filmNote = 'not enough gold';
    this.syncAuthorities('1 of 3 organizations · custodian refused');
    await this.beat(800);

    const ta = this.orgs[2];
    ta.status = 'refused';
    ta.canApprove = false;
    ta.note = registry?.detail ?? 'destination is not a holder of record';
    ta.filmNote = 'unknown recipient';
    this.syncAuthorities(
      '1 of 3 organizations · no proof can form',
      'The attacker owns one company. The other two are not reachable from a stolen issuer key.',
    );
    await this.beat(700);

    this.patch({
      busy: false,
      coordination: {
        pendingTxHash: this.pendingTx,
        notificationsSent: 3,
        inboxItems: [
          { role: 'issuer', status: 'compromised', channel: 'operator', timestampLabel: 'just now' },
          { role: 'custodian', status: 'missing', channel: 'webhook', timestampLabel: 'refused' },
          { role: 'transfer-agent', status: 'missing', channel: 'webhook', timestampLabel: 'refused' },
        ],
        coordinationSummary:
          'The refusal was broadcast to Helvetia, Ledgerline and Meridian’s security contact. The attacker’s first attempt is the alert.',
      },
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'A cryptographically signed record that this mint was attempted with valid issuer credentials and refused. Even a $1 mint would need Helvetia and Ledgerline — the attacker controls neither.',
        auditFacts: [
          `Intent: mint ${usd(MINT_ATTACK)} to ${ATTACKER_ADDR}`,
          'Issuer seat satisfied — 3 of 3 stolen officer keys',
          'Custodian refused · exceeds attested custody',
          'Transfer agent refused · destination not a holder of record',
          '1 of 3 organizations — no proof generated',
          'Token contract has no admin mint path',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        accountAddress: ISSUANCE_ACCOUNT,
        shortLabel: 'Supply unchanged',
        headline: 'Issuance refused — no proof exists, so supply did not change',
        detail: 'Total compromise of the issuer produced zero tokens and three notifications.',
      },
      banner: {
        kind: 'danger',
        text: 'The attacker held every issuer key and signed a perfectly valid request. It bought one seat of three. Supply is unchanged — and Helvetia, Ledgerline and Meridian security were all notified.',
      },
      explainer: {
        pain: 'Every infinite-mint exploit in this market began with an attacker holding valid issuer credentials.',
        certenMove: 'CERTEN made those credentials one third of an authority set spanning three companies, bound to physical custody.',
        buyerTakeaway: 'To move supply you must compromise three firms in three jurisdictions and still satisfy the vault arithmetic.',
        integrationHint: 'The refusal record is the audit artifact and the alert at the same time.',
      },
      presenterCue: {
        say: 'Valid credentials. Correct signatures. One seat of three. No proof, no tokens — and two other companies just found out.',
        waitFor: 'REFUSED',
        objection: 'What if they compromise the custodian too?',
        answer: 'Then they still need the transfer agent, and they still need the gold to exist. The reserve constraint is not a signature — no amount of key theft satisfies it.',
      },
      controls: [ctl('reset', 'Reset scenario', 'reset')],
      message: 'REFUSED — 1 of 3 organizations, no proof, no supply change',
    });
  }

  // ── approvals: one click satisfies one organization's internal quorum ───────
  async approve(role: string): Promise<void> {
    const org = this.orgs.find((o) => o.role === role);
    if (!org || org.status === 'satisfied' || org.status === 'refused') return;

    const breachedAct2 = this.state.act === 2;

    this.patch({ busy: true });

    // Fill the org's own key page, signature by signature — this is its internal hierarchy,
    // not a shared list.
    const needed = org.threshold;
    let signedCount = 0;
    for (const s of org.signers) {
      if (signedCount >= needed) break;

      // The custodian's Reserve Policy Engine is not a rubber stamp: it signs only if custody
      // covers the mint. In Act 2 the human above it signs and the engine refuses.
      const isReserveEngine = org.role === 'custodian' && s.label === 'Automatic gold check';
      if (isReserveEngine && breachedAct2) {
        await this.beat(700);
        org.status = 'refused';
        org.canApprove = false;
        org.note = `Refused — ${this.constraint(this.state.policy?.constraints, 'within-attested-custody')?.detail ?? 'mint exceeds attested custody'}`;
        org.filmNote = 'not enough gold';
        this.syncAuthorities('2 of 3 organizations · custodian refused');
        await this.finishAct2Refusal();
        return;
      }

      s.signed = true;
      signedCount += 1;
      this.syncAuthorities(this.state.authorities?.headline ?? '3 of 3 organizations');
      await this.beat(430);
    }

    org.status = 'satisfied';
    org.canApprove = false;
    org.note = `${org.threshold} of ${org.total} internal quorum met`;
    const done = this.orgsSatisfied();
    this.syncAuthorities(
      done === 3 ? '3 of 3 organizations · authority set complete' : `${done} of 3 organizations · each satisfying its own internal quorum`,
      this.state.authorities?.footnote,
    );
    this.patch({ busy: false, message: `${org.org} authorized (${org.threshold} of ${org.total} internal quorum)` });

    if (done < 3) return;
    await this.executeMint();
  }

  /** Act 2's terminal state — two companies approved, the custodian's arithmetic did not. */
  private async finishAct2Refusal() {
    const custody = this.constraint(this.state.policy?.constraints, 'within-attested-custody');
    this.patch({
      busy: false,
      verdict: 'blocked',
      evidence: blockedRecord({
        title: 'Refusal Record',
        plainMeaning:
          'The mint was refused because the tokens it would create are not backed by anything in the vault. Two of the three companies had already approved it.',
        auditFacts: [
          `Intent: mint ${usd(MINT_FATFINGER)} of XAUV`,
          `Attested custody: ${usd(this.attested)}`,
          custody?.detail ?? 'exceeds attested custody',
          'Issuer approved · transfer agent approved · custodian refused',
          'No proof generated — supply unchanged',
        ],
        pendingTxHash: this.pendingTx,
      }),
      execution: {
        status: 'never',
        accountAddress: ISSUANCE_ACCOUNT,
        shortLabel: 'Not backed',
        headline: 'Issuance refused — the tokens would not have been backed',
        detail: 'Caught by arithmetic bound to signed custody, not by someone reading the number.',
      },
      banner: {
        kind: 'danger',
        text: 'Six extra zeros. The issuer’s own officers approved it and so did the transfer agent — the custodian’s reserve policy refused it automatically.',
      },
      explainer: {
        pain: 'This is the class of error behind the $300 trillion stablecoin mint: a hand-keyed number that every downstream system accepted.',
        certenMove: 'CERTEN evaluated the mint against signed custody before any proof could form, so the excess was refused on arithmetic.',
        buyerTakeaway: 'Reserve backing becomes a precondition of minting rather than something reconciled later.',
        integrationHint: 'Your custodian’s attestation feed becomes a policy input.',
      },
      controls: [ctl('act:3', 'Now the issuer is completely compromised', 'danger', { emphasis: true }), ctl('reset', 'Reset', 'reset')],
      message: 'REFUSED — mint exceeds attested custody',
    });
  }

  /** All three companies satisfied — mint the supply against the proof. */
  private async executeMint() {
    const minted = this.proposed;
    const before = this.outstanding;
    await this.reveal(
      async () => {
        this.patch({
          execution: {
            status: 'executing',
            headline: `Minting ${usd(minted)} of XAUV…`,
            legs: [{ chain: 'base-sepolia', label: 'Base Sepolia · XAUV token', status: 'executing' }],
          },
        });
        await this.beat(900);
        const out = await execAssetMint('base-sepolia', BigInt(minted), 'XAUV supply');
        this.outstanding += minted;
        this.proposed = 0;
        this.patch({
          supply: this.supply(),
          execution: {
            status: 'done',
            accountAddress: ISSUANCE_ACCOUNT,
            shortLabel: `${usd(minted)} issued`,
            headline: `${usd(minted)} of XAUV issued — supply ${usd(before)} → ${usd(this.outstanding)}`,
            detail: `Still inside attested custody of ${usd(this.attested)}.`,
            verified: out.verified,
            verifiedDetail: `Transfer(0x0 → ${FUND_ADDR}, ${usd(minted)}) matched — proof-of-effect`,
            explorerUrl: out.explorerUrl,
            legs: [
              { chain: 'base-sepolia', label: out.chainLabel + ' · XAUV token', status: 'done', txHash: out.txHash, explorerUrl: out.explorerUrl },
            ],
          },
          explainer: {
            pain: 'Without CERTEN this mint would have been one company’s internal approval.',
            certenMove: 'Three companies each met their own quorum and the custody arithmetic closed — only then did supply change.',
            buyerTakeaway: 'Every token in circulation carries a proof of who authorized it and what backs it.',
            integrationHint: 'The proof bundle attaches to your transfer-agent record and your audit file.',
          },
        });
      },
      { governanceLevel: 'G2', validators: 7 },
    );

    const ev = this.state.evidence as EvidenceInfo | null;
    if (ev && ev.kind === 'execution-proof') {
      this.patch({
        evidence: {
          ...ev,
          plainMeaning:
            'A proof that Meridian, Helvetia and Ledgerline each authorized this exact mint through their own key hierarchies — and that the supply actually created matches what they approved.',
          auditFacts: [
            'Meridian 2 of 3 · Helvetia 2 of 2 · Ledgerline 2 of 2',
            `Bound to mint(${FUND_ADDR}, ${usd(minted)})`,
            `Within attested custody ${usd(this.attested)}`,
            `${ev.attestations} of ${ev.validators} validators attested`,
          ],
        },
      });
    }

    this.patch({
      presenterCue: {
        say: 'Three companies, three independent hierarchies, one proof. The tokens exist because that proof exists.',
        waitFor: 'EXECUTED',
      },
      controls: [
        ctl('act:2', 'Now an operator makes a mistake', 'primary', { emphasis: true }),
        ctl('reset', 'Reset', 'reset'),
      ],
    });
  }
}
