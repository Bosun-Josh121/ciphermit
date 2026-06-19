//! Allowlist (merchant/category) policy guest program.
//!
//! Proves: the recipient address is a member of an approved set (Merkle
//! inclusion), without revealing the set or which member was selected.
//!
//! Private inputs:
//!   vault_secret:    [u8; 32]
//!   recipient:       [u8; 32]   — must be a member of the approved set
//!   set_root:        [u8; 32]   — Merkle root of the allowlist
//!   proof:           Vec<[u8;32]>  — Merkle inclusion proof
//!   path_bits:       Vec<bool>
//!   spend_amount:    u64
//!   prior_spent:     u64
//!   period_cap:      u64
//!   period_id:       u64
//!   nullifier_secret: [u8; 32]
//!   blinding:        [u8; 32]
//!   action_context:  [u8; 32]
//!
//! Public journal (128 bytes):
//!   allowlist_commitment: [u8; 32]  sha256(set_root || vault_secret)
//!   new_spent_commitment: [u8; 32]
//!   nullifier:            [u8; 32]
//!   action_context:       [u8; 32]

#![no_main]
risc0_zkvm::guest::entry!(main);

use risc0_zkvm::guest::env;
use sha2::{Digest, Sha256};

fn sha256_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    Sha256::new()
        .chain_update(left)
        .chain_update(right)
        .finalize()
        .into()
}

fn main() {
    let vault_secret: [u8; 32] = env::read();
    let recipient: [u8; 32] = env::read();
    let set_root: [u8; 32] = env::read();
    let proof_len: u32 = env::read();
    let proof: Vec<[u8; 32]> = (0..proof_len).map(|_| env::read::<[u8; 32]>()).collect();
    let path_bits: Vec<bool> = (0..proof_len).map(|_| env::read::<bool>()).collect();
    let spend_amount: u64 = env::read();
    let prior_spent: u64 = env::read();
    let period_cap: u64 = env::read();
    let period_id: u64 = env::read();
    let nullifier_secret: [u8; 32] = env::read();
    let blinding: [u8; 32] = env::read();
    let action_context: [u8; 32] = env::read();

    // Verify recipient is in the allowlist (Merkle membership)
    let leaf: [u8; 32] = Sha256::new()
        .chain_update(b"allowlist-leaf")
        .chain_update(recipient)
        .finalize()
        .into();
    let mut current = leaf;
    for (sibling, &go_right) in proof.iter().zip(path_bits.iter()) {
        current = if go_right {
            sha256_pair(sibling, &current)
        } else {
            sha256_pair(&current, sibling)
        };
    }
    assert_eq!(current, set_root, "recipient not in allowlist");

    // Enforce spending budget
    assert!(spend_amount > 0, "spend_amount must be positive");
    let remaining = period_cap
        .checked_sub(prior_spent)
        .expect("prior_spent exceeds period_cap");
    assert!(spend_amount <= remaining, "spend exceeds remaining allowance");

    let new_spent = prior_spent + spend_amount;

    let allowlist_commitment: [u8; 32] = Sha256::new()
        .chain_update(set_root)
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

    env::commit_slice(&allowlist_commitment);
    env::commit_slice(&new_spent_commitment);
    env::commit_slice(&nullifier);
    env::commit_slice(&action_context);
}
