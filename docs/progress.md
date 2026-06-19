# Ciphermit — Build Progress Log

Living record of deployed addresses, version pins, test results, and phase checkpoints.
Updated by the agent after each phase. Never fabricated — only real results are recorded here.

---

## Version Pins (confirmed)

| Component | Version | Confirmed |
|---|---|---|
| `soroban-sdk` | 25.1.0 | ✓ matches Nethermind risc0-interface |
| `risc0-zkvm` | ^3.0 | ✓ matches verifier parameters.json v3.0.0 |
| `risc0-ethereum-contracts` | ^3.0 | ✓ seal encoding |
| `rust-toolchain` | stable | ✓ Nethermind verifier rust-toolchain.toml |
| Stellar CLI | 26.0.0 | ✓ installed |
| Node.js | v23.8.0 | ✓ installed |
| Docker | 28.1.1 | ✓ installed |
| Architecture | x86_64 | ✓ — can generate Groth16 proofs locally |
| rzup / RISC Zero toolchain | NOT YET INSTALLED | ⚠ USER ACTION REQUIRED |

---

## Phase Checkpoints

### Phase 1 — Repo scaffold + brand tokens
- **Status:** ✓ COMPLETE
- `docs/brand.md` created with full token system
- Workspace builds with stub vault contract
- `.gitignore` correct; `.local/` not tracked

### Phase 2 — Verifier deployment
- **Status:** ✓ COMPLETE (2026-06-19)
- Deployed own full RISC Zero verifier stack to Stellar testnet
- Timelock (delay=0): `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX`
- Router: `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2`
- Groth16 Verifier: `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE`
- Emergency Stop: `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH`
- Verifier selector `73c457ba` registered with router (`unroutable=false` ✓)

### Phase 3 — Allowance guest program
- **Status:** ⏳ PENDING — awaiting RISC Zero toolchain
- `image_id`: TBD after proof generation

### Phase 4 — Vault contract
- **Status:** ⏳ PENDING
- Vault contract address: TBD
- USDC token address: TBD — [USER ACTION REQUIRED to confirm testnet USDC SAC]

### Phase 5 — Prover service
- **Status:** ⏳ PENDING

### Phase 6 — End-to-end spine checkpoint
- **Status:** ⏳ PENDING
- First real tx hash: TBD
- Negative paths: TBD

### Phase 7 — All policies
- Delegation: ⏳ PENDING
- Allowlist: ⏳ PENDING
- Compliance: ⏳ PENDING
- View-key audit: ⏳ PENDING

### Phase 8 — Frontend
- **Status:** ⏳ PENDING
- Frontend URL: TBD

---

## Deployed Addresses

| Contract | Address | Deployed |
|---|---|---|
| Timelock Controller (testnet) | CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX | 2026-06-19 |
| RISC Zero Router (testnet) | CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2 | 2026-06-19 |
| Groth16 Verifier / Emergency Stop (testnet) | CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE | 2026-06-19 |
| Ciphermit Vault (testnet) | TBD | - |
| Testnet USDC SAC | CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA | verified 2026-06-19 |

---

## Real Transaction Hashes

_(Only real hashes recorded here — never fabricated)_

| Phase | Description | Tx Hash | Explorer |
|---|---|---|---|
| Phase 6 | E2E spine — allowance spend | TBD | - |

---

## USER ACTION REQUIRED Items

1. **rzup install** — RISC Zero toolchain not yet installed:
   ```bash
   curl -L https://risczero.com/install | bash
   rzup install
   rzup install risc0-groth16   # needed for Groth16 proof generation
   ```
   Then confirm: `rzup --version`

2. **ciphermit-dev identity** — confirm funded testnet identity exists:
   ```bash
   stellar keys address ciphermit-dev
   ```
   If not: `stellar keys generate ciphermit-dev --network testnet && stellar keys fund ciphermit-dev --network testnet`

3. **Testnet USDC SAC** — confirm or decide:
   - Option A: look up the live testnet USDC SAC address at https://lab.stellar.org
   - Option B: for the demo, issue your own clearly-labeled mock stablecoin
   Record the chosen address in this file.
