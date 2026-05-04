use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::ID;

// ─────────────────────────────────────────────────────────────────────────────
// submit_position
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("submit_position", payer)]
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
    init_comp_def(ctx.accounts, None, None)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// resolve_market
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("resolve_market", payer)]
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
    init_comp_def(ctx.accounts, None, None)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// claim_payout
// ─────────────────────────────────────────────────────────────────────────────
#[init_computation_definition_accounts("claim_payout", payer)]
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
    init_comp_def(ctx.accounts, None, None)?;
    Ok(())
}
