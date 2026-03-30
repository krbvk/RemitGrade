# RemitGrade Soroban Contract Redeploy Script (PowerShell)
# This script builds, deploys, and initializes the contract on Stellar Testnet.

$ErrorActionPreference = "Stop"

Write-Host "--- 🛠️  Step 1: Building RemitGrade Contract ---" -ForegroundColor Cyan
$env:RUSTFLAGS = "-C target-feature=-reference-types"
cargo build --target wasm32v1-none --release

$WASM_PATH = "target/wasm32v1-none/release/remit_grade.wasm"

if (-not (Test-Path $WASM_PATH)) {
    Write-Error "❌ Error: Wasm file not found @ $WASM_PATH"
}

Write-Host "--- 🌐 Step 2: Ensuring Testnet Network and Identity ---" -ForegroundColor Cyan
# Add testnet network if it doesn't exist
try {
    stellar network add testnet `
      --rpc-url https://soroban-testnet.stellar.org `
      --network-passphrase "Test SDF Network ; September 2015" `
      2>$null
} catch {}

# Generate and fund deployer if it doesn't exist
try {
    stellar keys address deployer 2>$null | Out-Null
    Write-Host "'deployer' identity already exists."
} catch {
    Write-Host "Creating 'deployer' identity..."
    stellar keys generate deployer --network testnet
    stellar keys fund deployer --network testnet
}

$DEPLOYER_ADDR = (stellar keys address deployer)
Write-Host "Using Deployer: $DEPLOYER_ADDR"

Write-Host "--- 🚀 Step 3: Deploying to Testnet ---" -ForegroundColor Cyan
$CONTRACT_ID = (stellar contract deploy --wasm "$WASM_PATH" --source deployer --network testnet)

Write-Host "✅ Contract Deployed! ID: $CONTRACT_ID" -ForegroundColor Green

Write-Host "--- 📝 Step 4: Initializing Contract ---" -ForegroundColor Cyan
stellar contract invoke `
  --id "$CONTRACT_ID" `
  --source deployer `
  --network testnet `
  -- initialize `
  --admin "$DEPLOYER_ADDR"

Write-Host "✅ Contract Initialized with Admin: $DEPLOYER_ADDR" -ForegroundColor Green

Write-Host "--- ⚙️  Step 5: Updating Frontend Config ---" -ForegroundColor Cyan
$STELLAR_TS = "frontend/src/lib/stellar.ts"

if (Test-Path $STELLAR_TS) {
    $content = Get-Content $STELLAR_TS
    $newContent = $content -replace 'export const CONTRACT_ID = ".*?";', "export const CONTRACT_ID = `"$CONTRACT_ID`";"
    $newContent | Set-Content $STELLAR_TS
    Write-Host "✅ Updated $STELLAR_TS with new Contract ID." -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: $STELLAR_TS not found. Update CONTRACT_ID manually." -ForegroundColor Yellow
}

Write-Host "--- ✨ Redeploy Complete! ---" -ForegroundColor Cyan
Write-Host "New Contract ID: $CONTRACT_ID" -ForegroundColor White
