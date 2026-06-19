//! Ciphermit Prover Service
//!
//! HTTP service that generates RISC Zero Groth16 proofs for Ciphermit vault policies.
//! The service holds no keys and no funds — it only generates proofs.
//! The user's wallet signs the actual on-chain spend transaction.
//!
//! POST /prove/allowance  -> ProofResponse
//! POST /prove/delegation -> ProofResponse
//! POST /prove/compliance -> ProofResponse
//! POST /prove/allowlist  -> ProofResponse
//! GET  /health           -> "ok"
//!
//! Requires x86_64 + Docker for Groth16 proof generation.

use std::net::SocketAddr;

use anyhow::Result;
use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{ExecutorEnv, ProverOpts, default_prover};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

mod policies;
use policies::{AllowanceInput, AllowlistInput, ComplianceInput, DelegationInput};

#[derive(Clone)]
struct AppState {}

#[derive(Serialize)]
struct ProofResponse {
    seal: String,
    image_id: String,
    journal_digest: String,
    policy_commitment: String,
    new_spent_commitment: String,
    nullifier: String,
    action_context: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "ciphermit_prover=info,axum=warn".to_string()),
        )
        .init();

    let state = AppState {};

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/prove/allowance", post(prove_allowance))
        .route("/prove/delegation", post(prove_delegation))
        .route("/prove/compliance", post(prove_compliance))
        .route("/prove/allowlist", post(prove_allowlist))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PROVER_PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()?;
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Ciphermit prover listening on {addr}");
    info!("Requires x86_64 + Docker for Groth16 proof generation");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> &'static str {
    "ok"
}

async fn prove_allowance(
    State(_state): State<AppState>,
    Json(input): Json<AllowanceInput>,
) -> Result<Json<ProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    tokio::task::spawn_blocking(move || policies::run_allowance_proof(input))
        .await
        .map_err(internal_err)?
        .map(Json)
        .map_err(proof_err)
}

async fn prove_delegation(
    State(_state): State<AppState>,
    Json(input): Json<DelegationInput>,
) -> Result<Json<ProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    tokio::task::spawn_blocking(move || policies::run_delegation_proof(input))
        .await
        .map_err(internal_err)?
        .map(Json)
        .map_err(proof_err)
}

async fn prove_compliance(
    State(_state): State<AppState>,
    Json(input): Json<ComplianceInput>,
) -> Result<Json<ProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    tokio::task::spawn_blocking(move || policies::run_compliance_proof(input))
        .await
        .map_err(internal_err)?
        .map(Json)
        .map_err(proof_err)
}

async fn prove_allowlist(
    State(_state): State<AppState>,
    Json(input): Json<AllowlistInput>,
) -> Result<Json<ProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    tokio::task::spawn_blocking(move || policies::run_allowlist_proof(input))
        .await
        .map_err(internal_err)?
        .map(Json)
        .map_err(proof_err)
}

fn internal_err(e: impl std::fmt::Display) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ErrorResponse { error: e.to_string() }),
    )
}

fn proof_err(e: anyhow::Error) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::UNPROCESSABLE_ENTITY,
        Json(ErrorResponse { error: e.to_string() }),
    )
}

pub fn build_proof_response(
    receipt: risc0_zkvm::Receipt,
    image_id: [u8; 32],
    journal_bytes: &[u8],
) -> Result<ProofResponse> {
    let seal = encode_seal(&receipt)?;
    let journal_digest: [u8; 32] = Sha256::digest(journal_bytes).into();

    // Parse the fixed-layout journal (4 × 32 bytes = 128 bytes)
    assert!(journal_bytes.len() >= 128, "journal too short");
    let policy_commitment = hex::encode(&journal_bytes[0..32]);
    let new_spent_commitment = hex::encode(&journal_bytes[32..64]);
    let nullifier = hex::encode(&journal_bytes[64..96]);
    let action_context = hex::encode(&journal_bytes[96..128]);

    Ok(ProofResponse {
        seal: hex::encode(seal),
        image_id: hex::encode(image_id),
        journal_digest: hex::encode(journal_digest),
        policy_commitment,
        new_spent_commitment,
        nullifier,
        action_context,
    })
}
