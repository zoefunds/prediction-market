use anchor_lang::prelude::*;

/// Global program config — singleton.
#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Authority allowed to perform admin ops (pause, set fee, etc.)
    pub authority: Pubkey,
    /// Protocol fee in basis points (1 bp = 0.01%). Charged on winning payouts.
    pub fee_bps: u16,
    /// Where fees accrue.
    pub fee_recipient: Pubkey,
    /// Total markets created (monotonic counter for PDAs).
    pub market_count: u64,
    /// Bump for the PDA.
    pub bump: u8,
}
