use anchor_lang::prelude::*;

use crate::{
    constants::MARKET_SEED,
    error::ErrorCode,
    events::MarketResolved,
    state::{Market, MarketStatus},
};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
        constraint = market.resolver == resolver.key() @ ErrorCode::UnauthorizedResolver,
    )]
    pub market: Box<Account<'info, Market>>,
}

pub fn resolve_market_handler(
    ctx: Context<ResolveMarket>,
    winning_outcome: u8,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let market = &mut ctx.accounts.market;

    require!(
        market.status == MarketStatus::Open,
        ErrorCode::AlreadyResolved
    );
    require!(now >= market.close_ts, ErrorCode::MarketNotClosed);
    require!(winning_outcome <= 1, ErrorCode::InvalidOutcome);

    market.winning_outcome = winning_outcome;
    market.resolved_ts = now;
    market.status = MarketStatus::Resolved;

    emit!(MarketResolved {
        market: market.key(),
        winning_outcome,
        yes_pool: market.yes_pool,
        no_pool: market.no_pool,
        timestamp: now,
    });

    Ok(())
}
