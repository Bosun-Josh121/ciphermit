#!/usr/bin/env bash
# Phase 6: Full end-to-end spine checkpoint.
# Opens a vault, deposits XLM, generates a real Groth16 proof, executes spend.
#
# Usage:
#   ./scripts/e2e-demo.sh              # full run (open vault + deposit + prove + spend)
#   ./scripts/e2e-demo.sh --resume     # skip vault/deposit, reuse .local/e2e-state.json
#
# State is saved to .local/e2e-state.json after vault open + deposit so the
# prove+spend step can be retried without re-opening a vault.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROVER_URL="${PROVER_URL:-http://localhost:3001}"
NETWORK="testnet"
SOURCE="ciphermit-dev"
ADDRESSES="$PROJECT_ROOT/.local/addresses.md"
STATE_FILE="$PROJECT_ROOT/.local/e2e-state.json"
PROOF_FILE="$PROJECT_ROOT/.local/ciphermit-proof.json"

RESUME=false
if [ "${1:-}" = "--resume" ]; then RESUME=true; fi

# ── Load addresses ─────────────────────────────────────────────────────────────
get_addr() { grep "^$1=" "$ADDRESSES" | cut -d= -f2 | tr -d ' '; }

VAULT_CONTRACT=$(get_addr VAULT_ID)
XLM_SAC=$(get_addr XLM_SAC)
OWNER=$(stellar keys address "$SOURCE" 2>/dev/null)

[ -z "$VAULT_CONTRACT" ] && { echo "ERROR: VAULT_ID not found in $ADDRESSES" >&2; exit 1; }

echo "=== Ciphermit E2E Demo ==="
echo "  Vault contract: $VAULT_CONTRACT"
echo "  Owner:          $OWNER"
echo "  Network:        $NETWORK"
echo "  Resume mode:    $RESUME"
echo ""

# ── Check prover health ────────────────────────────────────────────────────────
echo "==> Checking prover service at $PROVER_URL..."
if ! curl -sf --max-time 10 "$PROVER_URL/health" > /dev/null; then
  echo "ERROR: Prover not running at $PROVER_URL" >&2; exit 1
fi
echo "  OK: prover healthy"
echo ""

# ── Parameters ────────────────────────────────────────────────────────────────
SPEND_AMOUNT=1000000       # 0.1 XLM in stroops
DEPOSIT_AMOUNT=10000000    # 1.0 XLM in stroops
PERIOD_CAP=100000000       # 10 XLM in stroops
PERIOD_ID=1
RECIPIENT="${2:-$OWNER}"   # default: send back to self

if $RESUME; then
  # ── Resume: load saved state ─────────────────────────────────────────────────
  [ -f "$STATE_FILE" ] || { echo "ERROR: $STATE_FILE not found — run without --resume first" >&2; exit 1; }
  echo "==> Resuming from $STATE_FILE"
  VAULT_SECRET=$(python3      -c "import json; d=json.load(open('$STATE_FILE')); print(d['vault_secret'])")
  BLINDING=$(python3          -c "import json; d=json.load(open('$STATE_FILE')); print(d['blinding'])")
  NULLIFIER_SECRET=$(python3  -c "import json; d=json.load(open('$STATE_FILE')); print(d['nullifier_secret'])")
  VAULT_COUNT=$(python3       -c "import json; d=json.load(open('$STATE_FILE')); print(d['vault_id'])")
  POLICY_COMMITMENT=$(python3 -c "import json; d=json.load(open('$STATE_FILE')); print(d['policy_commitment'])")
  ACTION_CONTEXT=$(python3    -c "import json; d=json.load(open('$STATE_FILE')); print(d['action_context'])")
  echo "  vault_id:          $VAULT_COUNT"
  echo "  policy_commitment: $POLICY_COMMITMENT"
  echo "  action_context:    $ACTION_CONTEXT"
  echo ""
