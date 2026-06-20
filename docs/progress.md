# Ciphermit — Milestones

| Date | Milestone |
|------|-----------|
| 2026-06-19 | RISC Zero verifier stack deployed to Stellar testnet (Timelock, Router, Groth16 Verifier, Emergency Stop) |
| 2026-06-19 | Ciphermit Vault deployed; all 4 policy slots initialized |
| 2026-06-20 | All 4 RISC-V guest programs compiled (allowance, delegation, compliance, allowlist) |
| 2026-06-20 | Real image_ids extracted and set on vault contract |
| 2026-06-20 | Prover HTTP service built and running (`/health` verified) |
| 2026-06-20 | E2E: vault opened, 1 XLM deposited, proof requested on testnet |

## Deployed contracts (Stellar testnet)

| Contract | Address |
|----------|---------|
| RISC Zero Timelock | `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX` |
| RISC Zero Router | `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2` |
| Groth16 Verifier | `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE` |
| Emergency Stop | `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH` |
| Ciphermit Vault | `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C` |

## Guest program image_ids

| Policy | image_id |
|--------|---------|
| allowance | `7a8db61b647a4861346733919e6f604feb7e2cf250e6fdf8ec6396394b05ecfa` |
| delegation | `172c2bfb05ced3b9e3dd95f83bc7129fd5e0fe4ed53b0b1e9c8f700c1c87dd7f` |
| compliance | `e9783a82b6b4bea78556d464463187dcd036a4da460148b1c7c6aa7d1f92f5c6` |
| allowlist | `9a1cf7769ce02e480bebff12a9dd517c77d97ebec369a57b60f6814929115e07` |
