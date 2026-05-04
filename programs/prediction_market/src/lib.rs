pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

pub use constants::*;
pub use instructions::*;
#[allow(unused_imports)]
pub use state::*;

declare_id!("3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A");

#[arcium_program]
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
        initial_totals_ciphertext: [u8; 96],
        initial_totals_pubkey: [u8; 32],
        initial_totals_nonce: u128,
    ) -> Result<()> {
        instructions::create_market::create_market_handler(
            ctx,
            question,
            description,
            category,
            close_ts,
            resolver,
            initial_totals_ciphertext,
            initial_totals_pubkey,
            initial_totals_nonce,
        )
    }

    pub fn init_submit_position_comp_def(
        ctx: Context<InitSubmitPositionCompDef>,
    ) -> Result<()> {
        instructions::init_comp_defs::init_submit_position_comp_def_handler(ctx)
    }

    pub fn init_resolve_market_comp_def(
        ctx: Context<InitResolveMarketCompDef>,
    ) -> Result<()> {
        instructions::init_comp_defs::init_resolve_market_comp_def_handler(ctx)
    }

    pub fn init_claim_payout_comp_def(ctx: Context<InitClaimPayoutCompDef>) -> Result<()> {
        instructions::init_comp_defs::init_claim_payout_comp_def_handler(ctx)
    }
}
