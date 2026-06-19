#![no_std]
#![allow(deprecated)] // events().publish() is deprecated; suppressed until contractevent migration

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Bytes, BytesN, Env, Symbol,
    token::Client as TokenClient,
};

// ─── Storage keys ────────────────────────────────────────────────────────────

const ADMIN_KEY: Symbol = symbol_short!("admin");
const ROUTER_KEY: Symbol = symbol_short!("router");
const USDC_KEY: Symbol = symbol_short!("usdc");
const VAULT_COUNT_KEY: Symbol = symbol_short!("vcount");

const IMG_ALLOWANCE_KEY: Symbol = symbol_short!("img_allow");
const IMG_DELEGATION_KEY: Symbol = symbol_short!("img_deleg");
const IMG_COMPLIANCE_KEY: Symbol = symbol_short!("img_compl");
const IMG_ALLOWLIST_KEY: Symbol = symbol_short!("img_alist");

pub const POLICY_ALLOWANCE: Symbol = symbol_short!("allowance");
pub const POLICY_DELEGATION: Symbol = symbol_short!("delegat");
pub const POLICY_COMPLIANCE: Symbol = symbol_short!("comply");
pub const POLICY_ALLOWLIST: Symbol = symbol_short!("allowlist");

// ~30 days at 5s/ledger
const PERSISTENT_TTL_MIN: u32 = 500_000;
const PERSISTENT_TTL_MAX: u32 = 518_400;

// ─── Data types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultConfig {
    pub owner: Address,
    pub policy_type: Symbol,
    pub policy_commitment: BytesN<32>,
    pub spent_commitment: BytesN<32>,
    pub period_id: u64,
    pub balance: i128,
}

#[contracttype]
enum DataKey {
    VaultConfig(u32),
    Nullifier(u32, BytesN<32>),
    DelegateCommitment(u32),
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct CiphermitVault;

#[contractimpl]
impl CiphermitVault {
    // ── Admin / setup ──────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address, router: Address, usdc_token: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&ROUTER_KEY, &router);
        env.storage().instance().set(&USDC_KEY, &usdc_token);
        env.storage().instance().set(&VAULT_COUNT_KEY, &0u32);
    }

    pub fn set_image_id(env: Env, policy_type: Symbol, image_id: BytesN<32>) {
        Self::require_admin(&env);
        let key = Self::image_id_key(&policy_type);
        env.storage().instance().set(&key, &image_id);
    }

    // ── Vault lifecycle ────────────────────────────────────────────────────

    pub fn open_vault(
        env: Env,
        owner: Address,
        policy_type: Symbol,
        policy_commitment: BytesN<32>,
        initial_spent_commitment: BytesN<32>,
        period_id: u64,
    ) -> u32 {
        owner.require_auth();

        let key = Self::image_id_key(&policy_type);
        if !env.storage().instance().has(&key) {
            panic!("policy type not configured");
        }

        let vault_id: u32 = env.storage().instance().get(&VAULT_COUNT_KEY).unwrap_or(0);
        env.storage()
            .instance()
            .set(&VAULT_COUNT_KEY, &(vault_id + 1));

        let config = VaultConfig {
            owner,
            policy_type,
            policy_commitment,
            spent_commitment: initial_spent_commitment,
            period_id,
            balance: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::VaultConfig(vault_id), &config);
        env.storage().persistent().extend_ttl(
            &DataKey::VaultConfig(vault_id),
            PERSISTENT_TTL_MIN,
            PERSISTENT_TTL_MAX,
        );

        vault_id
    }

    pub fn deposit(env: Env, vault_id: u32, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "deposit must be positive");

        let usdc: Address = env.storage().instance().get(&USDC_KEY).unwrap();
        let token = TokenClient::new(&env, &usdc);
        let contract_id = env.current_contract_address();
        token.transfer(&from, &contract_id, &amount);

