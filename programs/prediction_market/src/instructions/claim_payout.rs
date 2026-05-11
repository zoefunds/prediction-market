use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::{
    constants::{MARKET_SEED, POSITION_SEED, VAULT_SEED},
    error::ErrorCode,
    events::PayoutClaimed,
    state::{Market, MarketStatus, Position},
};

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Resolved @ ErrorCode::NotResolved,
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: vault PDA, lamports source.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        has_one = user @ ErrorCode::Unauthorized,
        constraint = !position.claimed @ ErrorCode::AlreadyClaimed,
    )]
    pub position: Box<Account<'info, Position>>,

    pub system_program: Program<'info, System>,
}

pub fn claim_payout_handler(ctx: Context<ClaimPayout>) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.position;
    let now = Clock::get()?.unix_timestamp;

    let won = position.outcome == market.winning_outcome;

    let payout: u64 = if won {
        // Winner takes a proportional slice of the total pool.
        // payout = stake * (yes_pool + no_pool) / winning_pool
        let total_pool = market
            .yes_pool
            .checked_add(market.no_pool)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let winning_pool = if market.winning_outcome == 1 {
            market.yes_pool
        } else {
            market.no_pool
        };
        if winning_pool == 0 {
            0
        } else {
            let scaled = (position.stake_amount as u128)
                .checked_mul(total_pool as u128)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            (scaled / winning_pool as u128) as u64
        }
    } else {
        0
    };

    position.claimed = true;

    if payout > 0 {
        require!(
            ctx.accounts.vault.lamports() >= payout,
            ErrorCode::InsufficientVaultBalance,
        );
        let market_key = market.key();
        let vault_bump = market.vault_bump;
        let vault_seeds: &[&[u8]] =
            &[VAULT_SEED, market_key.as_ref(), &[vault_bump]];
        let signer_seeds = &[vault_seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                signer_seeds,
            ),
            payout,
        )?;
    }

    emit!(PayoutClaimed {
        market: market.key(),
        user: ctx.accounts.user.key(),
        amount: payout,
        timestamp: now,
    });

    Ok(())
}
