use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{
    constants::{COMP_DEF_OFFSET_INIT_TOTALS, MARKET_SEED},
    error::ErrorCode,
    state::Market,
    ArciumSignerAccount, ID, ID_CONST,
};

#[queue_computation_accounts("init_market_totals", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct InitMarketTotals<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Box<Account<'info, ArciumSignerAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: arcium-checked.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: arcium-checked.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: arcium-checked.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_TOTALS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Box<Account<'info, FeePool>>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Box<Account<'info, ClockAccount>>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

pub fn init_market_totals_handler(
    ctx: Context<InitMarketTotals>,
    computation_offset: u64,
) -> Result<()> {
    let market_key = ctx.accounts.market.key();
    let pubkey = ctx.accounts.market.totals_pubkey;
    let nonce = ctx.accounts.market.totals_nonce;
    let ct = ctx.accounts.market.totals_ciphertext;

    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(pubkey)
        .plaintext_u128(nonce)
        .encrypted_u64(slice_32(&ct, 0))
        .encrypted_u64(slice_32(&ct, 1))
        .encrypted_u32(slice_32(&ct, 2))
        .build();

    let extra_accounts = vec![CallbackAccount {
        pubkey: market_key,
        is_writable: true,
    }];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![InitMarketTotalsCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &extra_accounts,
        )?],
        1,
        0,
    )?;

    Ok(())
}

#[callback_accounts("init_market_totals")]
#[derive(Accounts)]
pub struct InitMarketTotalsCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_TOTALS))]
    pub comp_def_account: Box<Account<'info, ComputationDefinitionAccount>>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    /// CHECK: arcium-checked.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Box<Account<'info, Cluster>>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions sysvar.
    pub instructions_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
}

pub fn init_market_totals_callback_handler(
    ctx: Context<InitMarketTotalsCallback>,
    output: SignedComputationOutputs<InitMarketTotalsOutput>,
) -> Result<()> {
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(o) => o,
        Err(_) => return Err(ErrorCode::AbortedComputation.into()),
    };

    let new_totals = &result.field_0;
    let mut packed = [0u8; 96];
    packed[..32].copy_from_slice(&new_totals.ciphertexts[0]);
    packed[32..64].copy_from_slice(&new_totals.ciphertexts[1]);
    packed[64..].copy_from_slice(&new_totals.ciphertexts[2]);

    let market = &mut ctx.accounts.market;
    market.totals_ciphertext = packed;
    market.totals_nonce = new_totals.nonce;

    Ok(())
}

fn slice_32(blob: &[u8], idx: usize) -> [u8; 32] {
    let mut out = [0u8; 32];
    let start = idx * 32;
    out.copy_from_slice(&blob[start..start + 32]);
    out
}
