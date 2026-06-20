//! Policy-specific input types and proof runners.
//!
//! Each runner builds the ExecutorEnv, calls prove_with_opts(Groth16),
//! and returns a ProofResponse.

use anyhow::{Result, bail};
use risc0_zkvm::{ExecutorEnv, ProverOpts, default_prover};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::build_proof_response;

// ─── Allowance ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
pub struct AllowanceInput {
    pub vault_secret_hex: String,
    pub spend_amount: u64,
    pub prior_spent: u64,
    pub period_cap: u64,
    pub period_id: u64,
    pub nullifier_secret_hex: String,
    pub blinding_hex: String,
    /// sha256(owner_pubkey_bytes || to_pubkey_bytes || amount_u64_le)
    pub action_context_hex: String,
}

pub fn run_allowance_proof(input: AllowanceInput) -> Result<super::ProofResponse> {
    let vault_secret = decode32(&input.vault_secret_hex, "vault_secret")?;
    let nullifier_secret = decode32(&input.nullifier_secret_hex, "nullifier_secret")?;
    let blinding = decode32(&input.blinding_hex, "blinding")?;
    let action_context = decode32(&input.action_context_hex, "action_context")?;

    if input.spend_amount == 0 {
        bail!("spend_amount must be positive");
    }
    if input.prior_spent + input.spend_amount > input.period_cap {
        bail!("spend exceeds remaining allowance");
    }

    let env = ExecutorEnv::builder()
        .write(&vault_secret)?
        .write(&input.spend_amount)?
        .write(&input.prior_spent)?
        .write(&input.period_cap)?
        .write(&input.period_id)?
        .write(&nullifier_secret)?
        .write(&blinding)?
        .write(&action_context)?
        .build()?;

    let prover = default_prover();
    let prove_info = prover.prove_with_opts(
        env,
        methods::ALLOWANCE_ELF,
        &ProverOpts::groth16(),
    )?;
    let journal_bytes = prove_info.receipt.journal.bytes.clone();
    build_proof_response(prove_info.receipt, methods::ALLOWANCE_ID, &journal_bytes)
}

// ─── Delegation ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
pub struct DelegationInput {
    pub vault_secret_hex: String,
    pub delegate_secret_hex: String,
    pub delegate_pubkey_hex: String,
    pub merkle_proof_hex: Vec<String>,
    pub path_bits: Vec<bool>,
    pub spend_amount: u64,
    pub prior_delegate_spent: u64,
    pub delegate_cap: u64,
    pub period_id: u64,
    pub nullifier_secret_hex: String,
    pub blinding_hex: String,
    pub action_context_hex: String,
}

pub fn run_delegation_proof(input: DelegationInput) -> Result<super::ProofResponse> {
    let vault_secret = decode32(&input.vault_secret_hex, "vault_secret")?;
    let delegate_secret = decode32(&input.delegate_secret_hex, "delegate_secret")?;
    let delegate_pubkey = decode32(&input.delegate_pubkey_hex, "delegate_pubkey")?;
    let nullifier_secret = decode32(&input.nullifier_secret_hex, "nullifier_secret")?;
    let blinding = decode32(&input.blinding_hex, "blinding")?;
    let action_context = decode32(&input.action_context_hex, "action_context")?;

    if input.merkle_proof_hex.len() != input.path_bits.len() {
        bail!("merkle_proof and path_bits length mismatch");
    }
    let proof_len = input.merkle_proof_hex.len() as u32;
    let merkle_proofs: Vec<[u8; 32]> = input.merkle_proof_hex.iter()
        .map(|h| decode32(h, "merkle_proof_node"))
        .collect::<Result<_>>()?;

    let mut builder = ExecutorEnv::builder();
    builder
        .write(&vault_secret)?
        .write(&delegate_secret)?
        .write(&delegate_pubkey)?
        .write(&proof_len)?;
    for node in &merkle_proofs {
        builder.write(node)?;
    }
    for bit in &input.path_bits {
        builder.write(bit)?;
    }
    builder
        .write(&input.spend_amount)?
        .write(&input.prior_delegate_spent)?
        .write(&input.delegate_cap)?
        .write(&input.period_id)?
        .write(&nullifier_secret)?
        .write(&blinding)?
        .write(&action_context)?;

    let env = builder.build()?;
    let prover = default_prover();
    let prove_info = prover.prove_with_opts(
        env,
        methods::DELEGATION_ELF,
        &ProverOpts::groth16(),
    )?;
    let journal_bytes = prove_info.receipt.journal.bytes.clone();
    build_proof_response(prove_info.receipt, methods::DELEGATION_ID, &journal_bytes)
}

// ─── Compliance ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
pub struct ComplianceInput {
    pub vault_secret_hex: String,
    pub recipient_hex: String,
    pub deny_list_root_hex: String,
    pub lo_leaf_hex: String,
    pub hi_leaf_hex: String,
    pub lo_path_hex: Vec<String>,
    pub lo_path_bits: Vec<bool>,
    pub hi_path_hex: Vec<String>,
    pub hi_path_bits: Vec<bool>,
    pub spend_amount: u64,
    pub threshold: u64,
    pub accredited: bool,
    pub accred_root_hex: String,
    pub accred_path_hex: Vec<String>,
    pub accred_path_bits: Vec<bool>,
    pub nullifier_secret_hex: String,
    pub action_context_hex: String,
}

