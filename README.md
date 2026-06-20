# Ciphermit

> Multi-policy spending vault on Stellar, enforced by RISC Zero zero-knowledge proofs.

Ciphermit lets you lock funds in an on-chain vault with private spending rules. Every spend generates a ZK proof. The Stellar network sees only "authorized" — your caps, limits, delegates, and allowlists stay hidden.

---

## Policies

| Policy | What stays private |
|--------|-------------------|
| **Allowance** | Per-period cap and cumulative spend history |
| **Delegation** | Delegate identity and their sub-cap |
| **Compliance** | Sanctions check without revealing the list or threshold |
| **Allowlist** | Set of approved recipients without revealing the set |

---

## Architecture

```
Browser (React + Tailwind v4)
  │  sign with Freighter / xBull
  ▼
Ciphermit Vault (Soroban)          ← verifies proof before releasing funds
  │  verify(seal, image_id, journal_digest)
  ▼
RISC Zero Router (Soroban)         ← Nethermind verifier stack
  ▼
Groth16 Verifier (Soroban)         ← on-chain pairing check

            ↑ proof built off-chain by:

Prover Service (Axum + risc0-zkvm) ← runs locally; holds no keys
  ▼
RISC Zero Guest Programs (RISC-V)  ← allowance / delegation / compliance / allowlist
```

### Proof format

Every proof produces a 128-byte public journal bound to the exact transaction:

```
[0 –31]  policy_commitment     sha256(period_cap_le || period_id_le || vault_secret)
[32–63]  new_spent_commitment  sha256(new_spent_le || period_id_le || blinding)
[64–95]  nullifier             sha256(nullifier_secret || action_context)
[96–127] action_context        sha256(sha256(owner) || sha256(to) || amount_u64_le)
```

The vault recomputes `action_context` from its call arguments and asserts it matches the journal — binding the proof to the exact owner, recipient, and amount.

---

## Deployed contracts (Stellar testnet)

| Contract | Address |
|----------|---------|
| RISC Zero Timelock | `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX` |
| RISC Zero Router | `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2` |
| Groth16 Verifier | `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE` |
| Emergency Stop | `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH` |
| Ciphermit Vault | `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C` |

Verifier selector `73c457ba` · RISC Zero `3.0.0` · soroban-sdk `25.1.0`

---

## Repository layout

```
contracts/vault/    Soroban vault contract (wasm32)
guest/
  methods/          RISC Zero guest programs — 4 policy ELFs (riscv32im)
  host/             Prover HTTP service (Axum)
verifier/           Nethermind RISC Zero verifier stack + deployment.toml
web/                React frontend (Vite + Tailwind v4 + framer-motion)
scripts/            deploy-vault.sh  set-image-ids.sh  e2e.sh
docs/               architecture.md  brand.md  progress.md
```

---

## Running locally

**Prerequisites:** Rust stable, `stellar` CLI, Node 18+, Docker (x86_64 for Groth16).

### Prover service

```bash
# Install RISC Zero toolchain (one-time, x86_64 + Docker required for Groth16)
curl -L https://risczero.com/install | bash
rzup install
rzup install rust           # RISC-V cross-compilation toolchain
rzup install risc0-groth16  # Groth16 proving backend

cd guest
cargo build --release   # compiles 4 guest ELFs, then the prover binary

cd host
RUST_LOG=info cargo run --release
# → http://localhost:3001/health

# After build, extract image_ids and register them:
cd ..  # back to project root
./scripts/extract-image-ids.sh          # prints ALLOWANCE_ID=... etc.
# add the IDs to .local/addresses.md then:
./scripts/set-image-ids.sh <VAULT_ID>
```

### Frontend

```bash
cd web
cp .env.example .env
# set VITE_VAULT_CONTRACT_ID after deploying
npm install && npm run dev
```

### Deploy vault (one-time)

```bash
stellar contract build --package ciphermit-vault
./scripts/deploy-vault.sh
# then after image_ids are extracted:
./scripts/extract-image-ids.sh          # outputs ALLOWANCE_ID=<hex> etc.
./scripts/set-image-ids.sh <VAULT_ID>   # sets all 4 policies
```

### End-to-end spine test

```bash
# With the prover running on :3001:
./scripts/e2e-demo.sh [RECIPIENT_ADDRESS]
# Opens a vault, deposits 1 XLM, generates a real Groth16 proof,
# executes the spend, and verifies replay is rejected.
```

---

## Security properties

- **Policy privacy** — caps and rule parameters are committed via sha256; never stored in plaintext.
- **Anti-replay** — nullifiers are stored in persistent Soroban storage; each can be consumed once.
- **Binding** — `action_context` ties each proof to a specific owner, recipient, and amount.
- **Tamper-proof** — Groth16 pairing check happens on-chain; a forged proof cannot pass.
- **Non-custodial** — the prover service generates proofs but never holds keys or funds.
- **Hackathon prototype** — not audited; do not use with real assets.

---

## License

Apache-2.0
