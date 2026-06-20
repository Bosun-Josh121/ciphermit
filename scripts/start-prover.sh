#!/usr/bin/env bash
# Start the Ciphermit prover service.
# Prerequisites: rzup installed, risc0-groth16 installed, Docker running.
# Usage: ./scripts/start-prover.sh [port]
set -euo pipefail

PORT=${1:-3001}

echo "=== Checking prerequisites ==="
command -v rzup >/dev/null || { echo "ERROR: rzup not found. Run: curl -L https://risczero.com/install | bash && source ~/.bashrc"; exit 1; }
export PATH="$PATH:$HOME/.risc0/bin"
rzup show | grep -q risc0-groth16 || { echo "ERROR: risc0-groth16 not installed. Run: rzup install risc0-groth16"; exit 1; }
command -v docker >/dev/null && docker info >/dev/null 2>&1 || { echo "WARNING: Docker not running — Groth16 proofs will fail"; }

echo "=== Building prover service ==="
cd "$(dirname "$0")/../guest"
cargo build --release

echo "=== Starting prover on port $PORT ==="
RUST_LOG=info PROVER_PORT="$PORT" ./target/release/prover
