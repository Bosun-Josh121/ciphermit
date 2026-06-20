#!/usr/bin/env bash
# Phase 6: Full end-to-end spine checkpoint.
# Opens a vault, deposits XLM, generates a real Groth16 proof, executes spend.
#
# Prerequisites:
#   - Vault contract deployed (VAULT_ID set in .local/addresses.md)
#   - image_ids set on vault (run set-image-ids.sh first)
#   - Prover service running: cd guest/host && cargo run --release
#   - ciphermit-dev key funded on testnet
#   - XLM SAC authorized on the vault
#
# Usage: ./scripts/e2e-demo.sh [RECIPIENT_ADDRESS]
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROVER_URL="${PROVER_URL:-http://localhost:3001}"
NETWORK="testnet"
SOURCE="ciphermit-dev"
ADDRESSES="$PROJECT_ROOT/.local/addresses.md"

# ── Load addresses ─────────────────────────────────────────────────────────────
get_addr() { grep "^$1=" "$ADDRESSES" | cut -d= -f2 | tr -d ' '; }

VAULT_ID=$(get_addr VAULT_ID)
XLM_SAC=$(get_addr XLM_SAC)
OWNER=$(stellar keys address "$SOURCE" 2>/dev/null)

if [ -z "$VAULT_ID" ]; then
  echo "ERROR: VAULT_ID not found in $ADDRESSES" >&2; exit 1
fi

echo "=== Ciphermit E2E Demo ==="
echo "  Vault:   $VAULT_ID"
echo "  Owner:   $OWNER"
echo "  Network: $NETWORK"
echo ""

# ── Check prover health ────────────────────────────────────────────────────────
echo "==> Checking prover service at $PROVER_URL..."
if ! curl -sf "$PROVER_URL/health" > /dev/null; then
  echo "ERROR: Prover not running. Start it with: cd guest/host && cargo run --release" >&2
  exit 1
fi
echo "  OK: prover healthy"
echo ""

# ── Generate test parameters ───────────────────────────────────────────────────
RECIPIENT="${1:-$OWNER}"   # default: send back to self for testing
SPEND_AMOUNT=1000000       # 0.1 XLM in stroops
DEPOSIT_AMOUNT=10000000    # 1.0 XLM in stroops
PERIOD_CAP=100000000       # 10 XLM in stroops
PERIOD_ID=1

VAULT_SECRET=$(python3 -c "import os; print(os.urandom(32).hex())")
BLINDING=$(python3 -c "import os; print(os.urandom(32).hex())")
NULLIFIER_SECRET=$(python3 -c "import os; print(os.urandom(32).hex())")

echo "==> Deriving policy commitment (matches guest allowance.rs)..."
# sha256(period_cap_u64_le || period_id_u64_le || vault_secret)
POLICY_COMMITMENT=$(python3 - <<PYEOF
import hashlib, struct
period_cap = $PERIOD_CAP
period_id = $PERIOD_ID
vault_secret = bytes.fromhex("$VAULT_SECRET")
data = struct.pack('<QQ', period_cap, period_id) + vault_secret
print(hashlib.sha256(data).hexdigest())
PYEOF
)
echo "  policy_commitment: $POLICY_COMMITMENT"

# sha256(0_u64_le || period_id_u64_le || blinding) — represents 0 spent
INITIAL_SPENT_COMMITMENT=$(python3 - <<PYEOF
import hashlib, struct
period_id = $PERIOD_ID
blinding = bytes.fromhex("$BLINDING")
data = struct.pack('<QQ', 0, period_id) + blinding
print(hashlib.sha256(data).hexdigest())
PYEOF
)
echo "  initial_spent_commitment: $INITIAL_SPENT_COMMITMENT"
echo ""

