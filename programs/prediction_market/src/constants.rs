/// Account seeds
pub const CONFIG_SEED: &[u8] = b"config";
pub const MARKET_SEED: &[u8] = b"market";
pub const POSITION_SEED: &[u8] = b"position";
pub const VAULT_SEED: &[u8] = b"vault";

/// Limits
pub const MAX_QUESTION_LEN: usize = 200;
pub const MAX_DESCRIPTION_LEN: usize = 1000;
pub const MAX_CATEGORY_LEN: usize = 32;

/// Computation-definition offsets.
/// These are local-use sentinels. The Arcium macros derive the canonical
/// on-chain offset from the circuit name, so the value here only needs to be
/// distinct within this MXE. They are passed to `derive_comp_def_pda!()`.
pub const COMP_DEF_OFFSET_SUBMIT_POSITION: u32 = 0xC0DE_0001;
pub const COMP_DEF_OFFSET_RESOLVE_MARKET: u32 = 0xC0DE_0002;
pub const COMP_DEF_OFFSET_CLAIM_PAYOUT: u32 = 0xC0DE_0003;
