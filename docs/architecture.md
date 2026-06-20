# Ciphermit Architecture

## Overview

Ciphermit is a multi-policy spending vault on Stellar. The vault releases USDC only when shown a zero-knowledge proof that a spend satisfies a policy — policy parameters, amounts, and history stay private on-chain.

## Three Layers

### 1. Guest Programs (RISC Zero, off-chain execution)

Rust programs that run inside the RISC Zero zkVM. Each policy is one guest:

| Guest | File | What it proves |
|---|---|---|
| Allowance | `guest/src/bin/allowance.rs` | Spend ≤ remaining budget in hidden period cap |
| Delegation | `guest/src/bin/delegation.rs` | Caller is an authorized delegate with remaining sub-cap |
| Compliance | `guest/src/bin/compliance.rs` | Recipient not in deny-list; amount within threshold |
| Allowlist | `guest/src/bin/allowlist.rs` | Recipient is a member of a hidden approval set (Merkle) |

Each guest reads private inputs via `env::read()` and commits public outputs via `env::commit()`. The committed journal is what the vault contract reasons about.

### 2. Prover Service (off-chain, `prover/`)

A Rust HTTP service that:
- Accepts spend parameters (private)
- Builds guest inputs and computes commitments
- Proves with `ProverOpts::groth16()` on x86_64 + Docker
- Returns `seal`, `journal_digest`, commitments, and nullifier as hex JSON

The prover holds no keys and no funds. It only generates proofs. The user's wallet signs the actual on-chain transaction.

**Platform note:** Groth16 proof generation requires x86_64 + Docker. If the client is arm64, the prover service must run on an x86_64 VM and its URL is configured via `VITE_PROVER_URL`.

### 3. Vault Contract (Soroban, on-chain)

`contracts/vault/src/lib.rs` — the policy + application layer.

Storage per vault:
- `admin`, `router`, `image_id` (fixed per policy type), `usdc_token`
- `owner`, `policy_commitment` (hash of hidden policy params)
- `spent_commitment` (running hidden total, updated each spend)
- `period_id`, `balance`, `used_nullifiers` (anti-replay set)

Key invariants enforced on every `spend()`:
1. `policy_commitment` matches stored value
2. `action_context` binds `(owner, to, amount)` — prevents param substitution
3. `nullifier` is not in `used_nullifiers` — prevents replay
4. `router.verify(seal, image_id, journal_digest)` passes — cryptographic guarantee
5. `image_id` is always the stored, deploy-time value — never caller-supplied

## Data Flow

```
User input
  │  (spend_amount, recipient, policy params)
  ▼
Prover Service
  │  builds guest inputs, generates Groth16 proof
  │  outputs: seal, journal_digest, policy_commitment,
  │           new_spent_commitment, nullifier, action_context
  ▼
Frontend / Wallet
  │  signs tx calling vault.spend(...)
  ▼
Vault Contract
  │  1. require_auth(owner)
  │  2. check policy_commitment == stored
  │  3. recompute action_context; check match
  │  4. check nullifier unused
  │  5. router.verify(seal, image_id, journal_digest)  ← ZK proof check
  │  6. mark nullifier used
  │  7. update spent_commitment
  │  8. transfer USDC to recipient
  ▼
Stellar Ledger
     emit spend_authorized(amount)  ← NO policy/identity leakage
```

## Trust Model

**Trustless (enforced by cryptography + the Stellar ledger):**
- USDC custody: held by the vault contract, released only on verified proof
- Policy enforcement: the ZK proof guarantees the guest logic ran correctly
- Anti-replay: nullifiers + action_context binding make replays and substitution attacks impossible
- Spend authorization: the owner's wallet must sign every spend tx

**Trust-assumed (honest-but-available):**
- Prover service: if unavailable, spends are blocked (liveness dependency, not security dependency). A malicious prover cannot forge a valid proof — it can only withhold proving.
- Policy issuer: the entity that sets up the vault's initial policy commitment is trusted to set it correctly

**Decentralization roadmap:**
- Prover service can become a decentralized proving market (e.g., Bonsai network or self-hosted)
- Policy issuance can be governed by multisig or DAO

## Version Pins

| Component | Version | Source |
|---|---|---|
| `soroban-sdk` | 25.1.0 | [crates.io](https://crates.io/crates/soroban-sdk) |
| `risc0-zkvm` | ^3.0 | Matches Nethermind verifier parameters.json v3.0.0 |
| `risc0-ethereum-contracts` | ^3.0 | Seal encoding |
| `rust-toolchain` | stable | Required by RISC Zero 3.x |
| Stellar CLI | 26.0.0 | Protocol 26 |

## Contract Addresses (Testnet)

| Contract | Address | Deployed |
|---|---|---|
| RISC Zero Timelock | `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX` | 2026-06-19 |
| RISC Zero Router | `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2` | 2026-06-19 |
| Groth16 Verifier | `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE` | 2026-06-19 |
| Emergency Stop | `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH` | 2026-06-19 |
| Ciphermit Vault | `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C` | 2026-06-19 |
| Demo Token (XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | pre-existing |

Verifier selector: `73c457ba` · RISC Zero version: `3.0.0`
