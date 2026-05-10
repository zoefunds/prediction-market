use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::events::MarketCancelled;
use crate::state::{Market, MarketStatus};

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    /// The market creator (only they can cancel an open market).
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The market being cancelled. Must be in Open status, must be owned
    /// by `creator`.
    #[account(
        mut,
        seeds = [b"market", &market.id.to_le_bytes()[..]],
        bump = market.bump,
        has_one = creator @ ErrorCode::Unauthorized,
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.status == MarketStatus::Open,
        ErrorCode::MarketNotOpen,
    );

    let now = Clock::get()?.unix_timestamp;
    market.status = MarketStatus::Cancelled;
    market.resolved_ts = now;

    emit!(MarketCancelled {
        market: market.key(),
        creator: ctx.accounts.creator.key(),
        timestamp: now,
        total_positions: market.total_positions,
    });

    Ok(())
}
