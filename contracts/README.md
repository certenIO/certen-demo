# Certen Demo Contracts

Two tiny contracts that give the Certen demos a real on-chain execution rail:

| Contract | Used by | What it proves |
| --- | --- | --- |
| `DemoUpgradeable` | Demo 1 — *Stop the $10M Mistake* | A production upgrade (`setVersion`) can only execute when the Certen-authorized account calls it, i.e. only after the full multi-sig quorum signed. |
| `DemoTreasury` | Demo 3 — *Cross-Chain Treasury Protection* | Funds (`withdraw`) only move when Certen has gathered the quorum and produced a proof. |

Both contracts gate every state change behind a single `authorizer` address. In a live
demo that address is the account **Certen** controls; Certen flips it only after policy is
satisfied.

## 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

This installs `forge`, `cast`, and `anvil`. (On Windows, run the above under Git Bash / WSL,
or use the Windows installer from https://book.getfoundry.sh/getting-started/installation.)

Install forge-std (provides `forge-std/Script.sol`) into `lib/`:

```bash
cd contracts
forge install foundry-rs/forge-std
```

## 2. Build

```bash
forge build
```

Compiles with `solc 0.8.24` (see `foundry.toml`).

## 3. Deploy to Base Sepolia

Set the required environment variables:

```bash
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"   # or your provider URL
export PRIVATE_KEY="0xabc...your deployer key"
# Optional: the account Certen will use to authorize upgrades / withdrawals.
# Defaults to the deployer (msg.sender) if unset.
export CERTEN_AUTHORIZER="0x...certen anchor account"
```

Then run the deploy script:

```bash
forge script script/DeployDemo.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --private-key $PRIVATE_KEY
```

The script prints the deployed addresses, e.g.:

```
DemoUpgradeable deployed at:  0x....
DemoTreasury deployed at:     0x....
```

> Arbitrum Sepolia works the same way — set `ARBITRUM_SEPOLIA_RPC_URL` and use
> `--rpc-url arbitrum_sepolia`.

## 4. Wire into the demos

Copy the printed addresses into the demos' `.env` so the seed manifest captures them and the
orchestrator's live execution leg can call `setVersion` / `withdraw`:

```bash
CONTRACT_DEMO_UPGRADEABLE=0x....
CONTRACT_DEMO_TREASURY=0x....
```

Then `npm run seed` writes them into `scenario-manifest.json`.
