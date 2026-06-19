//! Delegation policy guest program.
//!
//! Proves: the caller is an authorized delegate of this vault (membership
//! in a Merkle set of delegate keys) and the spend is within the delegate's
//! hidden sub-cap. Neither the sub-cap nor the delegate set is revealed.
//!
//! Private inputs:
//!   vault_secret:        [u8; 32]  — vault owner identity
//!   delegate_secret:     [u8; 32]  — delegate's private secret (proves membership)
//!   delegate_pubkey:     [u8; 32]  — delegate's public identifier
//!   merkle_proof:        Vec<[u8;32]> — Merkle inclusion proof path
//!   merkle_path_bits:    Vec<bool>    — left/right flags for each proof element
//!   spend_amount:        u64
//!   prior_delegate_spent: u64       — delegate's running total
//!   delegate_cap:        u64        — delegate's hidden sub-cap
//!   period_id:           u64
//!   nullifier_secret:    [u8; 32]
//!   blinding:            [u8; 32]
//!   action_context:      [u8; 32]   — sha256(owner || to || amount)
//!
//! Public journal (128 bytes):
//!   delegate_set_commitment: [u8; 32]  sha256(merkle_root || vault_secret)
//!   new_delegate_spent_commitment: [u8; 32]
//!   nullifier: [u8; 32]
//!   action_context: [u8; 32]

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

fn merkle_root(leaf: [u8; 32], proof: &[[u8; 32]], path_bits: &[bool]) -> [u8; 32] {
    assert_eq!(proof.len(), path_bits.len(), "proof length mismatch");
    let mut current = leaf;
    for (sibling, &go_right) in proof.iter().zip(path_bits.iter()) {
        current = if go_right {
            sha256_pair(sibling, &current)
        } else {
            sha256_pair(&current, sibling)
        };
    }
    current
}

fn main() {
    let vault_secret: [u8; 32] = env::read();
    let delegate_secret: [u8; 32] = env::read();
    let delegate_pubkey: [u8; 32] = env::read();
    let proof_len: u32 = env::read();
    let merkle_proof: Vec<[u8; 32]> = (0..proof_len).map(|_| env::read::<[u8; 32]>()).collect();
    let path_bits: Vec<bool> = (0..proof_len).map(|_| env::read::<bool>()).collect();
    let spend_amount: u64 = env::read();
    let prior_delegate_spent: u64 = env::read();
    let delegate_cap: u64 = env::read();
    let period_id: u64 = env::read();
    let nullifier_secret: [u8; 32] = env::read();
    let blinding: [u8; 32] = env::read();
    let action_context: [u8; 32] = env::read();

    // Verify delegate_secret matches delegate_pubkey
    let computed_pubkey: [u8; 32] = Sha256::new()
        .chain_update(b"delegate-pubkey")
        .chain_update(delegate_secret)
        .finalize()
        .into();
    assert_eq!(computed_pubkey, delegate_pubkey, "delegate secret/pubkey mismatch");

    // Verify delegate is in the Merkle set
    let leaf: [u8; 32] = Sha256::new()
        .chain_update(b"delegate-leaf")
        .chain_update(delegate_pubkey)
        .finalize()
        .into();
    let root = merkle_root(leaf, &merkle_proof, &path_bits);

    assert!(spend_amount > 0, "spend_amount must be positive");
    let remaining = delegate_cap
        .checked_sub(prior_delegate_spent)
        .expect("prior exceeds cap");
    assert!(spend_amount <= remaining, "spend exceeds delegate cap");

    let new_delegate_spent = prior_delegate_spent + spend_amount;

    let delegate_set_commitment: [u8; 32] = Sha256::new()
        .chain_update(root)
        .chain_update(vault_secret)
        .finalize()
        .into();

    let new_delegate_spent_commitment: [u8; 32] = Sha256::new()
        .chain_update(new_delegate_spent.to_le_bytes())
        .chain_update(period_id.to_le_bytes())
        .chain_update(blinding)
        .finalize()
        .into();

    let nullifier: [u8; 32] = Sha256::new()
        .chain_update(nullifier_secret)
        .chain_update(action_context)
        .finalize()
        .into();

    env::commit_slice(&delegate_set_commitment);
    env::commit_slice(&new_delegate_spent_commitment);
    env::commit_slice(&nullifier);
    env::commit_slice(&action_context);
}
