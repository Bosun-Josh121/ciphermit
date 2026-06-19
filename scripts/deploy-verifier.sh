#!/usr/bin/env bash
# Deploy the Nethermind RISC Zero verifier stack to Stellar testnet.
# Must be run from the repo root. Requires: stellar-cli, ciphermit-dev identity funded.
# Verifier source lives in verifier/ (copied from NethermindEth/stellar-risc0-verifier).

set -euo pipefail

NETWORK="testnet"
ACCOUNT="ciphermit-dev"
VERIFIER_DIR="$(dirname "$0")/../verifier"

if [ ! -d "$VERIFIER_DIR" ]; then
  echo "ERROR: verifier/ directory not found. Copy NethermindEth/stellar-risc0-verifier into verifier/ first."
  exit 1
fi

cd "$VERIFIER_DIR"

echo "==> Deploying RISC Zero Router..."
./scripts/manage.sh deploy-router -n "$NETWORK" -a "$ACCOUNT" --min-delay 0

echo "==> Deploying Groth16 Verifier..."
./scripts/manage.sh deploy-verifier -n "$NETWORK" -a "$ACCOUNT"

SELECTOR=$(python3 ./scripts/toml_helper.py read deployment.toml "chains.stellar-testnet.verifiers.0.selector")
echo "==> Registering verifier selector: $SELECTOR"
./scripts/manage.sh schedule-add-verifier -n "$NETWORK" -a "$ACCOUNT" --selector "$SELECTOR"
./scripts/manage.sh execute-add-verifier  -n "$NETWORK" -a "$ACCOUNT" --selector "$SELECTOR"

echo "==> Verifier stack status:"
./scripts/manage.sh status -n "$NETWORK"

ROUTER=$(python3 ./scripts/toml_helper.py read deployment.toml "chains.stellar-testnet.router")
echo ""
echo "✓ Router deployed: $ROUTER"
echo "  Record this in docs/progress.md and .local/addresses.md"