pub fn run_compliance_proof(input: ComplianceInput) -> Result<super::ProofResponse> {
    let vault_secret = decode32(&input.vault_secret_hex, "vault_secret")?;
    let recipient = decode32(&input.recipient_hex, "recipient")?;
    let deny_list_root = decode32(&input.deny_list_root_hex, "deny_list_root")?;
    let lo_leaf = decode32(&input.lo_leaf_hex, "lo_leaf")?;
    let hi_leaf = decode32(&input.hi_leaf_hex, "hi_leaf")?;
    let accred_root = decode32(&input.accred_root_hex, "accred_root")?;
    let nullifier_secret = decode32(&input.nullifier_secret_hex, "nullifier_secret")?;
    let action_context = decode32(&input.action_context_hex, "action_context")?;

    let lo_nodes: Vec<[u8; 32]> = input.lo_path_hex.iter().map(|h| decode32(h, "lo_path")).collect::<Result<_>>()?;
    let hi_nodes: Vec<[u8; 32]> = input.hi_path_hex.iter().map(|h| decode32(h, "hi_path")).collect::<Result<_>>()?;
    let accred_nodes: Vec<[u8; 32]> = input.accred_path_hex.iter().map(|h| decode32(h, "accred_path")).collect::<Result<_>>()?;

    let mut builder = ExecutorEnv::builder();
    builder
        .write(&vault_secret)?
        .write(&recipient)?
        .write(&deny_list_root)?
        .write(&lo_leaf)?
        .write(&hi_leaf)?
        .write(&(lo_nodes.len() as u32))?;
    for (node, bit) in lo_nodes.iter().zip(&input.lo_path_bits) {
        builder.write(node)?.write(bit)?;
    }
    builder.write(&(hi_nodes.len() as u32))?;
    for (node, bit) in hi_nodes.iter().zip(&input.hi_path_bits) {
        builder.write(node)?.write(bit)?;
    }
    builder
        .write(&input.spend_amount)?
        .write(&input.threshold)?
        .write(&input.accredited)?
        .write(&accred_root)?
        .write(&(accred_nodes.len() as u32))?;
    for (node, bit) in accred_nodes.iter().zip(&input.accred_path_bits) {
        builder.write(node)?.write(bit)?;
    }
    builder.write(&nullifier_secret)?.write(&action_context)?;

    let env = builder.build()?;
    let prover = default_prover();
    let prove_info = prover.prove_with_opts(
        env,
        methods::COMPLIANCE_ELF,
        &ProverOpts::groth16(),
    )?;
    let journal_bytes = prove_info.receipt.journal.bytes.clone();
    build_proof_response(prove_info.receipt, methods::COMPLIANCE_ID, &journal_bytes)
}

// ─── Allowlist ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize)]
pub struct AllowlistInput {
    pub vault_secret_hex: String,
    pub recipient_hex: String,
    pub set_root_hex: String,
    pub proof_hex: Vec<String>,
    pub path_bits: Vec<bool>,
    pub spend_amount: u64,
    pub prior_spent: u64,
    pub period_cap: u64,
    pub period_id: u64,
    pub nullifier_secret_hex: String,
    pub blinding_hex: String,
    pub action_context_hex: String,
}

pub fn run_allowlist_proof(input: AllowlistInput) -> Result<super::ProofResponse> {
    let vault_secret = decode32(&input.vault_secret_hex, "vault_secret")?;
    let recipient = decode32(&input.recipient_hex, "recipient")?;
    let set_root = decode32(&input.set_root_hex, "set_root")?;
    let nullifier_secret = decode32(&input.nullifier_secret_hex, "nullifier_secret")?;
    let blinding = decode32(&input.blinding_hex, "blinding")?;
    let action_context = decode32(&input.action_context_hex, "action_context")?;

    let proof_nodes: Vec<[u8; 32]> = input.proof_hex.iter().map(|h| decode32(h, "proof_node")).collect::<Result<_>>()?;
    let proof_len = proof_nodes.len() as u32;

    let mut builder = ExecutorEnv::builder();
    builder
        .write(&vault_secret)?
        .write(&recipient)?
        .write(&set_root)?
        .write(&proof_len)?;
    for node in &proof_nodes {
        builder.write(node)?;
    }
    for bit in &input.path_bits {
        builder.write(bit)?;
    }
    builder
        .write(&input.spend_amount)?
        .write(&input.prior_spent)?
        .write(&input.period_cap)?
        .write(&input.period_id)?
        .write(&nullifier_secret)?
        .write(&blinding)?
        .write(&action_context)?;

    let env = builder.build()?;
    let prover = default_prover();
    let prove_info = prover.prove_with_opts(
        env,
        methods::ALLOWLIST_ELF,
        &ProverOpts::groth16(),
    )?;
    let journal_bytes = prove_info.receipt.journal.bytes.clone();
    build_proof_response(prove_info.receipt, methods::ALLOWLIST_ID, &journal_bytes)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn decode32(hex_str: &str, field: &str) -> Result<[u8; 32]> {
    let bytes = hex::decode(hex_str)
        .map_err(|e| anyhow::anyhow!("invalid hex for {field}: {e}"))?;
    if bytes.len() != 32 {
        bail!("{field} must be 32 bytes, got {}", bytes.len());
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

/// Compute action_context from spend params.
/// action_context = sha256(owner_pubkey_32 || to_pubkey_32 || amount_u64_le)
pub fn compute_action_context(owner: &[u8; 32], to: &[u8; 32], amount: u64) -> [u8; 32] {
    Sha256::new()
        .chain_update(owner)
        .chain_update(to)
        .chain_update(amount.to_le_bytes())
        .finalize()
        .into()
}
