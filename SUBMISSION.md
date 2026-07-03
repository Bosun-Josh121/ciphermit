# Ciphermit: private, provable spending rules on Stellar

- **Live app:** https://ciphermit.vercel.app
- **Code:** https://github.com/Bosun-Josh121/ciphermit

## The problem

Public blockchains make everything visible, and that includes your financial
rules. Any spending limit, approved-payee list, delegated budget, or compliance
policy you enforce on-chain is readable by anyone: competitors, counterparties,
and the public. Teams are stuck choosing between two bad options. They can
enforce controls transparently on-chain and leak sensitive business logic, or
they can keep the rules private by trusting an off-chain, centralized system,
which throws away the trustlessness they came to a blockchain for.

Ciphermit removes that trade-off. Your rule is enforced automatically on-chain,
but the rule itself never appears on-chain. Only a cryptographic commitment and
a zero-knowledge proof are published.

## What it is

Ciphermit is a spending vault on Stellar (Soroban) governed by zero-knowledge
proofs generated with the RISC Zero zkVM. You lock funds in a vault and commit
a private policy as a hash. When you spend, a proof shows the payment obeys that
hidden policy, the contract verifies the proof, and only then are funds
released. Four policy types share one engine: a private spending cap, an
approved-recipient allowlist, delegate sub-budgets, and compliance screening.

## How a spend works

The heavy cryptography runs on a prover service, not in the browser (a RISC Zero
Groth16 proof needs gigabytes of RAM and is not browser-feasible). The browser
does the light work: it builds the witness and any Merkle proof, then submits
the final transaction. The private inputs go to the prover, the proof comes
back, and the rule never touches the chain.

The flow, step by step:

1. Your browser builds the witness (and a Merkle proof for set-based policies). The rule stays on your side.
2. The prover service runs the policy program in the RISC Zero zkVM and compresses the result to a Groth16 proof, returning the seal, the journal, and the program image ID.
3. Your browser signs and submits `spend()` with the seal, the commitments, the nullifier, and the action context.
4. The vault contract checks owner auth, checks the nullifier has not been used, rebuilds and matches the journal digest, then calls the RISC Zero verifier to check the proof.
5. Only if the proof verifies are the funds released. If any check fails, nothing moves. The proof is what authorizes the transfer.

## The policy engine: four policies, one verifier

Each policy is a separate program (a "guest") compiled for the RISC Zero zkVM.
The vault stores one expected program identity (image ID) per policy type, so a
proof only passes if it came from the exact program the contract expects.

| Policy | What it proves privately | Real-world use |
|---|---|---|
| **Allowance** | A spend is within a hidden per-period cap that refills each window | Give an employee a wallet capped at 2,000 XLM/month; the limit is enforced but competitors and vendors cannot see it |
| **Allowlist** | The recipient is a member of an approved set (Merkle membership), without revealing the set | A payroll or supplier wallet that a stolen key cannot redirect, with the approved list kept private |
| **Delegation** | The spender is a delegate in a private set and the spend is within that delegate's hidden sub-cap | A DAO treasury that gives each working group its own secret monthly budget |
| **Compliance** | The recipient is not on a deny-list (sorted-set non-membership) and the amount is under a threshold or accredited | A regulated fintech proving payouts skip sanctioned addresses without publishing its sanctions list |

**Allowance**, **Allowlist**, and **Delegation** are wired end to end and
verified on-chain. **Compliance** has a working guest program and prover
endpoint, and is the next policy to wire through the UI.

## Under the hood: the cryptographic mechanisms

A few primitives do the real work, and they are worth calling out because they
are what make the privacy and the safety hold together.

**Commitments hide the rule.** A policy is never sent on-chain. Instead the
vault stores a SHA-256 commitment. For an allowance vault that is
`sha256(cap || vault_secret)`. For an allowlist it is
`sha256(merkle_root || vault_secret)`. The guest recomputes the same commitment
inside the proof, so the contract can check the proof matches the vault without
ever learning the cap or the list.

**Merkle trees hide sets.** Allowlist, delegation, and compliance commit a set
(approved recipients, delegate keys, or a deny-list) as a Merkle root. The
browser builds the tree and generates an inclusion proof (or, for compliance, a
sorted-set non-inclusion proof), and the guest verifies membership against the
root without revealing which leaf was used. The browser's hashing matches the
guest byte for byte (leaf tagging, node ordering, path bits), and each policy's
encoding was verified against the real prover before any UI was wired.

