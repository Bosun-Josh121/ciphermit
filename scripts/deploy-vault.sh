#!/usr/bin/env bash
# Deploy the Ciphermit Vault contract to Stellar testnet.
# Usage: ./scripts/deploy-vault.sh <ROUTER_ID> <IMAGE_ID_HEX> <USDC_SAC>
# All three are required — never hardcode; find them in docs/progress.md.

set -euo pipefail

NETWORK="testnet"
ACCOUNT="ciphermit-dev"
ADMIN=$(stellar keys address "$ACCOUNT")

ROUTER_ID="${1:?Usage: $0 <ROUTER_ID> <IMAGE_ID_HEX> <USDC_SAC>}"
IMAGE_ID_HEX="${2:?}"
USDC_SAC="${3:?}"

echo "==> Building vault contract..."
stellar contract build

WASM_PATH="target/wasm32-unknown-unknown/release/ciphermit_vault.wasm"
if [ ! -f "$WASM_PATH" ]; then
  echo "ERROR: WASM not found at $WASM_PATH"
  exit 1
fi

echo "==> Deploying vault contract..."
VAULT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$ACCOUNT" \
  --network "$NETWORK")

echo "==> Initializing vault contract..."
stellar contract invoke \
  --source "$ACCOUNT" \
  --network "$NETWORK" \
  --id "$VAULT_ID" \
  -- initialize \
  --admin "$ADMIN" \
  --router "$ROUTER_ID" \
  --usdc_token "$USDC_SAC"

echo ""
echo "✓ Vault deployed: $VAULT_ID"
echo "  Router:   $ROUTER_ID"
echo "  USDC:     $USDC_SAC"
echo "  Record in docs/progress.md and .local/addresses.md"
