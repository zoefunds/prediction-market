use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    /// 0 = NO, 1 = YES.
    pub outcome: u8,
    /// Lamports staked.
    pub stake_amount: u64,
    /// Has this position been claimed post-resolution?
    pub claimed: bool,
    pub created_ts: i64,
    pub bump: u8,
}
