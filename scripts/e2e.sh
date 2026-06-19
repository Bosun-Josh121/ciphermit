#!/usr/bin/env bash
# End-to-end test: generate proof → invoke vault spend → confirm on-chain.
# Usage: ./scripts/e2e.sh <VAULT_ID> <PROOF_JSON>
# PROOF_JSON must contain: seal, journal_digest, policy_commitment,
#   new_spent_commitment, nullifier, action_context, owner, to, amount

set -euo pipefail

NETWORK="testnet"
ACCOUNT="ciphermit-dev"

VAULT_ID="${1:?Usage: $0 <VAULT_ID> <PROOF_JSON>}"
PROOF_JSON="${2:?}"

if [ ! -f "$PROOF_JSON" ]; then
  echo "ERROR: proof file not found: $PROOF_JSON"
  exit 1
fi

SEAL=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['seal'])")
JOURNAL_DIGEST=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['journal_digest'])")
POLICY_COMMITMENT=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['policy_commitment'])")
NEW_SPENT_COMMITMENT=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['new_spent_commitment'])")
NULLIFIER=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['nullifier'])")
ACTION_CONTEXT=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['action_context'])")
OWNER=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['owner'])")
TO=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['to'])")
AMOUNT=$(python3 -c "import json,sys; d=json.load(open('$PROOF_JSON')); print(d['amount'])")

echo "==> Invoking vault spend..."
TX_HASH=$(stellar contract invoke \
  --source "$ACCOUNT" \
  --network "$NETWORK" \
  --id "$VAULT_ID" \
  -- spend \
  --owner "$OWNER" \
  --to "$TO" \
  --amount "$AMOUNT" \
  --seal "$SEAL" \
  --journal_digest "$JOURNAL_DIGEST" \
  --policy_commitment "$POLICY_COMMITMENT" \
  --new_spent_commitment "$NEW_SPENT_COMMITMENT" \
  --nullifier "$NULLIFIER" \
  --action_context "$ACTION_CONTEXT")

echo ""
echo "✓ Spend authorized!"
echo "  Tx hash: $TX_HASH"
echo "  Explorer: https://stellar.expert/explorer/testnet/tx/$TX_HASH"
echo ""
echo "  Record this in docs/progress.md"
