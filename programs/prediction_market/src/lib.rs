pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
#[allow(unused_imports)]
pub use state::*;

declare_id!("3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A");

#[program]
pub mod prediction_market {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        fee_bps: u16,
        fee_recipient: Pubkey,
    ) -> Result<()> {
        instructions::initialize::init_handler(ctx, fee_bps, fee_recipient)
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        description: String,
        category: String,
        close_ts: i64,
        resolver: Pubkey,
    ) -> Result<()> {
        instructions::create_market::create_market_handler(
            ctx,
            question,
            description,
            category,
            close_ts,
            resolver,
        )
    }

    pub fn submit_position(
        ctx: Context<SubmitPosition>,
        outcome: u8,
        stake_amount: u64,
    ) -> Result<()> {
        instructions::submit_position::submit_position_handler(ctx, outcome, stake_amount)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        winning_outcome: u8,
    ) -> Result<()> {
        instructions::resolve_market::resolve_market_handler(ctx, winning_outcome)
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>) -> Result<()> {
        instructions::claim_payout::claim_payout_handler(ctx)
    }

    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        instructions::cancel_market::handler(ctx)
    }

    pub fn withdraw_position(ctx: Context<WithdrawPosition>) -> Result<()> {
        instructions::withdraw_position::handler(ctx)
    }
}
