#!/bin/bash
set -e

# RemitGrade Soroban Contract Redeploy Script
# This script builds, deploys, and initializes the contract on Stellar Testnet.

echo "--- 🛠️  Step 1: Building RemitGrade Contract ---"
export RUSTFLAGS="-C target-feature=-reference-types"
cargo build --target wasm32v1-none --release

WASM_PATH="target/wasm32v1-none/release/remit_grade.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo "❌ Error: Wasm file not found @ $WASM_PATH"
    exit 1
fi

echo "--- 🌐 Step 2: Ensuring Testnet Network and Identity ---"
# Add testnet network if it doesn't exist
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015" 2>/dev/null || true

# Generate and fund deployer if it doesn't exist
if ! stellar keys address deployer >/dev/null 2>&1; then
    echo "Creating 'deployer' identity..."
    stellar keys generate deployer --network testnet
    stellar keys fund deployer --network testnet
else
    echo "'deployer' identity already exists."
fi

DEPLOYER_ADDR=$(stellar keys address deployer)
echo "Using Deployer: $DEPLOYER_ADDR"

echo "--- 🚀 Step 3: Deploying to Testnet ---"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source deployer \
  --network testnet)

echo "✅ Contract Deployed! ID: $CONTRACT_ID"

echo "--- 📝 Step 4: Initializing Contract ---"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin "$DEPLOYER_ADDR"

echo "✅ Contract Initialized with Admin: $DEPLOYER_ADDR"

echo "--- ⚙️  Step 5: Updating Frontend Config ---"
STELLAR_TS="frontend/src/lib/stellar.ts"

if [ -f "$STELLAR_TS" ]; then
    # Cross-platform sed for updating the CONTRACT_ID constant
    if sed --version >/dev/null 2>&1; then
        # GNU sed (Linux/Git Bash)
        sed -i "s/export const CONTRACT_ID = \".*\";/export const CONTRACT_ID = \"$CONTRACT_ID\";/" "$STELLAR_TS"
    else
        # BSD sed (macOS)
        sed -i '' "s/export const CONTRACT_ID = \".*\";/export const CONTRACT_ID = \"$CONTRACT_ID\";/" "$STELLAR_TS"
    fi
    echo "✅ Updated $STELLAR_TS with new Contract ID."
else
    echo "⚠️  Warning: $STELLAR_TS not found. Update CONTRACT_ID manually."
fi

echo "--- ✨ Redeploy Complete! ---"
echo "New Contract ID: $CONTRACT_ID"
