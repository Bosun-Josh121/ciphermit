#!/usr/bin/env bash
# Update image_ids in vault contract for all 4 policies.
# Usage: ./scripts/set-image-ids.sh <VAULT_ID>
# Reads image_ids from .local/addresses.md or prompts for them.
# Run from project root after extract-image-ids.sh has been run.
set -euo pipefail

NETWORK=testnet
SOURCE=ciphermit-dev
VAULT_ID="${1:?Usage: $0 <VAULT_ID>}"
PROJECT_ROOT="$(dirname "$0")/.."

# Try to source image_ids from .local/addresses.md
ADDRESSES_FILE="$PROJECT_ROOT/.local/addresses.md"

get_id() {
  local key="$1"
  if [ -f "$ADDRESSES_FILE" ]; then
    grep "^${key}=" "$ADDRESSES_FILE" | cut -d= -f2 | tr -d ' '
  fi
}

ALLOWANCE_ID="${ALLOWANCE_IMAGE_ID:-$(get_id ALLOWANCE_IMAGE_ID)}"
DELEGATION_ID="${DELEGATION_IMAGE_ID:-$(get_id DELEGATION_IMAGE_ID)}"
COMPLIANCE_ID="${COMPLIANCE_IMAGE_ID:-$(get_id COMPLIANCE_IMAGE_ID)}"
ALLOWLIST_ID="${ALLOWLIST_IMAGE_ID:-$(get_id ALLOWLIST_IMAGE_ID)}"

if [ -z "$ALLOWANCE_ID" ]; then
  echo "ERROR: ALLOWANCE_IMAGE_ID not set. Run extract-image-ids.sh first and update .local/addresses.md" >&2
  exit 1
fi

set_one() {
  local policy_sym="$1"
  local image_id="$2"
  if [ -z "$image_id" ]; then
    echo "  SKIP: $policy_sym (no image_id)"
    return
  fi
  echo "==> set_image_id policy_type=$policy_sym"
  stellar contract invoke \
    --id "$VAULT_ID" --source "$SOURCE" --network "$NETWORK" \
    -- set_image_id --policy_type "$policy_sym" --image_id "$image_id"
  echo "  OK: $policy_sym → $image_id"
}

set_one "allowance" "$ALLOWANCE_ID"
set_one "delegat"   "$DELEGATION_ID"
set_one "comply"    "$COMPLIANCE_ID"
set_one "allowlist" "$ALLOWLIST_ID"

echo ""
echo "Done. Vault $VAULT_ID image_ids updated on testnet."
