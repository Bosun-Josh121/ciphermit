//! Allowance policy guest program.
//!
//! Proves: a spend is within a hidden per-period cap and the spender
//! controls the vault (knows the vault_secret). All private inputs stay
//! off-chain; only the commitments are published to the journal.
//!
//! Private inputs (via env::read in order):
//!   vault_secret: [u8; 32]     — proves vault ownership
//!   spend_amount: u64          — amount to spend (stroops or smallest unit)
//!   prior_spent:  u64          — running total already spent this period
//!   period_cap:   u64          — hidden maximum allowed per period
//!   period_id:    u64          — period identifier (e.g. month number)
//!   nullifier_secret: [u8; 32] — entropy for nullifier uniqueness
//!   blinding:     [u8; 32]     — entropy for new_spent_commitment hiding
//!   action_context: [u8; 32]   — sha256(owner_pubkey || to_pubkey || amount_le)
//!                                precomputed by prover; vault recomputes to verify
//!
//! Public journal (committed in order, 128 bytes total):
//!   policy_commitment:    [u8; 32]  sha256(period_cap || period_id || vault_secret)
//!   new_spent_commitment: [u8; 32]  sha256(new_spent || period_id || blinding)
//!   nullifier:            [u8; 32]  sha256(nullifier_secret || action_context)
//!   action_context:       [u8; 32]  passed through; vault verifies it matches tx params

#![no_main]
risc0_zkvm::guest::entry!(main);

use risc0_zkvm::guest::env;
use sha2::{Digest, Sha256};

fn main() {
    let vault_secret: [u8; 32] = env::read();
    let spend_amount: u64 = env::read();
    let prior_spent: u64 = env::read();
    let period_cap: u64 = env::read();
    let period_id: u64 = env::read();
    let nullifier_secret: [u8; 32] = env::read();
    let blinding: [u8; 32] = env::read();
    let action_context: [u8; 32] = env::read();

    assert!(spend_amount > 0, "spend_amount must be positive");

    let remaining = period_cap
        .checked_sub(prior_spent)
        .expect("prior_spent exceeds period_cap");
    assert!(spend_amount <= remaining, "spend exceeds remaining allowance");

    let new_spent = prior_spent + spend_amount;

    let policy_commitment: [u8; 32] = Sha256::new()
        .chain_update(period_cap.to_le_bytes())
        .chain_update(period_id.to_le_bytes())
        .chain_update(vault_secret)
        .finalize()
        .into();

    let new_spent_commitment: [u8; 32] = Sha256::new()
        .chain_update(new_spent.to_le_bytes())
        .chain_update(period_id.to_le_bytes())
        .chain_update(blinding)
        .finalize()
        .into();

    let nullifier: [u8; 32] = Sha256::new()
        .chain_update(nullifier_secret)
        .chain_update(action_context)
        .finalize()
        .into();

    env::commit_slice(&policy_commitment);
    env::commit_slice(&new_spent_commitment);
    env::commit_slice(&nullifier);
    env::commit_slice(&action_context);
}