        let key = DataKey::VaultConfig(vault_id);
        let mut config: VaultConfig = env
            .storage()
            .persistent()
            .get(&key)
            .expect("vault not found");
        config.balance += amount;
        env.storage().persistent().set(&key, &config);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_TTL_MIN, PERSISTENT_TTL_MAX);
    }

    // ── Spend — the ZK-gated core function ────────────────────────────────

    #[allow(clippy::too_many_arguments)]
    pub fn spend(
        env: Env,
        vault_id: u32,
        owner: Address,
        to: Address,
        amount: i128,
        seal: Bytes,
        journal_digest: BytesN<32>,
        policy_commitment: BytesN<32>,
        new_spent_commitment: BytesN<32>,
        nullifier: BytesN<32>,
        action_context: BytesN<32>,
    ) {
        owner.require_auth();
        assert!(amount > 0, "spend amount must be positive");

        let vault_key = DataKey::VaultConfig(vault_id);
        let mut config: VaultConfig = env
            .storage()
            .persistent()
            .get(&vault_key)
            .expect("vault not found");

        assert!(config.owner == owner, "caller is not vault owner");
        assert!(
            config.policy_commitment == policy_commitment,
            "policy_commitment mismatch"
        );
        assert!(config.balance >= amount, "insufficient vault balance");

        // Bind proof to this exact (owner, to, amount) tuple — no substitution
        let expected_action_context =
            Self::compute_action_context(&env, &owner, &to, amount);
        assert!(
            action_context == expected_action_context,
            "action_context mismatch — possible parameter substitution"
        );

        // Anti-replay: nullifier must be fresh
        let null_key = DataKey::Nullifier(vault_id, nullifier.clone());
        assert!(
            !env.storage().persistent().has(&null_key),
            "nullifier already used"
        );

        // Reconstruct journal bytes and verify digest matches declared commitments
        let mut journal_bytes = Bytes::new(&env);
        journal_bytes.extend_from_array(&policy_commitment.to_array());
        journal_bytes.extend_from_array(&new_spent_commitment.to_array());
        journal_bytes.extend_from_array(&nullifier.to_array());
        journal_bytes.extend_from_array(&action_context.to_array());
        let computed_digest: BytesN<32> = env.crypto().sha256(&journal_bytes).into();
        assert!(
            journal_digest == computed_digest,
            "journal_digest mismatch — commitments do not match proof"
        );

        // ZK proof verification — the cryptographic guarantee
        let image_id_key = Self::image_id_key(&config.policy_type);
        let image_id: BytesN<32> = env
            .storage()
            .instance()
            .get(&image_id_key)
            .expect("image_id not configured for policy");

        let router: Address = env.storage().instance().get(&ROUTER_KEY).unwrap();
        let router_client = risc0_router::Client::new(&env, &router);
        router_client.verify(&seal, &image_id, &journal_digest);

        // All checks passed — execute spend

        env.storage().persistent().set(&null_key, &true);
        env.storage().persistent().extend_ttl(
            &null_key,
            PERSISTENT_TTL_MIN,
            PERSISTENT_TTL_MAX,
        );

        config.spent_commitment = new_spent_commitment;
        config.balance -= amount;
        env.storage().persistent().set(&vault_key, &config);
        env.storage().persistent().extend_ttl(
            &vault_key,
            PERSISTENT_TTL_MIN,
            PERSISTENT_TTL_MAX,
        );

        let usdc: Address = env.storage().instance().get(&USDC_KEY).unwrap();
        let token = TokenClient::new(&env, &usdc);
        let contract_id = env.current_contract_address();
        token.transfer(&contract_id, &to, &amount);

        // Emit only amount — no policy/identity leakage
        env.events()
            .publish((symbol_short!("spend"), vault_id), amount);
    }

    // ── Period roll ────────────────────────────────────────────────────────

    pub fn roll_period(
        env: Env,
        vault_id: u32,
        owner: Address,
        new_period_id: u64,
        fresh_spent_commitment: BytesN<32>,
    ) {
        owner.require_auth();
        let key = DataKey::VaultConfig(vault_id);
        let mut config: VaultConfig = env
            .storage()
            .persistent()
            .get(&key)
            .expect("vault not found");
        assert!(config.owner == owner, "caller is not vault owner");
        assert!(
            new_period_id > config.period_id,
            "new_period_id must be greater than current"
        );
        config.period_id = new_period_id;
        config.spent_commitment = fresh_spent_commitment;
        env.storage().persistent().set(&key, &config);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_TTL_MIN, PERSISTENT_TTL_MAX);
    }

    // ── Delegation set update (owner grants/revokes by updating the Merkle commitment) ─

    pub fn update_delegate_commitment(
        env: Env,
        vault_id: u32,
        owner: Address,
        new_delegate_commitment: BytesN<32>,
    ) {
        owner.require_auth();
        let vault_key = DataKey::VaultConfig(vault_id);
        let config: VaultConfig = env
            .storage()
            .persistent()
            .get(&vault_key)
            .expect("vault not found");
        assert!(config.owner == owner, "caller is not vault owner");
        let deleg_key = DataKey::DelegateCommitment(vault_id);
        env.storage()
            .persistent()
            .set(&deleg_key, &new_delegate_commitment);
        env.storage().persistent().extend_ttl(
            &deleg_key,
            PERSISTENT_TTL_MIN,
            PERSISTENT_TTL_MAX,
        );
    }

    // ── Views ──────────────────────────────────────────────────────────────

    pub fn vault_balance(env: Env, vault_id: u32) -> i128 {
        let config: VaultConfig = env
            .storage()
            .persistent()
            .get(&DataKey::VaultConfig(vault_id))
            .expect("vault not found");
        config.balance
    }

    pub fn vault_period(env: Env, vault_id: u32) -> u64 {
        let config: VaultConfig = env
            .storage()
            .persistent()
            .get(&DataKey::VaultConfig(vault_id))
            .expect("vault not found");
        config.period_id
    }

    pub fn vault_count(env: Env) -> u32 {
        env.storage().instance().get(&VAULT_COUNT_KEY).unwrap_or(0)
    }

    // ── Internals ──────────────────────────────────────────────────────────

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("not initialized");
        admin.require_auth();
    }

    fn image_id_key(policy_type: &Symbol) -> Symbol {
        if *policy_type == POLICY_ALLOWANCE {
            IMG_ALLOWANCE_KEY
        } else if *policy_type == POLICY_DELEGATION {
            IMG_DELEGATION_KEY
        } else if *policy_type == POLICY_COMPLIANCE {
            IMG_COMPLIANCE_KEY
        } else if *policy_type == POLICY_ALLOWLIST {
            IMG_ALLOWLIST_KEY
        } else {
            panic!("unknown policy type")
        }
    }

    fn compute_action_context(env: &Env, owner: &Address, to: &Address, amount: i128) -> BytesN<32> {
        let mut data = Bytes::new(env);
        data.extend_from_array(&Self::addr_canonical(env, owner));
        data.extend_from_array(&Self::addr_canonical(env, to));
        data.extend_from_array(&(amount as u64).to_le_bytes());
        env.crypto().sha256(&data).into()
    }

    fn addr_canonical(env: &Env, addr: &Address) -> [u8; 32] {
        // Hash the strkey string to get a canonical 32-byte representation.
        // The prover must use the same encoding (sha256 of the G... strkey bytes).
        let s = addr.to_string();
        let bytes = s.to_bytes();
        let h: BytesN<32> = env.crypto().sha256(&bytes).into();
        h.to_array()
    }
}

