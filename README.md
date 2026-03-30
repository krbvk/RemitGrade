# Submit on Rise In Requirements

> Submit the following on your Rise In program page:

| Field | What to Submit |
|-------|----------------|
| **GitHub Repository** | https://github.com/krbvk/RemitGrade |
| **Contract ID** | CDPN23YABJ5OJR5LSF5647MZ3AWPBVE73GNB7DI43CVAX36ZG4FSOSRR |
| **Stellar Expert Link** | `https://stellar.expert/explorer/testnet/contract/CDPN23YABJ5OJR5LSF5647MZ3AWPBVE73GNB7DI43CVAX36ZG4FSOSRR` |
| **Short Description** |  Milestone-gated scholarship disbursement and cross-border micropayments for students and migrants in Southeast Asia — built on Stellar Soroban |
---
# Stellar Expert ScreenShot
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/81ac0c74-ddf3-424e-9a81-c73ba6573e4a" />

## The Problem

A second-year student in Surabaya, Indonesia whose living expenses and tuition are funded by a parent working in South Korea has no way to receive small, frequent XLM transfers without paying 7–10 % in remittance fees — and the parent has no guarantee the money is spent on verified academic progress rather than diverted. Every semester, thousands of Indonesian students drop out or lose housing not because sponsors stop caring, but because the money arrives late, expensive, or unverifiable.

## The Solution

RemitGrade puts the sponsor–student funding relationship on Stellar Soroban. A university admin enrolls a student with a set number of grade milestones. Migrant sponsors deposit XLM directly into the student's on-chain pool. Each time an academic milestone is verified (passing grade, semester completion), the admin unlocks the corresponding tranche, releasing an equal share of pooled XLM to the student's Freighter wallet in seconds for less than $0.001 in fees. Sponsors can also send instant cross-border micropayments directly to any receiver via send_remittance, with an on-chain receipt the student can show to a university registrar.

---

## Stellar Features Used

| Feature | Role in RemitGrade |
|---|---|
| Soroban smart contracts | Pool logic, grade-gating, tranche release, remittance record-keeping |
| XLM transfers | Sponsor deposits, student payouts, direct micropayments |
| Custom tokens | Optional university-issued voucher tokens (e.g. TUITION) |
| Trustlines | Student wallets opt-in to receive XLM tokens |

---

## Target Users

| Segment | Location | Pain / Incentive |
|---|---|---|
| Students (18–24, low-income) | Indonesia, Vietnam, Philippines | Need reliable, fee-free XLM funding tied to grades |
| Migrant workers (sponsors) | South Korea, Japan, Saudi Arabia | Send $5–$50 micropayments; lose 7–10% to fees today |
| Universities & NGOs (admins) | SEA urban centres | Need fraud-proof, grade-verified disbursement trail |
| Employers / DAOs | Global | Want to sponsor verified student workers with on-chain proof |

---

## MVP Core Feature — Transaction Flow

```
1. Admin calls enroll_student(admin, student_wallet, milestone_count=3)
      → StudentPool stored on-chain
      → ENROLLED event emitted

2. Sponsor calls deposit_funds(sponsor, XLM_token, student_wallet, 300_XLM)
      → XLM transferred sponsor → contract (held in pool)
      → StudentPool.total_deposited += 300 XLM
      → DEPOSIT event emitted

3. Admin calls unlock_grade(admin, student_wallet, index=0)
      → Grade bit 0 set in bitmask
      → GRADE event emitted

4. Admin calls release_tranche(admin, XLM_token, student_wallet, milestone_idx=0)
      → Contract checks grade bit 0 is set
      → 100 XLM transferred contract → student wallet (< 5 seconds, < $0.001 fee)
      → StudentPool.total_released += 100 XLM; disbursed flag stored
      → RELEASE event emitted

5. Sponsor calls send_remittance(sponsor, XLM_token, student_wallet, 5_XLM, "INV-001")
      → Atomic transfer: sponsor → student (no escrow hop)
      → RemitReceipt stored with settled = true
      → REMIT event emitted; student shows receipt to registrar
```

Demo-able end-to-end in under 2 minutes.

