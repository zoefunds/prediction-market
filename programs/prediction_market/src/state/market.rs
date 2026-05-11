use anchor_lang::prelude::*;

use crate::constants::{MAX_CATEGORY_LEN, MAX_DESCRIPTION_LEN, MAX_QUESTION_LEN};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Open,
    AwaitingResolution,
    Resolved,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Monotonic ID (== Config.market_count at creation).
    pub id: u64,
    /// Wallet that created the market and earns the creator fee.
    pub creator: Pubkey,
    /// Who is permitted to call `resolve_market`. Often == creator,
    /// but could be a designated oracle pubkey.
    pub resolver: Pubkey,
    /// The yes/no question.
    #[max_len(MAX_QUESTION_LEN)]
    pub question: String,
    #[max_len(MAX_DESCRIPTION_LEN)]
    pub description: String,
    #[max_len(MAX_CATEGORY_LEN)]
    pub category: String,
    /// Unix timestamp after which no more positions may be submitted.
    pub close_ts: i64,
    /// Unix timestamp when the market was actually resolved (0 until resolved).
    pub resolved_ts: i64,
    /// Status flag.
    pub status: MarketStatus,
    /// After resolution, 0 = NO won, 1 = YES won.
    pub winning_outcome: u8,
    /// Total YES pool (lamports). Updated synchronously on every YES stake.
    pub yes_pool: u64,
    /// Total NO pool. Updated synchronously on every NO stake.
    pub no_pool: u64,
    /// Total participants — incremented synchronously on every successful submit.
    pub total_positions: u32,
    /// Bump for the Market PDA.
    pub bump: u8,
    /// Bump for the vault PDA holding stakes.
    pub vault_bump: u8,
}
