#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, Address, Env, String, Symbol,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

/// Top-level key for the admin address
const ADMIN: Symbol = symbol_short!("ADMIN");

// ─── Data Structures ──────────────────────────────────────────────────────────

/// Stores a student's remittance pool and grade-unlock state.
///
/// `total_deposited`  – lifetime USDC deposited by all sponsors for this student
/// `total_released`   – USDC already paid out after grade milestones
/// `grade_milestones` – bitmask: bit 0 = grade 1 unlocked, bit 1 = grade 2, etc.
/// `milestone_count`  – total milestones agreed at enrolment
#[contracttype]
#[derive(Clone)]
pub struct StudentPool {
    pub student:          Address,
    pub total_deposited:  i128,
    pub total_released:   i128,
    pub grade_milestones: u32,   // bitmask — up to 32 grade checkpoints
    pub milestone_count:  u32,
}

/// Lightweight receipt stored per remittance transaction.
///
/// `remit_id` – sponsor-provided reference string (e.g. "INV-2025-001")
/// `settled`  – always true once stored (atomic transfer)
#[contracttype]
#[derive(Clone)]
pub struct RemitReceipt {
    pub sender:   Address,
    pub receiver: Address,
    pub amount:   i128,
    pub remit_id: String,
    pub settled:  bool,
}

// ─── Storage Key Helpers ───────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Maps student Address → StudentPool
    Pool(Address),
    /// Maps (student Address, milestone_idx u32) → bool (disbursed flag)
    Disbursed(Address, u32),
    /// Maps remit_id String → RemitReceipt
    Receipt(String),
}

// ─── Events ───────────────────────────────────────────────────────────────────

const EVT_ENROLL:   Symbol = symbol_short!("ENROLLED");
const EVT_DEPOSIT:  Symbol = symbol_short!("DEPOSIT");
const EVT_GRADE:    Symbol = symbol_short!("GRADE");
const EVT_RELEASE:  Symbol = symbol_short!("RELEASE");
const EVT_REMIT:    Symbol = symbol_short!("REMIT");

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct RemitGrade;

#[contractimpl]
impl RemitGrade {

    // ── Admin bootstrap ──────────────────────────────────────────────────────