---

## Why This Wins

RemitGrade directly addresses Stellar's core thesis — financial access for the unbanked — with a real user base (millions of SEA students reliant on overseas remittances) and a composable contract that serves both the Scholarship disbursement and Micropayments / Cross-border B2B payments hackathon themes simultaneously. Judges see working grade-gated fund release, live XLM transfer, duplicate-disbursement protection, and an on-chain audit trail — all in one demo.

---

## Optional Edge (Bonus)

AI integration: An off-chain agent monitors academic APIs (e.g. university grade portals) and auto-calls unlock_grade when a passing grade is detected, making disbursement fully trustless and removing admin bottlenecks.

---

## Suggested MVP Timeline

| Day | Milestone |
|---|---|
| 1 | Soroban contract: enroll_student, deposit_funds, unlock_grade |
| 2 | release_tranche + send_remittance; all 5 unit tests passing |
| 3 | Deploy to Stellar testnet; write CLI scripts |
| 4-5 | Next.js frontend: enrol form, grade dashboard, remittance widget |
| 6 | Freighter wallet integration, testnet demo recording |
| 7 | Pitch deck polish, README finalised |

---

## Prerequisites

| Tool | Version |
|---|---|
| Rust toolchain | stable >= 1.85 |
| wasm32v1-none target | rustup target add wasm32v1-none |
| Stellar CLI | cargo install --locked stellar-cli |
| Node.js (frontend) | >= 18 LTS |

---

## Build

```bash
export RUSTFLAGS="-C target-feature=-reference-types"
cargo build --target wasm32v1-none --release
```

---

## Test

```bash
cargo test
```

Expected output:

```
test tests::test_full_grade_release_flow              ... ok
test tests::test_double_disbursement_rejected         ... ok
test tests::test_pool_state_after_deposit             ... ok
test tests::test_send_remittance_stores_receipt       ... ok
test tests::test_release_without_grade_unlock_panics  ... ok

test result: ok. 5 passed; 0 failed; 0 ignored
```

---

## Deploy to Testnet

```bash
# 1. Add testnet network
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 2. Generate and fund deployer identity
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# 3. Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/remit_grade.wasm \
  --source deployer \
  --network testnet

# 4. Initialise (set admin)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDRESS
```

---

## Sample CLI Invocations

### Enroll a Student

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin_keypair \
  --network testnet \
  -- enroll_student \
  --admin           GADMIN...ADDRESS \
  --student         GSTUDENT...ADDRESS \
  --milestone_count 3
```

### Sponsor Deposits Funds

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source sponsor_keypair \
  --network testnet \
  -- deposit_funds \
  --sponsor  GSPONSOR...ADDRESS \
  --token    $XLM_TOKEN_ADDRESS \
  --student  GSTUDENT...ADDRESS \
  --amount   3000000000
```

### Admin Unlocks a Grade

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin_keypair \
  --network testnet \
  -- unlock_grade \
  --admin   GADMIN...ADDRESS \
  --student GSTUDENT...ADDRESS \
  --index   0
```

### Admin Releases a Tranche

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source admin_keypair \
  --network testnet \
  -- release_tranche \
  --admin   GADMIN...ADDRESS \
  --token   $XLM_TOKEN_ADDRESS \
  --student GSTUDENT...ADDRESS \
  --index   0
```

### Send a Cross-Border Micropayment

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source sponsor_keypair \
  --network testnet \
  -- send_remittance \
  --sender    GSPONSOR...ADDRESS \
  --token     $XLM_TOKEN_ADDRESS \
  --receiver  GSTUDENT...ADDRESS \
  --amount    50000000 \
  --remit_id  "INV-2025-SUB-001"
```

### Read Student Pool State

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source any_keypair \
  --network testnet \
  -- get_pool \
  --student GSTUDENT...ADDRESS
```

---

## Reference Repos

- Stellar Bootcamp 2026: https://github.com/armlynobinguar/Stellar-Bootcamp-2026
- Full-stack example (community-treasury): https://github.com/armlynobinguar/community-treasury

---

## License

MIT (c) 2025 RemitGrade Contributors
