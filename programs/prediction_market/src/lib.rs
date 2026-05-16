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

    // ── Position submission (encrypted) ─────────────────────────────────────
    pub fn init_market_totals(
        ctx: Context<InitMarketTotals>,
        computation_offset: u64,
    ) -> Result<()> {
        instructions::init_market_totals::init_market_totals_handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "init_market_totals")]
    pub fn init_market_totals_callback(
        ctx: Context<InitMarketTotalsCallback>,
        output: SignedComputationOutputs<InitMarketTotalsOutput>,
    ) -> Result<()> {
        instructions::init_market_totals::init_market_totals_callback_handler(ctx, output)
    }

    pub fn submit_position(
        ctx: Context<SubmitPositionV3>,
        computation_offset: u64,
        position_ciphertext: [u8; 64],
        user_pubkey: [u8; 32],
        nonce: u128,
        stake_amount: u64,
    ) -> Result<()> {
        instructions::submit_position::submit_position_handler(
            ctx,
            computation_offset,
            position_ciphertext,
            user_pubkey,
            nonce,
            stake_amount,
        )
    }

    #[arcium_callback(encrypted_ix = "submit_position_v3")]
    pub fn submit_position_v3_callback(
        ctx: Context<SubmitPositionV3Callback>,
        output: SignedComputationOutputs<SubmitPositionV3Output>,
    ) -> Result<()> {
        instructions::submit_position::submit_position_v3_callback_handler(ctx, output)
    }

    // ── Resolution ──────────────────────────────────────────────────────────
    pub fn request_resolution(
        ctx: Context<RequestResolution>,
        computation_offset: u64,
        outcome_ciphertext: [u8; 32],
        resolver_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        instructions::resolve_market::request_resolution_handler(
            ctx,
            computation_offset,
            outcome_ciphertext,
            resolver_pubkey,
            nonce,
        )
    }

    #[arcium_callback(encrypted_ix = "resolve_market_v2")]
    pub fn resolve_market_v2_callback(
        ctx: Context<ResolveMarketV2Callback>,
        output: SignedComputationOutputs<ResolveMarketV2Output>,
    ) -> Result<()> {
        instructions::resolve_market::resolve_market_v2_callback_handler(ctx, output)
    }

    // ── Claim ───────────────────────────────────────────────────────────────
    pub fn claim_payout(ctx: Context<ClaimPayout>, computation_offset: u64) -> Result<()> {
        instructions::claim_payout::claim_payout_handler(ctx, computation_offset)
    }

    #[arcium_callback(encrypted_ix = "claim_payout_v2")]
    pub fn claim_payout_v2_callback(
        ctx: Context<ClaimPayoutV2Callback>,
        output: SignedComputationOutputs<ClaimPayoutV2Output>,
    ) -> Result<()> {
        instructions::claim_payout::claim_payout_v2_callback_handler(ctx, output)
    }

    // ── Cancellation & withdrawal (new) ─────────────────────────────────────
    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        instructions::cancel_market::handler(ctx)
    }

    pub fn withdraw_position(ctx: Context<WithdrawPosition>) -> Result<()> {
        instructions::withdraw_position::handler(ctx)
    }

    // ── CompDef inits ───────────────────────────────────────────────────────
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
