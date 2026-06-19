#!/usr/bin/env bash
# Deploy + initialize the Ciphermit vault contract to Stellar testnet.
# Run from project root after `stellar contract build --package ciphermit-vault`
# Usage: ./scripts/deploy-vault.sh
set -euo pipefail

NETWORK=testnet
SOURCE=ciphermit-dev

ROUTER=CBI2UZ3K4HZW2Y3JK5DAXN2BVGCNFZTLUIOQV7JRGAOEMNA4DUZFF4O2
TOKEN=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC  # XLM native SAC
ADMIN=$(stellar keys address $SOURCE)

WASM=target/wasm32v1-none/release/ciphermit_vault.wasm
if [ ! -f "$WASM" ]; then
  echo "WASM not found at $WASM — run: stellar contract build --package ciphermit-vault"
  exit 1
fi

echo "=== Deploying Ciphermit Vault ==="
VAULT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  --alias ciphermit-vault)

echo "Vault deployed: $VAULT_ID"

echo "=== Initializing vault ==="
stellar contract invoke \
  --id "$VAULT_ID" \
  --source "$SOURCE" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN" \
  --router "$ROUTER" \
  --usdc_token "$TOKEN"

echo "=== Setting placeholder image_ids (update after Phase 3) ==="
# Placeholder: 32 zero bytes. Replace with real image_ids via scripts/set-image-ids.sh
ZERO_ID="0000000000000000000000000000000000000000000000000000000000000000"

for policy in allowance delegat comply allowlist; do
  stellar contract invoke \
    --id "$VAULT_ID" \
    --source "$SOURCE" \
    --network "$NETWORK" \
    -- set_image_id \
    --policy_type "$policy" \
    --image_id "$ZERO_ID"
  echo "  set_image_id $policy: ok (placeholder)"
done

echo ""
echo "=== VAULT DEPLOYED ==="
echo "VAULT_ID=$VAULT_ID"
echo ""
echo "Update .local/addresses.md and web/.env with this address."
echo "After Phase 3: run scripts/set-image-ids.sh with real image_ids."