else
  # ── Fresh run: generate params ────────────────────────────────────────────────
  VAULT_SECRET=$(python3 -c "import os; print(os.urandom(32).hex())")
  BLINDING=$(python3 -c "import os; print(os.urandom(32).hex())")
  NULLIFIER_SECRET=$(python3 -c "import os; print(os.urandom(32).hex())")

  echo "==> Deriving policy commitment..."
  POLICY_COMMITMENT=$(python3 - <<PYEOF
import hashlib, struct
data = struct.pack('<QQ', $PERIOD_CAP, $PERIOD_ID) + bytes.fromhex("$VAULT_SECRET")
print(hashlib.sha256(data).hexdigest())
PYEOF
  )
  INITIAL_SPENT_COMMITMENT=$(python3 - <<PYEOF
import hashlib, struct
data = struct.pack('<QQ', 0, $PERIOD_ID) + bytes.fromhex("$BLINDING")
print(hashlib.sha256(data).hexdigest())
PYEOF
  )
  echo "  policy_commitment:        $POLICY_COMMITMENT"
  echo "  initial_spent_commitment: $INITIAL_SPENT_COMMITMENT"
  echo ""

  # ── Open vault ────────────────────────────────────────────────────────────────
  echo "==> Reading current vault_count..."
  VAULT_COUNT=$(stellar contract invoke \
    --source "$SOURCE" --network "$NETWORK" --id "$VAULT_CONTRACT" \
    -- vault_count 2>/dev/null | tr -d '"' || echo "0")
  echo "  vault_id will be: $VAULT_COUNT"

  stellar contract invoke \
    --source "$SOURCE" --network "$NETWORK" --id "$VAULT_CONTRACT" \
    -- open_vault \
    --owner "$OWNER" \
    --policy_type allowance \
    --policy_commitment "$POLICY_COMMITMENT" \
    --initial_spent_commitment "$INITIAL_SPENT_COMMITMENT" \
    --period_id "$PERIOD_ID"
  echo "  OK: vault opened (id=$VAULT_COUNT)"

  # ── Approve + Deposit ─────────────────────────────────────────────────────────
  echo "==> Approving XLM transfer..."
  CURRENT_LEDGER=$(curl -sf "https://soroban-testnet.stellar.org" \
    -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"getLatestLedger","params":{}}' \
    | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['sequence'])")
  EXPIRY_LEDGER=$((CURRENT_LEDGER + 100000))
  stellar contract invoke \
    --source "$SOURCE" --network "$NETWORK" --id "$XLM_SAC" \
    -- approve \
    --from "$OWNER" \
    --spender "$VAULT_CONTRACT" \
    --amount "$DEPOSIT_AMOUNT" \
    --expiration_ledger "$EXPIRY_LEDGER"
  echo "  OK: approved $DEPOSIT_AMOUNT stroops"

  echo "==> Depositing XLM into vault..."
  stellar contract invoke \
    --source "$SOURCE" --network "$NETWORK" --id "$VAULT_CONTRACT" \
    -- deposit \
    --vault_id "$VAULT_COUNT" \
    --from "$OWNER" \
    --amount "$DEPOSIT_AMOUNT"
  echo "  OK: deposited $DEPOSIT_AMOUNT stroops"
  echo ""

  # ── Compute action_context ────────────────────────────────────────────────────
  ACTION_CONTEXT=$(python3 - <<PYEOF
import hashlib, struct
owner_hash = hashlib.sha256("$OWNER".encode()).digest()
recip_hash = hashlib.sha256("$RECIPIENT".encode()).digest()
data = owner_hash + recip_hash + struct.pack('<Q', $SPEND_AMOUNT)
print(hashlib.sha256(data).hexdigest())
PYEOF
  )

  # ── Save state so prove+spend can be resumed if session dies ──────────────────
  python3 - <<PYEOF
