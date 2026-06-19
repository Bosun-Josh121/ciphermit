#!/usr/bin/env bash
# Update image_ids in vault contract after Phase 3 guest compilation.
# Usage: ./scripts/set-image-ids.sh <VAULT_ID> <ALLOWANCE_IMAGE_ID_HEX>
# Run from project root after building guest programs and extracting image_ids.
set -euo pipefail

NETWORK=testnet
SOURCE=ciphermit-dev

VAULT_ID="${1:?Usage: $0 <VAULT_ID> <ALLOWANCE_IMAGE_ID_HEX>}"
ALLOWANCE_ID="${2:?}"

stellar contract invoke \
  --id "$VAULT_ID" --source "$SOURCE" --network "$NETWORK" \
  -- set_image_id --policy_type allowance --image_id "$ALLOWANCE_ID"
echo "allowance image_id set: $ALLOWANCE_ID"

# Delegation, compliance, allowlist — add their image_ids here in Phase 7:
# stellar contract invoke ... -- set_image_id --policy_type delegat --image_id "$DELEGATION_ID"
# stellar contract invoke ... -- set_image_id --policy_type comply --image_id "$COMPLIANCE_ID"
# stellar contract invoke ... -- set_image_id --policy_type allowlist --image_id "$ALLOWLIST_ID"
