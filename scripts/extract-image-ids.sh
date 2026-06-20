#!/usr/bin/env bash
# Extract image_ids from the compiled guest programs and print them as 32-byte hex.
# Run from the project root after `cargo build --release` in guest/.
# Output: one line per policy: POLICY=<64-hex-chars>
set -euo pipefail

GUEST_DIR="$(dirname "$0")/../guest"

# Find the generated methods.rs in OUT_DIR
METHODS_RS=$(find "$GUEST_DIR/target" -name "methods.rs" -path "*/build/methods*/out/*" 2>/dev/null | head -1)
if [ -z "$METHODS_RS" ]; then
  echo "ERROR: methods.rs not found. Run 'cargo build --release' in guest/ first." >&2
  exit 1
fi

echo "# Found: $METHODS_RS" >&2

# Parse [u32; 8] from the generated file and convert to 32-byte LE hex.
python3 - "$METHODS_RS" <<'EOF'
import sys, re, struct

path = sys.argv[1]
text = open(path).read()

# Match: pub const ALLOWANCE_ID: [u32; 8] = [0xAABBCCDD, ...];
pattern = r'pub const (\w+_ID):\s*\[u32;\s*8\]\s*=\s*\[([^\]]+)\]'
for m in re.finditer(pattern, text):
    name = m.group(1)                               # e.g. ALLOWANCE_ID
    words_str = m.group(2)                          # e.g. "0xdeadbeef, 0x..."
    words = [int(w.strip(), 0) for w in words_str.split(',') if w.strip()]
    if len(words) != 8:
        continue
    # Convert [u32; 8] to 32 bytes, each word little-endian
    raw = b''.join(struct.pack('<I', w) for w in words)
    print(f"{name}={raw.hex()}")
EOF