// ─── RISC Zero Router client (minimal interface for cross-contract call) ─────

mod risc0_router {
    use soroban_sdk::{contractclient, Bytes, BytesN, Env};

    #[contractclient(name = "Client")]
    pub trait RiscZeroVerifierRouter {
        // Mirrors RiscZeroVerifierRouterInterface::verify.
        // On success the router returns Ok(()), serialized as ScVal::Void → `()`.
        // On failure the router panics/errors → our tx reverts.
        fn verify(env: Env, seal: Bytes, image_id: BytesN<32>, journal: BytesN<32>);
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    mod mock_router {
        use soroban_sdk::{contract, contractimpl, Bytes, BytesN, Env};

        #[contract]
        pub struct MockRouter;

        #[contractimpl]
        impl MockRouter {
            // Always accepts — unit tests verify policy logic, not crypto
            pub fn verify(_env: Env, _seal: Bytes, _image_id: BytesN<32>, _journal: BytesN<32>) {}
        }
    }

    mod mock_token {
        use soroban_sdk::{contract, contractimpl, Address, Env};

        #[contract]
        pub struct MockToken;

        #[contractimpl]
        impl MockToken {
            pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
        }
    }

    fn setup(env: &Env) -> (Address, Address, Address, Address) {
        env.mock_all_auths();
        let admin = Address::generate(env);
        let router_id = env.register(mock_router::MockRouter, ());
        let usdc_id = env.register(mock_token::MockToken, ());
        let vault_id = env.register(CiphermitVault, ());

        let client = CiphermitVaultClient::new(env, &vault_id);
        client.initialize(&admin, &router_id, &usdc_id);
        let dummy_image_id = BytesN::from_array(env, &[1u8; 32]);
        client.set_image_id(&POLICY_ALLOWANCE, &dummy_image_id);

        (vault_id, admin, router_id, usdc_id)
    }

