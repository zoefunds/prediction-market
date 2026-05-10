use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

use crate::error::ErrorCode;
use crate::events::PositionWithdrawn;
use crate::state::{Market, MarketStatus, Position};

#[derive(Accounts)]
pub struct WithdrawPosition<'info> {
    /// The position holder.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The market the position belongs to. Must be Cancelled.
    #[account(
        mut,
        seeds = [b"market", &market.id.to_le_bytes()[..]],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: vault PDA holding the stakes (system-owned). Validated by seeds.
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: AccountInfo<'info>,

    /// The user's position on this market. Closed on success; rent → user.
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump = position.bump,
        has_one = user @ ErrorCode::Unauthorized,
        close = user,
    )]
    pub position: Box<Account<'info, Position>>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawPosition>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &ctx.accounts.position;

    require!(
        market.status == MarketStatus::Cancelled,
        ErrorCode::MarketNotCancelled,
    );
    require!(!position.claimed, ErrorCode::AlreadyClaimed);

    let stake = position.stake_amount;
    require!(stake > 0, ErrorCode::InvalidStake);

    require!(
        ctx.accounts.vault.lamports() >= stake,
        ErrorCode::VaultUnderfunded,
    );

    // Transfer via system_program with PDA signer seeds.
    let market_key = market.key();
    let vault_bump = market.vault_bump;
    let vault_seeds: &[&[u8]] = &[b"vault", market_key.as_ref(), &[vault_bump]];
    let signer_seeds = &[vault_seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        },
        signer_seeds,
    );
    system_program::transfer(cpi_ctx, stake)?;

    market.total_positions = market.total_positions.checked_sub(1).unwrap_or(0);

    emit!(PositionWithdrawn {
        market: market_key,
        user: ctx.accounts.user.key(),
        amount: stake,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
