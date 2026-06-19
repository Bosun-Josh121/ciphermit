//! Compliance policy guest program.
//!
//! Proves: the recipient is NOT in a sanctions deny-list (sorted-leaf non-membership
//! in a Merkle set) AND the amount is within a threshold (or a higher-amount
//! accreditation membership is held).
//!
//! Private inputs:
//!   vault_secret:      [u8; 32]
//!   recipient:         [u8; 32]   — recipient public key
//!   deny_list_root:    [u8; 32]   — Merkle root of sorted deny list
//!   nonmem_proof_lo:   [u8; 32]   — lower neighbor leaf in sorted set
//!   nonmem_proof_hi:   [u8; 32]   — upper neighbor leaf in sorted set
//!   nonmem_path_lo:    Vec<([u8;32], bool)>  — path from lo to root
//!   nonmem_path_hi:    Vec<([u8;32], bool)>  — path from hi to root
//!   spend_amount:      u64
//!   threshold:         u64        — max amount without accreditation
//!   accredited:        bool       — does spender hold accreditation?
//!   accred_proof:      Vec<[u8;32]>  — Merkle proof if accredited
//!   accred_path_bits:  Vec<bool>
//!   accred_root:       [u8; 32]
//!   period_id:         u64
//!   nullifier_secret:  [u8; 32]
//!   action_context:    [u8; 32]
//!
//! Public journal (96 bytes):
//!   compliance_commitment: [u8; 32]  sha256(deny_list_root || threshold || vault_secret)
//!   nullifier:             [u8; 32]
//!   action_context:        [u8; 32]

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

fn verify_merkle_path(leaf: [u8; 32], path: &[([u8; 32], bool)], expected_root: &[u8; 32]) {
    let mut current = leaf;
    for (sibling, go_right) in path {
        current = if *go_right {
            sha256_pair(sibling, &current)
        } else {
            sha256_pair(&current, sibling)
        };
    }
    assert_eq!(&current, expected_root, "Merkle path root mismatch");
}

fn main() {
    let vault_secret: [u8; 32] = env::read();
    let recipient: [u8; 32] = env::read();
    let deny_list_root: [u8; 32] = env::read();

    // Non-membership proof: lo < recipient < hi, both lo and hi in tree
    let lo_leaf: [u8; 32] = env::read();
    let hi_leaf: [u8; 32] = env::read();
    let lo_path_len: u32 = env::read();
    let lo_path: Vec<([u8; 32], bool)> = (0..lo_path_len)
        .map(|_| (env::read::<[u8; 32]>(), env::read::<bool>()))
        .collect();
    let hi_path_len: u32 = env::read();
    let hi_path: Vec<([u8; 32], bool)> = (0..hi_path_len)
        .map(|_| (env::read::<[u8; 32]>(), env::read::<bool>()))
        .collect();

    let spend_amount: u64 = env::read();
    let threshold: u64 = env::read();
    let accredited: bool = env::read();

    let accred_root: [u8; 32] = env::read();
    let accred_path_len: u32 = env::read();
    let accred_path: Vec<([u8; 32], bool)> = (0..accred_path_len)
        .map(|_| (env::read::<[u8; 32]>(), env::read::<bool>()))
        .collect();

    let nullifier_secret: [u8; 32] = env::read();
    let action_context: [u8; 32] = env::read();

    // Verify lo and hi are valid members of the deny list
    let lo_hashed: [u8; 32] = Sha256::new().chain_update(b"deny-leaf").chain_update(lo_leaf).finalize().into();
    let hi_hashed: [u8; 32] = Sha256::new().chain_update(b"deny-leaf").chain_update(hi_leaf).finalize().into();
    verify_merkle_path(lo_hashed, &lo_path, &deny_list_root);
    verify_merkle_path(hi_hashed, &hi_path, &deny_list_root);

    // Verify non-membership: lo < recipient < hi (lexicographic on sorted bytes)
    assert!(lo_leaf < recipient, "recipient not above lower neighbor");
    assert!(recipient < hi_leaf, "recipient not below upper neighbor");

    // Verify amount: under threshold, or accredited member
    assert!(spend_amount > 0, "spend_amount must be positive");
    if spend_amount > threshold {
        assert!(accredited, "amount exceeds threshold and spender is not accredited");
        let accred_leaf: [u8; 32] = Sha256::new()
            .chain_update(b"accred-leaf")
            .chain_update(vault_secret)
            .finalize()
            .into();
        verify_merkle_path(accred_leaf, &accred_path, &accred_root);
    }

    let compliance_commitment: [u8; 32] = Sha256::new()
        .chain_update(deny_list_root)
        .chain_update(threshold.to_le_bytes())
        .chain_update(vault_secret)
        .finalize()
        .into();

    let nullifier: [u8; 32] = Sha256::new()
        .chain_update(nullifier_secret)
        .chain_update(action_context)
        .finalize()
        .into();

    env::commit_slice(&compliance_commitment);
    env::commit_slice(&nullifier);
    env::commit_slice(&action_context);
}