import json
state = {
  "vault_id": "$VAULT_COUNT",
  "vault_secret": "$VAULT_SECRET",
  "blinding": "$BLINDING",
  "nullifier_secret": "$NULLIFIER_SECRET",
  "policy_commitment": "$POLICY_COMMITMENT",
  "action_context": "$ACTION_CONTEXT",
  "spend_amount": $SPEND_AMOUNT,
  "period_cap": $PERIOD_CAP,
  "period_id": $PERIOD_ID,
  "recipient": "$RECIPIENT",
  "owner": "$OWNER"
}
json.dump(state, open("$STATE_FILE", "w"), indent=2)
print("  State saved to $STATE_FILE")
PYEOF
  echo "  action_context: $ACTION_CONTEXT"
  echo ""
  echo "  (If this session dies before proof completes, run:)"
  echo "  PROVER_URL=$PROVER_URL ./scripts/e2e-demo.sh --resume"
  echo ""
fi

# ── Request proof from prover service ─────────────────────────────────────────
echo "==> Requesting Groth16 proof from prover (this takes ~60-120s)..."
echo "    Session-safe: params saved to $STATE_FILE"
PROOF_JSON=$(curl -sf --max-time 600 -X POST "$PROVER_URL/prove/allowance" \
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

echo "$PROOF_JSON" > "$PROOF_FILE"
echo "  Proof saved to $PROOF_FILE"

SEAL=$(echo "$PROOF_JSON"                | python3 -c "import json,sys; print(json.load(sys.stdin)['seal'])")
JOURNAL_DIGEST=$(echo "$PROOF_JSON"      | python3 -c "import json,sys; print(json.load(sys.stdin)['journal_digest'])")
PROOF_POLICY_COMMITMENT=$(echo "$PROOF_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['policy_commitment'])")
NEW_SPENT_COMMITMENT=$(echo "$PROOF_JSON"| python3 -c "import json,sys; print(json.load(sys.stdin)['new_spent_commitment'])")
NULLIFIER=$(echo "$PROOF_JSON"           | python3 -c "import json,sys; print(json.load(sys.stdin)['nullifier'])")
PROOF_ACTION_CONTEXT=$(echo "$PROOF_JSON"| python3 -c "import json,sys; print(json.load(sys.stdin)['action_context'])")

echo "  seal:                 ${SEAL:0:16}..."
echo "  journal_digest:       $JOURNAL_DIGEST"
echo "  policy_commitment:    $PROOF_POLICY_COMMITMENT"
echo "  new_spent_commitment: $NEW_SPENT_COMMITMENT"
echo "  nullifier:            $NULLIFIER"
echo "  action_context:       $PROOF_ACTION_CONTEXT"
echo ""

if [ "$PROOF_ACTION_CONTEXT" != "$ACTION_CONTEXT" ]; then
  echo "ERROR: action_context mismatch — prover returned different value" >&2; exit 1
fi
echo "  ✓ action_context verified"
echo ""

# ── Execute spend on-chain ─────────────────────────────────────────────────────
echo "==> Submitting spend transaction to Stellar testnet..."
TX_OUTPUT=$(stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_CONTRACT" \
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
TX_HASH=$(echo "$TX_OUTPUT" | grep -oE '[0-9a-f]{64}' | head -1 || echo "see above")

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  ✓ SPEND AUTHORIZED — proof verified on-chain!   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo "  Tx hash: $TX_HASH"
echo "  Explorer: https://stellar.expert/explorer/testnet/tx/$TX_HASH"
echo ""

# ── Test replay protection ─────────────────────────────────────────────────────
echo "==> Testing replay protection (same nullifier must fail)..."
if stellar contract invoke \
  --source "$SOURCE" --network "$NETWORK" --id "$VAULT_CONTRACT" \
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
echo "==> Record in docs/progress.md:"
echo "    tx_hash=$TX_HASH"
echo "    vault_id=$VAULT_COUNT"

# Clean up state file on success
rm -f "$STATE_FILE"
echo "  State file cleared."