**Nullifiers stop replay.** Every spend derives a one-time nullifier
`sha256(nullifier_secret || action_context)`. The contract records used
nullifiers and rejects any repeat, so a valid proof cannot be submitted twice.

**Action-context binds the proof to the exact transfer.** The proof commits to
`sha256(owner || recipient || amount)`, and the contract recomputes it from the
real transaction parameters. This prevents swapping the recipient or amount
after the proof is made.

**Image ID pins the program.** The `spend` function never accepts an image ID
from the caller. The vault holds the expected image ID per policy in contract
storage and passes it to the verifier, so a spend can only succeed with a proof
from the exact guest program the admin configured.

## Rolling, time-based caps

Allowance caps are not a one-time budget. You pick a reset window at vault
creation (1 minute, 1 hour, 1 day, 30 days). The period id is derived from wall
clock time, `floor(now / window)`, and spending is tracked per period, so the
cap automatically refills when the window rolls over. The Authorize screen shows
a live indicator, for example "5.00 XLM left this period, resets in 0:12". The
rule commitment is period-independent in the guest, so the same vault verifies
across windows. This was rebuilt, the contract re-pointed at the new program,
and the whole flow verified on testnet in a fresh (non-first) period.

## Selective disclosure (Audit)

Because everything is private, an auditor sometimes needs to verify one payment.
The Audit tool does selective disclosure: pick a single past transaction, enter
the vault view key, and reveal only that one transaction's details (owner,
recipient, amount, time). Every other transaction stays hidden. This is the
"prove one payment was compliant without opening the whole book" story.

## Proof evidence, in the app

Real ZK activity should be visible, not taken on trust.
After a spend, the app shows the actual proof: the Groth16 seal, the guest image
ID, the journal digest, the nullifier, and the policy commitment, each labeled
with what it is, plus a link to the on-chain RISC Zero verifier contract and the
spend transaction. The proof is stored with the activity record, so it can be
re-inspected any time through the Audit reveal without regenerating it.

## The application

- **Overview**: total escrowed, active vaults, authorized spends, recent activity.
- **Vaults**: open, fund, and act on policy vaults. Opening a vault runs approve, `open_vault`, and `deposit`.
- **Vault detail**: tabbed view with policy summary, spend history, delegates, and the cryptographic config.
- **Authorize**: the spend flow. Two panels, controls on the left and a live proof panel on the right with a progress timer, then the proof evidence.
- **Delegates**: define and manage private, capped sub-budgets for a delegation vault.
- **Audit**: view-key selective disclosure described above.
- **Activity**: a full session ledger of every operation with real transaction links.
- **Wallets**: Freighter, xBull, and Albedo (Albedo is web-based, so anyone can connect without installing an extension).

## Tech stack

- **Smart contracts**: Rust on Soroban (Stellar). A vault contract plus a RISC Zero verifier router and Groth16 verifier (Nethermind-style verifier system).
- **Zero-knowledge**: RISC Zero zkVM, four guest programs, Groth16 proofs.
- **Prover service**: Rust and Axum, hosted, generating Groth16 proofs over HTTP.
- **Frontend**: Vite, React, TypeScript, Tailwind CSS, framer-motion, Stellar Wallets Kit, Stellar SDK.
- **Network**: Stellar testnet. XLM (as a Soroban asset contract) is the escrow token.

## What is live and verified on-chain

Every policy below was verified end to end on Stellar testnet (open the vault,
deposit, generate a real proof, submit the spend, funds released only after the
verifier accepted the proof):

- Vault contract: `CBHDNNIN76GWDVH3IGV43J2RM3DJSLN2VTTBOU3O5WITKIOSBQ4NDW7C`
- RISC Zero verifier router: `CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2`
- Allowance spend (rolling period): tx `092a7581f935a3bcd0d73c880118a8d5c449393e2e507e969caea5be5f1fca22`
- Allowlist spend: tx `2d8591e0b94b29f1460046e7974aa8695460799854264da05481a0f46f0c3e02`
- Delegation spend: tx `e03cd273c3919bd03dbed5c5f02fa25636a2fb3ae6c6c1b5c656ff10a176efff`

## Honest scope and what is next

- Three policies are fully wired and verified. Compliance is built at the guest and prover layer and is the next to wire through the UI.
- Proving runs on a hosted prover service, so the strong, true claim is that policies never touch the chain. A production build would run the prover locally or in a trusted enclave so the witness never leaves the user.
- Roadmap: bind the running spent-total to on-chain state for fully trustless cumulative caps, persist activity beyond a session, and turn the view key into a cryptographic disclosure capability.
