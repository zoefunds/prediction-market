use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub id: u64,
    pub creator: Pubkey,
    pub close_ts: i64,
}

#[event]
pub struct PositionSubmitted {
    pub market: Pubkey,
    pub user: Pubkey,
    pub stake_amount: u64,
    pub total_positions: u32,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolutionRequested {
    pub market: Pubkey,
    pub resolver: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_outcome: u8,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub timestamp: i64,
}

#[event]
pub struct PayoutClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}
