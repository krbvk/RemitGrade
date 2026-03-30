#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::Address as _,
        token, Address, Env, String,
    };

    use crate::{RemitGrade, RemitGradeClient};

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /// Deploys a mock USDC token, mints `amount` to `recipient`, and returns
    /// the token contract address plus an admin client for the token.
    fn create_token(
        env:       &Env,
        admin:     &Address,
        recipient: &Address,
        amount:    i128,
    ) -> Address {
        let token_addr = env.register_stellar_asset_contract_v2(admin.clone()).address();
        let token_admin = token::StellarAssetClient::new(env, &token_addr);
        token_admin.mint(recipient, &amount);
        token_addr
    }

    /// Deploys the RemitGrade contract, initialises it with `admin`, and
    /// returns the client.
    fn deploy<'a>(env: &'a Env, admin: &Address) -> RemitGradeClient<'a> {
        let contract_id = env.register_contract(None, RemitGrade);
        let client      = RemitGradeClient::new(env, &contract_id);
        client.initialize(admin);
        client
    }

    // ─── Test 1 — Happy Path ──────────────────────────────────────────────────
    //
    // Full flow: enrol student → sponsor deposits USDC → admin unlocks grade →
    // admin releases tranche → student balance increases.

    #[test]
    fn test_full_grade_release_flow() {
        let env     = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let student = Address::generate(&env);
        let sponsor = Address::generate(&env);

        // Give sponsor 100 USDC (1_000_000_000 stroops)
        let token_addr = create_token(&env, &admin, &sponsor, 1_000_000_000);
        let token      = token::Client::new(&env, &token_addr);

        let client = deploy(&env, &admin);

        // Enrol student with 2 milestones
        client.enroll_student(&admin, &student, &2);

        // Sponsor deposits 100 USDC into the contract pool
        client.deposit_funds(&sponsor, &token_addr, &student, &1_000_000_000);

        // Verify contract holds the funds
        assert_eq!(
            token.balance(&client.address),
            1_000_000_000,
            "contract should hold deposited USDC"
        );

        // Admin unlocks grade milestone 0 (student passed first term)
        client.unlock_grade(&admin, &student, &0);

        // Admin releases tranche for milestone 0 (50 USDC = 500_000_000 stroops)
        let student_before = token.balance(&student);
        client.release_tranche(&admin, &token_addr, &student, &0);
        let student_after  = token.balance(&student);

        assert_eq!(
            student_after - student_before,
            500_000_000,
            "student should receive exactly half of the deposit (tranche = total / milestones)"
        );

        // Pool state reflects the released tranche
        let pool = client.get_pool(&student);
        assert_eq!(pool.total_released, 500_000_000);
    }

    // ─── Test 2 — Edge Case: duplicate tranche disbursement is rejected ────────
    //
    // Calling release_tranche twice for the same milestone must panic.

    #[test]
    #[should_panic(expected = "tranche already disbursed")]
    fn test_double_disbursement_rejected() {
        let env = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let student = Address::generate(&env);
        let sponsor = Address::generate(&env);

        let token_addr = create_token(&env, &admin, &sponsor, 1_000_000_000);
        let client     = deploy(&env, &admin);

        client.enroll_student(&admin, &student, &2);
        client.deposit_funds(&sponsor, &token_addr, &student, &1_000_000_000);
        client.unlock_grade(&admin, &student, &0);

        // First call succeeds
        client.release_tranche(&admin, &token_addr, &student, &0);

        // Second call must panic — tranche already paid out
        client.release_tranche(&admin, &token_addr, &student, &0);
    }

    // ─── Test 3 — State Verification: pool reflects deposit correctly ─────────
    //
    // After a sponsor deposit the StudentPool.total_deposited must match exactly.

    #[test]
    fn test_pool_state_after_deposit() {
        let env = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let student = Address::generate(&env);
        let sponsor = Address::generate(&env);

        // Mint 50 USDC to sponsor
        let token_addr = create_token(&env, &admin, &sponsor, 500_000_000);
        let client     = deploy(&env, &admin);

        client.enroll_student(&admin, &student, &3);
        client.deposit_funds(&sponsor, &token_addr, &student, &500_000_000);

        let pool = client.get_pool(&student);

        assert_eq!(pool.total_deposited, 500_000_000, "pool must record full deposit");
        assert_eq!(pool.total_released,  0,           "nothing released yet");
        assert_eq!(pool.grade_milestones, 0,           "no grades unlocked yet");
        assert_eq!(pool.milestone_count,  3,           "milestone count set at enrolment");
    }

    // ─── Test 4 — Remittance: atomic micropayment stores receipt ─────────────
    //
    // send_remittance must move tokens directly and persist a RemitReceipt.

    #[test]
    fn test_send_remittance_stores_receipt() {
        let env = Env::default();
        env.mock_all_auths();

        let admin    = Address::generate(&env);
        let sponsor  = Address::generate(&env);
        let receiver = Address::generate(&env);

        // Mint 5 USDC to sponsor
        let token_addr  = create_token(&env, &admin, &sponsor, 50_000_000);
        let token        = token::Client::new(&env, &token_addr);
        let client       = deploy(&env, &admin);
        let remit_id     = String::from_str(&env, "INV-2025-MNL-001");

        let receiver_before = token.balance(&receiver);
        client.send_remittance(&sponsor, &token_addr, &receiver, &50_000_000, &remit_id);
        let receiver_after  = token.balance(&receiver);

        // Receiver balance increased by exactly 5 USDC
        assert_eq!(receiver_after - receiver_before, 50_000_000);

        // Receipt is stored and marked settled
        let receipt = client.get_receipt(&remit_id);
        assert!(receipt.settled);
        assert_eq!(receipt.amount, 50_000_000);
    }

    // ─── Test 5 — Edge Case: releasing grade before unlock panics ────────────
    //
    // release_tranche must be blocked when the grade bit has not been set.

    #[test]
    #[should_panic(expected = "grade not yet unlocked for this milestone")]
    fn test_release_without_grade_unlock_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let student = Address::generate(&env);
        let sponsor = Address::generate(&env);

        let token_addr = create_token(&env, &admin, &sponsor, 1_000_000_000);
        let client     = deploy(&env, &admin);

        client.enroll_student(&admin, &student, &2);
        client.deposit_funds(&sponsor, &token_addr, &student, &1_000_000_000);

        // Attempt to release without calling unlock_grade first — must panic
        client.release_tranche(&admin, &token_addr, &student, &0);
    }
}