    fn make_b32(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    fn action_context(env: &Env, owner: &Address, to: &Address, amount: i128) -> BytesN<32> {
        let mut data = Bytes::new(env);
        let oh: BytesN<32> = env.crypto().sha256(&owner.to_string().to_bytes()).into();
        let th: BytesN<32> = env.crypto().sha256(&to.to_string().to_bytes()).into();
        data.extend_from_array(&oh.to_array());
        data.extend_from_array(&th.to_array());
        data.extend_from_array(&(amount as u64).to_le_bytes());
        env.crypto().sha256(&data).into()
    }

    fn journal_digest(
        env: &Env,
        pc: &BytesN<32>,
        nsc: &BytesN<32>,
        null: &BytesN<32>,
        ac: &BytesN<32>,
    ) -> BytesN<32> {
        let mut j = Bytes::new(env);
        j.extend_from_array(&pc.to_array());
        j.extend_from_array(&nsc.to_array());
        j.extend_from_array(&null.to_array());
        j.extend_from_array(&ac.to_array());
        env.crypto().sha256(&j).into()
    }

    #[test]
    fn open_vault_and_deposit() {
        let env = Env::default();
        let (vid, _, _, _) = setup(&env);
        let client = CiphermitVaultClient::new(&env, &vid);

        let owner = Address::generate(&env);
        let pc = make_b32(&env, 0xAA);
        let isc = make_b32(&env, 0x00);
        let id = client.open_vault(&owner, &POLICY_ALLOWANCE, &pc, &isc, &1u64);
        assert_eq!(id, 0);
        assert_eq!(client.vault_count(), 1);

        client.deposit(&id, &owner, &1_000_000i128);
        assert_eq!(client.vault_balance(&id), 1_000_000i128);
    }

    #[test]
    fn spend_happy_path() {
        let env = Env::default();
        let (vid, _, _, _) = setup(&env);
        let client = CiphermitVaultClient::new(&env, &vid);

        let owner = Address::generate(&env);
        let to = Address::generate(&env);
        let pc = make_b32(&env, 0xAA);
        let isc = make_b32(&env, 0x00);
        let id = client.open_vault(&owner, &POLICY_ALLOWANCE, &pc, &isc, &1u64);
        client.deposit(&id, &owner, &1_000_000i128);

        let nsc = make_b32(&env, 0x01);
        let null = make_b32(&env, 0x02);
        let ac = action_context(&env, &owner, &to, 100);
        let jd = journal_digest(&env, &pc, &nsc, &null, &ac);
        let seal = Bytes::from_slice(&env, &[0u8; 4]);

        client.spend(&id, &owner, &to, &100i128, &seal, &jd, &pc, &nsc, &null, &ac);
        assert_eq!(client.vault_balance(&id), 999_900i128);
    }

    #[test]
    #[should_panic(expected = "nullifier already used")]
    fn replay_rejected() {
        let env = Env::default();
        let (vid, _, _, _) = setup(&env);
        let client = CiphermitVaultClient::new(&env, &vid);

        let owner = Address::generate(&env);
        let to = Address::generate(&env);
        let pc = make_b32(&env, 0xAA);
        let isc = make_b32(&env, 0x00);
        let id = client.open_vault(&owner, &POLICY_ALLOWANCE, &pc, &isc, &1u64);
        client.deposit(&id, &owner, &2_000_000i128);

        let nsc = make_b32(&env, 0x01);
        let null = make_b32(&env, 0x99);
        let ac = action_context(&env, &owner, &to, 100);
        let jd = journal_digest(&env, &pc, &nsc, &null, &ac);
        let seal = Bytes::from_slice(&env, &[0u8; 4]);

        client.spend(&id, &owner, &to, &100i128, &seal, &jd, &pc, &nsc, &null, &ac);
        client.spend(&id, &owner, &to, &100i128, &seal, &jd, &pc, &nsc, &null, &ac);
    }

    #[test]
    #[should_panic(expected = "policy_commitment mismatch")]
    fn wrong_policy_rejected() {
        let env = Env::default();
        let (vid, _, _, _) = setup(&env);
        let client = CiphermitVaultClient::new(&env, &vid);

        let owner = Address::generate(&env);
        let to = Address::generate(&env);
        let pc = make_b32(&env, 0xAA);
        let isc = make_b32(&env, 0x00);
        let id = client.open_vault(&owner, &POLICY_ALLOWANCE, &pc, &isc, &1u64);
        client.deposit(&id, &owner, &1_000_000i128);

        let wrong_pc = make_b32(&env, 0xFF);
        let nsc = make_b32(&env, 0x01);
        let null = make_b32(&env, 0x02);
        let ac = action_context(&env, &owner, &to, 100);
        let jd = journal_digest(&env, &wrong_pc, &nsc, &null, &ac);
        let seal = Bytes::from_slice(&env, &[0u8; 4]);

        client.spend(&id, &owner, &to, &100i128, &seal, &jd, &wrong_pc, &nsc, &null, &ac);
    }

    #[test]
    #[should_panic(expected = "action_context mismatch")]
    fn param_substitution_rejected() {
        let env = Env::default();
        let (vid, _, _, _) = setup(&env);
        let client = CiphermitVaultClient::new(&env, &vid);

        let owner = Address::generate(&env);
        let to = Address::generate(&env);
        let pc = make_b32(&env, 0xAA);
        let isc = make_b32(&env, 0x00);
        let id = client.open_vault(&owner, &POLICY_ALLOWANCE, &pc, &isc, &1u64);
        client.deposit(&id, &owner, &1_000_000i128);

        // Proof was for amount=100 but we try to submit amount=999
        let nsc = make_b32(&env, 0x01);
        let null = make_b32(&env, 0x02);
        let ac = action_context(&env, &owner, &to, 100); // proof covers 100
        let jd = journal_digest(&env, &pc, &nsc, &null, &ac);
        let seal = Bytes::from_slice(&env, &[0u8; 4]);

        // amount=999 causes action_context recomputation to differ
        client.spend(&id, &owner, &to, &999i128, &seal, &jd, &pc, &nsc, &null, &ac);
    }
}
