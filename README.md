# Ciphermit

> Private, programmable spending authority for shared and delegated money on Stellar.

Ciphermit is a **multi-policy spending vault** on Stellar. You deposit USDC into a vault. The vault releases funds **only when shown a zero-knowledge proof** that the spend satisfies a policy — and the policy, the amounts, and the spending history stay private. The public chain sees only "an authorized spend happened."

## Policies

| Policy | What it proves |
|---|---|
| **Allowance** | Spend is within a hidden per-period cap that auto-refreshes |
| **Delegation** | Authorized delegate spending within a hidden sub-cap |
| **Compliance** | Spend satisfies sanctions non-membership + threshold rules |
| **Allowlist** | Recipient is in an approved set (without revealing the set) |

Plus **selective-disclosure audit**: a view-key holder can reconstruct any single transaction. Private by default, auditable on authority.

## Architecture

```
   OFF-CHAIN                              ON-CHAIN (Soroban, Stellar testnet)
─────────────────  seal,              ──────────────────────────────────────
  Prover Service   image_id,            Ciphermit Vault Contract
  (Rust)         ──journal_digest──►    (Policy + Application)
                                        - holds USDC escrow
  runs the guest                        - stores policy commitments
─────────────────                       - anti-replay nullifiers
        │                               - calls router.verify()
─────────▼──────────                    - releases USDC on pass
  RISC Zero                             - CAP-0078 TTL state
  Guest Programs              ──────────────────────────────────────
  (Rust)                                        │ verify()
  - allowance                  ─────────────────▼──────────────────
  - delegation                   Nethermind RISC Zero Verifier
  - compliance                   Router  (deployed testnet)
  - allowlist              ──────────────────────────────────────
─────────────────
```

## Quick Start

> Full setup requires RISC Zero toolchain and Docker (x86_64 for proof generation). See [docs/architecture.md](docs/architecture.md) for the full build guide.

```bash
# Build contracts
stellar contract build

# Run contract tests
cargo test

# Start prover service
cd prover && cargo run

# Start frontend
cd web && npm install && npm run dev
```

## Deployed Contracts (Testnet)

| Contract | Address |
|---|---|
| RISC Zero Router | _(see docs/progress.md)_ |
| Ciphermit Vault | _(see docs/progress.md)_ |

## Security Notes

- Anti-replay enforced via nullifiers + action_context binding on every spend
- `image_id` is stored at deploy time — never caller-supplied
- Policy parameters become hidden commitments; the chain never sees cap values or histories
- Prover service is availability-trusted but not custody-trusted (holds no keys or funds)
- This is a hackathon prototype; not audited — do not use with real assets

## License

Apache-2.0
