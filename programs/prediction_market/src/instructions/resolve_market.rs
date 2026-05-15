use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{
    constants::{COMP_DEF_OFFSET_RESOLVE_MARKET, MARKET_SEED},
    error::ErrorCode,
    events::{MarketResolutionRequested, MarketResolved},
    state::{Market, MarketStatus},
    ArciumSignerAccount, ID, ID_CONST,
};

#[queue_computation_accounts("resolve_market", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct RequestResolution<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub resolver: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
        constraint = market.resolver == resolver.key() @ ErrorCode::UnauthorizedResolver,
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
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_MARKET))]
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

pub fn request_resolution_handler(
    ctx: Context<RequestResolution>,
    computation_offset: u64,
    outcome_ciphertext: [u8; 32],
    resolver_pubkey: [u8; 32],
    nonce: u128,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        ErrorCode::AlreadyResolved
    );
    require!(now >= ctx.accounts.market.close_ts, ErrorCode::MarketNotClosed);

    let market_key = ctx.accounts.market.key();
    let totals_nonce = ctx.accounts.market.totals_nonce;
    let totals_ciphertext = ctx.accounts.market.totals_ciphertext;

    {
        let market = &mut ctx.accounts.market;
        market.status = MarketStatus::AwaitingResolution;
    }

    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(resolver_pubkey)
        .plaintext_u128(nonce)
        .encrypted_u8(outcome_ciphertext)
        .plaintext_u128(totals_nonce)
        .encrypted_u64(slice_32(&totals_ciphertext, 0))
        .encrypted_u64(slice_32(&totals_ciphertext, 1))
        .encrypted_u32(slice_32(&totals_ciphertext, 2))
        .build();

    let extra_accounts = vec![CallbackAccount {
        pubkey: market_key,
        is_writable: true,
    }];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![ResolveMarketCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &extra_accounts,
        )?],
        1,
        0,
    )?;

    emit!(MarketResolutionRequested {
        market: market_key,
        resolver: ctx.accounts.resolver.key(),
        timestamp: now,
    });

    Ok(())
}

#[callback_accounts("resolve_market")]
#[derive(Accounts)]
pub struct ResolveMarketCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_RESOLVE_MARKET))]
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

pub fn resolve_market_callback_handler(
    ctx: Context<ResolveMarketCallback>,
    output: SignedComputationOutputs<ResolveMarketOutput>,
) -> Result<()> {
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(o) => o,
        Err(_) => return Err(ErrorCode::AbortedComputation.into()),
    };

    let inner = &result.field_0;
    let now = Clock::get()?.unix_timestamp;
    let market_key = ctx.accounts.market.key();

    let winning_outcome = inner.field_0;
    let yes_pool = inner.field_1;
    let no_pool = inner.field_2;

    {
        let market = &mut ctx.accounts.market;
        market.winning_outcome = winning_outcome;
        market.yes_pool = yes_pool;
        market.no_pool = no_pool;
        market.resolved_ts = now;
        market.status = MarketStatus::Resolved;
    }

    emit!(MarketResolved {
        market: market_key,
        winning_outcome,
        yes_pool,
        no_pool,
        timestamp: now,
    });

    Ok(())
}

fn slice_32(blob: &[u8], idx: usize) -> [u8; 32] {
    let mut out = [0u8; 32];
    let start = idx * 32;
    out.copy_from_slice(&blob[start..start + 32]);
    out
}
