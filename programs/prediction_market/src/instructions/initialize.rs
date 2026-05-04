use anchor_lang::prelude::*;

use crate::{constants::CONFIG_SEED, state::Config};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

pub fn init_handler(
    ctx: Context<Initialize>,
    fee_bps: u16,
    fee_recipient: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.authority = ctx.accounts.authority.key();
    config.fee_bps = fee_bps;
    config.fee_recipient = fee_recipient;
    config.market_count = 0;
    config.bump = ctx.bumps.config;

    msg!(
        "Config initialized: authority={} fee_bps={}",
        config.authority,
        fee_bps
    );
    Ok(())
}
