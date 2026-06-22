# Ciphermit

> Multi-policy spending vault on Stellar, enforced by RISC Zero zero-knowledge proofs.

Ciphermit lets you lock funds in an on-chain vault with **private spending rules**. Every spend generates a ZK proof attesting to the rule without revealing it. The Stellar network sees only "authorized" — your caps, delegates, allowlists, and sanctions lists stay hidden.

---

## The problem

On-chain spending rules expose your business logic. A treasury policy that limits daily transfers to a delegate, or a compliance list that rejects sanctioned addresses, is visible to everyone the moment it hits the ledger. Privacy requires trust, and trust is a vulnerability.

## The solution

Ciphermit stores only cryptographic commitments on-chain. The actual rules — period caps, delegate identities, allowlists — live with the user and never touch the ledger. A RISC Zero zkVM guest program verifies the rule in zero-knowledge and produces a Groth16 proof. The vault checks the proof on-chain via the Nethermind RISC Zero verifier stack, then releases funds. No rule reveals. No replay.

---

## Policies

| Policy | What authorizes a spend | What stays private |
|--------|------------------------|--------------------|
| **Allowance** | Remaining balance in the current period | Cap amount, cumulative history |
| **Delegation** | Delegate holds valid sub-cap | Delegate identity, sub-cap value |
| **Compliance** | Recipient not on sanctions list | The list itself and its threshold |
| **Allowlist** | Recipient is in approved set | Every member of the set |

---

## Architecture

```
  Browser
  Freighter / xBull wallet
       │
       │  buildTx → sign → submit
       ▼
  ┌─────────────────────────────────────────┐
  │  Ciphermit Vault  (Soroban / wasm32)    │
  │  spend(vault_id, owner, to, amount,     │
  │        seal, journal_digest, ...)       │
  │                                         │
  │  1. recompute action_context            │
  │  2. assert journal matches              │
  │  3. check nullifier not used            │
  │  4. call router.verify(...)  ───────────┼──▶ RISC Zero Router (Soroban)
  │  5. transfer funds                      │         │
  └─────────────────────────────────────────┘         ▼
                                               Groth16 Verifier (Soroban)
                                               on-chain pairing check ✓

       ↑ proof generated off-chain by:

  ┌─────────────────────────────────────────┐
  │  Prover Service  (Axum + risc0-zkvm)    │
  │  POST /prove/allowance                  │
  │  POST /prove/delegation                 │
  │  POST /prove/compliance                 │
  │  POST /prove/allowlist                  │
  └─────────────────────────────────────────┘
       │
       │  ExecutorEnv → prove → encode_seal (Groth16)
       ▼
  RISC Zero Guest Programs (riscv32im ELF)
  allowance · delegation · compliance · allowlist
```

### Journal layout (128 bytes, public)

Every proof binds to an exact transaction via a 128-byte public journal:

```
bytes  0–31   policy_commitment     sha256(period_cap_le ‖ period_id_le ‖ vault_secret)
bytes 32–63   new_spent_commitment  sha256(new_spent_le  ‖ period_id_le ‖ blinding)
bytes 64–95   nullifier             sha256(nullifier_secret ‖ action_context)
bytes 96–127  action_context        sha256(sha256(owner) ‖ sha256(to) ‖ amount_u64_le)
```

The vault recomputes `action_context` from its call arguments and asserts it matches — binding each proof to a specific owner, recipient, and amount. Replaying the same proof against a different transaction is impossible.

---

## Deployed contracts (Stellar testnet)

| Contract | Address |
|----------|---------|
| RISC Zero Timelock | `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX` |
| RISC Zero Router | `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2` |
| Groth16 Verifier | `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE` |
| Emergency Stop | `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH` |
| Ciphermit Vault | `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C` |

Verifier selector `73c457ba` · RISC Zero `3.0.5` · soroban-sdk `25.1.0` · Protocol 26

---

## Repository layout

```
contracts/vault/        Soroban vault contract (wasm32v1-none)
guest/
  methods/guest/src/    RISC Zero guest programs — 4 policies (riscv32im ELF)
  host/src/             Prover HTTP service (Axum)
verifier/               Nethermind RISC Zero verifier stack + deployment.toml
web/src/                React frontend (Vite + Tailwind v4 + framer-motion)
scripts/
  deploy-vault.sh       Deploy + initialize vault
  set-image-ids.sh      Register guest ELF image_ids on-chain
  extract-image-ids.sh  Parse image_ids from risc0-build output
  e2e-demo.sh           Full spine test: open vault → deposit → prove → spend → replay check
docs/
  brand.md              Design system and token rules
  progress.md           Deployed addresses and milestones
  architecture.md       Detailed component design
```

---

## Running locally

**Prerequisites:** Rust stable, `stellar` CLI ≥ 26, Node 18+, Docker (x86\_64, for Groth16).

### 1. RISC Zero toolchain (one-time)

```bash
curl -L https://risczero.com/install | bash && source ~/.bashrc
rzup install
rzup install rust           # RISC-V cross-compilation toolchain
rzup install risc0-groth16  # Groth16 Docker backend
```

### 2. Build and start the prover

```bash
cd guest && cargo build --release   # ~40 min first run; compiles 4 guest ELFs + prover binary
cd ..
RUST_LOG=info nohup ./guest/target/release/prover > prover.log 2>&1 &
curl http://localhost:3001/health    # → ok
```

> **RAM requirement:** Groth16 compression needs ~4 GB free. On constrained machines, run the prover in a GitHub Codespace (8 GB) and forward port 3001 as public, then set `PROVER_URL=<codespace-url>`.

### 3. Frontend

```bash
cd web
cp .env.example .env          # set VITE_PROVER_URL if using remote prover
npm install && npm run dev    # → http://localhost:5173
```

### 4. End-to-end test

```bash
# Prover must be running first
PROVER_URL=http://localhost:3001 ./scripts/e2e-demo.sh
# Opens vault · deposits 1 XLM · generates Groth16 proof · submits spend · tests replay rejection
```

---

## Security properties

| Property | Mechanism |
|----------|-----------|
| Policy privacy | Rule parameters committed via sha256; never stored on-chain |
| Anti-replay | Nullifiers stored in persistent Soroban storage; single-use |
| Transaction binding | `action_context` ties each proof to exact owner + recipient + amount |
| Tamper-proof verification | Groth16 pairing check executes on-chain; forged proofs cannot pass |
| Non-custodial proving | Prover service generates proofs but never holds keys or funds |

> **Hackathon prototype — not audited. Do not use with real assets.**

---

## License

Apache-2.0