# ── Open vault ─────────────────────────────────────────────────────────────────
echo "==> Reading current vault_count (will be the new vault_id)..."
VAULT_COUNT=$(stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_ID" \
  -- vault_count 2>/dev/null | tr -d '"' || echo "0")
echo "  vault_id will be: $VAULT_COUNT"

echo "==> Opening vault (policy=allowance, period=$PERIOD_ID)..."
stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_ID" \
  -- open_vault \
  --owner "$OWNER" \
  --policy_type allowance \
  --policy_commitment "$POLICY_COMMITMENT" \
  --initial_spent_commitment "$INITIAL_SPENT_COMMITMENT" \
  --period_id "$PERIOD_ID"
echo "  OK: vault opened (id=$VAULT_COUNT)"

# ── Approve + Deposit ──────────────────────────────────────────────────────────
echo "==> Approving XLM transfer..."
# expiration_ledger must be <= current + max_ttl; compute current + 100000 (~6 days)
CURRENT_LEDGER=$(curl -sf "https://soroban-testnet.stellar.org" \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger","params":{}}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['sequence'])")
EXPIRY_LEDGER=$((CURRENT_LEDGER + 100000))
echo "  current ledger: $CURRENT_LEDGER  expiry: $EXPIRY_LEDGER"
stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$XLM_SAC" \
  -- approve \
  --from "$OWNER" \
  --spender "$VAULT_ID" \
  --amount "$DEPOSIT_AMOUNT" \
  --expiration_ledger "$EXPIRY_LEDGER"
echo "  OK: approved $DEPOSIT_AMOUNT stroops"

echo "==> Depositing XLM into vault..."
stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_ID" \
  -- deposit \
  --vault_id "$VAULT_COUNT" \
  --from "$OWNER" \
  --amount "$DEPOSIT_AMOUNT"
echo "  OK: deposited $DEPOSIT_AMOUNT stroops"
echo ""

# ── Compute action_context ────────────────────────────────────────────────────
# action_context = sha256(sha256(owner_strkey_bytes) || sha256(recipient_strkey_bytes) || amount_u64_le)
ACTION_CONTEXT=$(python3 - <<PYEOF
import hashlib, struct
owner = "$OWNER".encode('utf-8')
recipient = "$RECIPIENT".encode('utf-8')
amount = $SPEND_AMOUNT
owner_hash = hashlib.sha256(owner).digest()
recipient_hash = hashlib.sha256(recipient).digest()
data = owner_hash + recipient_hash + struct.pack('<Q', amount)
print(hashlib.sha256(data).hexdigest())
PYEOF
)
echo "==> action_context: $ACTION_CONTEXT"
echo ""

# ── Request proof from prover service ─────────────────────────────────────────
echo "==> Requesting Groth16 proof from prover (this takes ~60-120s)..."
PROOF_JSON=$(curl -sf -X POST "$PROVER_URL/prove/allowance" \
  -H "Content-Type: application/json" \
  -d "{
    \"vault_secret_hex\": \"$VAULT_SECRET\",
    \"spend_amount\": $SPEND_AMOUNT,
    \"prior_spent\": 0,
    \"period_cap\": $PERIOD_CAP,
    \"period_id\": $PERIOD_ID,
    \"nullifier_secret_hex\": \"$NULLIFIER_SECRET\",
    \"blinding_hex\": \"$BLINDING\",
    \"action_context_hex\": \"$ACTION_CONTEXT\"
  }")

# Save proof for inspection
echo "$PROOF_JSON" > /tmp/ciphermit-proof.json
echo "  Proof saved to /tmp/ciphermit-proof.json"

SEAL=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['seal'])")
JOURNAL_DIGEST=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['journal_digest'])")
PROOF_POLICY_COMMITMENT=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['policy_commitment'])")
NEW_SPENT_COMMITMENT=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['new_spent_commitment'])")
NULLIFIER=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['nullifier'])")
PROOF_ACTION_CONTEXT=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['action_context'])")

echo "  seal:                  ${SEAL:0:16}..."
echo "  journal_digest:        $JOURNAL_DIGEST"
echo "  policy_commitment:     $PROOF_POLICY_COMMITMENT"
echo "  new_spent_commitment:  $NEW_SPENT_COMMITMENT"
echo "  nullifier:             $NULLIFIER"
echo "  action_context:        $PROOF_ACTION_CONTEXT"
echo ""

# Verify the proof's action_context matches what we computed
if [ "$PROOF_ACTION_CONTEXT" != "$ACTION_CONTEXT" ]; then
  echo "ERROR: action_context mismatch — prover returned different value" >&2
  exit 1
fi
echo "  ✓ action_context verified"
echo ""

# ── Execute spend on-chain ─────────────────────────────────────────────────────
echo "==> Submitting spend transaction to Stellar testnet..."
TX_OUTPUT=$(stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_ID" \
  -- spend \
  --vault_id "$VAULT_COUNT" \
  --owner "$OWNER" \
  --to "$RECIPIENT" \
  --amount "$SPEND_AMOUNT" \
  --seal "$SEAL" \
  --journal_digest "$JOURNAL_DIGEST" \
  --policy_commitment "$PROOF_POLICY_COMMITMENT" \
  --new_spent_commitment "$NEW_SPENT_COMMITMENT" \
  --nullifier "$NULLIFIER" \
  --action_context "$PROOF_ACTION_CONTEXT" 2>&1)

echo "$TX_OUTPUT"

# Try to extract tx hash from output
TX_HASH=$(echo "$TX_OUTPUT" | grep -oE '[0-9a-f]{64}' | head -1 || echo "see above")

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✓ SPEND AUTHORIZED — proof verified on-chain!   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  Tx hash: $TX_HASH"
echo "  Explorer: https://stellar.expert/explorer/testnet/tx/$TX_HASH"
echo ""
echo "==> Testing replay protection (same nullifier must fail)..."
if stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_ID" \
  -- spend \
  --vault_id "$VAULT_COUNT" \
  --owner "$OWNER" \
  --to "$RECIPIENT" \
  --amount "$SPEND_AMOUNT" \
  --seal "$SEAL" \
  --journal_digest "$JOURNAL_DIGEST" \
  --policy_commitment "$PROOF_POLICY_COMMITMENT" \
  --new_spent_commitment "$NEW_SPENT_COMMITMENT" \
  --nullifier "$NULLIFIER" \
  --action_context "$PROOF_ACTION_CONTEXT" 2>&1 | grep -q "nullifier already used"; then
  echo "  ✓ Replay correctly rejected: nullifier already used"
else
  echo "  WARN: replay did not return expected error (check output above)"
fi

echo ""
echo "Record this in docs/progress.md:"
echo "  tx_hash=$TX_HASH"
echo "  vault_id=$VAULT_COUNT"
