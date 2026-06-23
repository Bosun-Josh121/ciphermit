# Ciphermit — Milestones

| Date | Milestone |
|------|-----------|
| 2026-06-19 | RISC Zero verifier stack deployed to Stellar testnet (Timelock, Router, Groth16 Verifier, Emergency Stop) |
| 2026-06-19 | Ciphermit Vault deployed; all 4 policy slots initialized |
| 2026-06-20 | All 4 RISC-V guest programs compiled (allowance, delegation, compliance, allowlist) |
| 2026-06-20 | Real image_ids extracted and set on vault contract |
| 2026-06-20 | Prover HTTP service built and running (`/health` verified) |
| 2026-06-23 | **E2E COMPLETE**: real Groth16 proof verified on-chain, spend authorized, replay rejected |

## Deployed contracts (Stellar testnet)

| Contract | Address |
|----------|---------|
| RISC Zero Timelock | `CDN3XR4USW2STQ2VH635W3YNX3YOODTBIR3VPDE7FYQKTKWSKCBZFARX` |
| RISC Zero Router | `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2` |
| Groth16 Verifier | `CC6XUVRVDUA3XS57AUUN4RWM2S7FPFQ6KTZSW6HTEU4ZOFNF3ORNUXUE` |
| Emergency Stop | `CBYTHZE3GMCLSYNO27RSMFB5IGESEGUVWDYA3PY3WPCPXLX35BRDIXGH` |
| Ciphermit Vault | `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C` |

## Guest program image_ids (live on-chain)

| Policy | image_id |
|--------|---------|
| allowance | `fdf6c03b01de4e98c577277a31db63e9c72620a5e81b9f0182e532339b15773e` |
| delegation | `7f5340671b865d3d70cf07427b2327fa99478121ee4498297154874c9fe87472` |
| compliance | `1029f6fab21490935a68acc8a941f4e3226d68460bb20b02c7047e855e8db17a` |
| allowlist | `3c32e15c0993b4137b3728ae4c9d6fa7cf04d40933671a06ede6775eebdd3e39` |

## Verified transactions

| Event | Tx Hash | Explorer |
|-------|---------|---------|
| Phase 6 — allowance spend (vault 5, 0.1 XLM) | `e31ef4055450f11e858f5712d29c3cd8c2aa37d239ce4cc48a1837d844a66d85` | [view](https://stellar.expert/explorer/testnet/tx/e31ef4055450f11e858f5712d29c3cd8c2aa37d239ce4cc48a1837d844a66d85) |
| Replay rejection | confirmed — nullifier already used → InvalidAction | — |