    /// Called once after deployment to set the trusted admin address.
    /// The admin is the only party allowed to enrol students and unlock grades.
    pub fn initialize(env: Env, admin: Address) {
        // Prevent re-initialisation
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialised");
        }
        env.storage().instance().set(&ADMIN, &admin);
    }

    // ── Student enrolment ────────────────────────────────────────────────────

    /// Admin creates a StudentPool for `student` with `milestone_count` grade
    /// checkpoints.  No funds are deposited here — sponsors call `deposit_funds`.
    pub fn enroll_student(
        env:             Env,
        admin:           Address,
        student:         Address,
        milestone_count: u32,
    ) {
        // Verify caller is the registered admin
        Self::require_admin(&env, &admin);
        admin.require_auth();

        // Reject duplicate enrolment
        let key = DataKey::Pool(student.clone());
        if env.storage().persistent().has(&key) {
            panic!("student already enrolled");
        }

        let pool = StudentPool {
            student:          student.clone(),
            total_deposited:  0,
            total_released:   0,
            grade_milestones: 0,
            milestone_count,
        };

        env.storage().persistent().set(&key, &pool);

        // Emit enrolment event so off-chain indexers can track new students
        env.events().publish((EVT_ENROLL, student), milestone_count);
    }

    // ── Sponsor deposit ──────────────────────────────────────────────────────

    /// Any sponsor (migrant worker, family member, employer) deposits USDC into
    /// the contract on behalf of `student`.  Funds are held here until a grade
    /// milestone is unlocked by the admin.
    ///
    /// `amount` – token stroops (1 USDC = 10_000_000 stroops)
    pub fn deposit_funds(
        env:     Env,
        sponsor: Address,
        token:   Address,
        student: Address,
        amount:  i128,
    ) {
        sponsor.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Pull USDC from sponsor → contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sponsor, &env.current_contract_address(), &amount);

        // Update the student's pool balance
        let key  = DataKey::Pool(student.clone());
        let mut pool: StudentPool = env.storage().persistent().get(&key)
            .expect("student not enrolled");

        pool.total_deposited += amount;
        env.storage().persistent().set(&key, &pool);

        env.events().publish((EVT_DEPOSIT, student), amount);
    }

    // ── Grade unlock ─────────────────────────────────────────────────────────

    /// Admin marks grade milestone `index` as passed for `student`.
    /// This does NOT release funds — it only sets the bit in the bitmask.
    /// The admin calls this after verifying an academic result off-chain
    /// (or via an AI oracle that polls university grade APIs).
    pub fn unlock_grade(
        env:     Env,
        admin:   Address,
        student: Address,
        index:   u32,           // 0-based milestone index
    ) {
        Self::require_admin(&env, &admin);
        admin.require_auth();

        let key  = DataKey::Pool(student.clone());
        let mut pool: StudentPool = env.storage().persistent().get(&key)
            .expect("student not enrolled");

        if index >= pool.milestone_count {
            panic!("milestone index out of range");
        }

        // Set the bit for this grade checkpoint
        pool.grade_milestones |= 1u32 << index;
        env.storage().persistent().set(&key, &pool);

        env.events().publish((EVT_GRADE, student), index);
    }

    // ── Tranche release ──────────────────────────────────────────────────────

    /// Admin releases the pro-rata tranche for milestone `index` to the student
    /// wallet.  Requires that:
    ///   1. The grade bit for `index` is set.
    ///   2. The tranche has not already been disbursed.
    ///   3. The contract holds enough USDC to cover the tranche.
    ///
    /// Tranche size = total_deposited / milestone_count  (integer division).
    pub fn release_tranche(
        env:     Env,
        admin:   Address,
        token:   Address,
        student: Address,
        index:   u32,
    ) {
        Self::require_admin(&env, &admin);
        admin.require_auth();

        let pool_key = DataKey::Pool(student.clone());
        let mut pool: StudentPool = env.storage().persistent().get(&pool_key)
            .expect("student not enrolled");

        // Check grade bit is set
        if pool.grade_milestones & (1u32 << index) == 0 {
            panic!("grade not yet unlocked for this milestone");
        }

        // Prevent double-disbursement
        let disbursed_key = DataKey::Disbursed(student.clone(), index);
        if env.storage().persistent().has(&disbursed_key) {
            panic!("tranche already disbursed");
        }

        // Calculate equal tranche
        let tranche = pool.total_deposited / pool.milestone_count as i128;
        if tranche <= 0 {
            panic!("no funds deposited yet");
        }

        // Transfer USDC from contract → student
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &student, &tranche);

        // Record disbursement state
        pool.total_released += tranche;
        env.storage().persistent().set(&pool_key, &pool);
        env.storage().persistent().set(&disbursed_key, &true);

        env.events().publish((EVT_RELEASE, student.clone()), (index, tranche));
    }

    // ── Cross-border micropayment ────────────────────────────────────────────

    /// Migrant sponsor sends a direct USDC micropayment to any receiver
    /// (student, family member, landlord).  Transfer is atomic — no escrow hop.
    /// An on-chain RemitReceipt is stored so the receiver can show proof of
    /// payment to a registrar or employer.
    ///
    /// `remit_id` – caller-supplied reference (invoice number, memo, etc.)
    pub fn send_remittance(
        env:      Env,
        sender:   Address,
        token:    Address,
        receiver: Address,
        amount:   i128,
        remit_id: String,
    ) {
        sender.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Prevent duplicate remittance IDs
        let receipt_key = DataKey::Receipt(remit_id.clone());
        if env.storage().persistent().has(&receipt_key) {
            panic!("remit_id already used");
        }

        // Atomic transfer: sender → receiver (never touches contract balance)
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &receiver, &amount);

        // Store receipt for audit / registrar proof
        let receipt = RemitReceipt {
            sender:   sender.clone(),
            receiver: receiver.clone(),
            amount,
            remit_id: remit_id.clone(),
            settled:  true,
        };
        env.storage().persistent().set(&receipt_key, &receipt);

        env.events().publish((EVT_REMIT, sender), (receiver, amount));
    }

    // ── Read-only queries ────────────────────────────────────────────────────

    /// Returns the StudentPool record for the given student.
    pub fn get_pool(env: Env, student: Address) -> StudentPool {
        env.storage()
            .persistent()
            .get(&DataKey::Pool(student))
            .expect("student not enrolled")
    }

    /// Returns the RemitReceipt for a given remittance ID.
    pub fn get_receipt(env: Env, remit_id: String) -> RemitReceipt {
        env.storage()
            .persistent()
            .get(&DataKey::Receipt(remit_id))
            .expect("receipt not found")
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /// Panics unless `caller` matches the stored admin address.
    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&ADMIN)
            .expect("contract not initialised");
        if *caller != admin {
            panic!("unauthorised: admin only");
        }
    }
}

#[cfg(test)]
mod test;