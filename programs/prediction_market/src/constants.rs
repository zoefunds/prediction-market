/// Account seeds
pub const CONFIG_SEED: &[u8] = b"config";
pub const MARKET_SEED: &[u8] = b"market";
pub const POSITION_SEED: &[u8] = b"position";
pub const VAULT_SEED: &[u8] = b"vault";

/// Limits
pub const MAX_QUESTION_LEN: usize = 200;
pub const MAX_DESCRIPTION_LEN: usize = 1000;
pub const MAX_CATEGORY_LEN: usize = 32;

/// Computation-definition offsets, derived at compile-time from the circuit
/// name via SHA-256, matching the JS SDK's `getCompDefAccOffset()`.
pub const COMP_DEF_OFFSET_SUBMIT_POSITION: u32 =
    arcium_anchor::comp_def_offset("submit_position_v2");
pub const COMP_DEF_OFFSET_RESOLVE_MARKET: u32 =
    arcium_anchor::comp_def_offset("resolve_market_v2");
pub const COMP_DEF_OFFSET_CLAIM_PAYOUT: u32 =
    arcium_anchor::comp_def_offset("claim_payout_v2");
