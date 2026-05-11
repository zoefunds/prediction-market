use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::{
    constants::{MARKET_SEED, POSITION_SEED, VAULT_SEED},
    error::ErrorCode,
    events::PositionSubmitted,
    state::{Market, MarketStatus, Position},
};

#[derive(Accounts)]
pub struct SubmitPosition<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: vault PDA, lamports sink. Validated by seeds.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), payer.key().as_ref()],
        bump,
    )]
    pub position: Box<Account<'info, Position>>,

    pub system_program: Program<'info, System>,
}

pub fn submit_position_handler(
    ctx: Context<SubmitPosition>,
    outcome: u8,
    stake_amount: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        ErrorCode::MarketNotOpen
    );
    require!(now < ctx.accounts.market.close_ts, ErrorCode::MarketNotOpen);
    require!(stake_amount > 0, ErrorCode::ZeroStake);
    require!(outcome <= 1, ErrorCode::InvalidOutcome);

    // Move SOL into the vault.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    // Record the position.
    {
        let position = &mut ctx.accounts.position;
        position.market = ctx.accounts.market.key();
        position.user = ctx.accounts.payer.key();
        position.outcome = outcome;
        position.stake_amount = stake_amount;
        position.claimed = false;
        position.created_ts = now;
        position.bump = ctx.bumps.position;
    }

    // Update market totals synchronously.
    let market = &mut ctx.accounts.market;
    if outcome == 1 {
        market.yes_pool = market
            .yes_pool
            .checked_add(stake_amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
    } else {
        market.no_pool = market
            .no_pool
            .checked_add(stake_amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
    }
    market.total_positions = market
        .total_positions
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    emit!(PositionSubmitted {
        market: market.key(),
        user: ctx.accounts.payer.key(),
        stake_amount,
        total_positions: market.total_positions,
        timestamp: now,
    });

    Ok(())
}
