use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::{CircuitSource, OffChainCircuitSource};
use arcium_macros::circuit_hash;

const SUBMIT_POSITION_V3_URL: &str =
    "https://raw.githubusercontent.com/zoefunds/prediction-market/main/build/submit_position_v3.arcis";
const RESOLVE_MARKET_V2_URL: &str =
    "https://raw.githubusercontent.com/zoefunds/prediction-market/main/build/resolve_market_v2.arcis";
const CLAIM_PAYOUT_V2_URL: &str =
    "https://raw.githubusercontent.com/zoefunds/prediction-market/main/build/claim_payout_v2.arcis";

use crate::ID;

// ─────────────────────────────────────────────────────────────────────────────
// submit_position
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("submit_position_v3", payer)]
#[derive(Accounts)]
pub struct InitSubmitPositionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program is the Address Lookup Table program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

pub fn init_submit_position_comp_def_handler(
    ctx: Context<InitSubmitPositionCompDef>,
) -> Result<()> {
    let source = CircuitSource::OffChain(OffChainCircuitSource {
        source: SUBMIT_POSITION_V3_URL.to_string(),
        hash: circuit_hash!("submit_position_v3"),
    });
    init_comp_def(ctx.accounts, Some(source), None)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// resolve_market
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("resolve_market_v2", payer)]
#[derive(Accounts)]
pub struct InitResolveMarketCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

pub fn init_resolve_market_comp_def_handler(
    ctx: Context<InitResolveMarketCompDef>,
) -> Result<()> {
    let source = CircuitSource::OffChain(OffChainCircuitSource {
        source: RESOLVE_MARKET_V2_URL.to_string(),
        hash: circuit_hash!("resolve_market_v2"),
    });
    init_comp_def(ctx.accounts, Some(source), None)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// claim_payout
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("claim_payout_v2", payer)]
#[derive(Accounts)]
pub struct InitClaimPayoutCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account, checked by arcium program.
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table, checked by arcium program.
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program.
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

pub fn init_claim_payout_comp_def_handler(ctx: Context<InitClaimPayoutCompDef>) -> Result<()> {
    let source = CircuitSource::OffChain(OffChainCircuitSource {
        source: CLAIM_PAYOUT_V2_URL.to_string(),
        hash: circuit_hash!("claim_payout_v2"),
    });
    init_comp_def(ctx.accounts, Some(source), None)?;
    Ok(())
}
