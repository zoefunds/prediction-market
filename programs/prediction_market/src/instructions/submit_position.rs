use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{
    constants::{COMP_DEF_OFFSET_SUBMIT_POSITION, MARKET_SEED, POSITION_SEED, VAULT_SEED},
    error::ErrorCode,
    events::PositionSubmitted,
    state::{Market, MarketStatus, Position},
    ArciumSignerAccount, ID, ID_CONST,
};

#[queue_computation_accounts("submit_position_v3", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct SubmitPositionV3<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: vault PDA, only receives lamports.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + Position::INIT_SPACE,
        seeds = [POSITION_SEED, market.key().as_ref(), payer.key().as_ref()],
        bump,
    )]
    pub position: Box<Account<'info, Position>>,

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
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_POSITION))]
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

pub fn submit_position_handler(
    ctx: Context<SubmitPositionV3>,
    computation_offset: u64,
    position_ciphertext: [u8; 64],
    user_pubkey: [u8; 32],
    nonce: u128,
    stake_amount: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        ErrorCode::MarketNotOpen
    );
    require!(now < ctx.accounts.market.close_ts, ErrorCode::MarketNotOpen);
    require!(stake_amount > 0, ErrorCode::ZeroStake);

    let market_key = ctx.accounts.market.key();
    let market_total_positions_now = ctx.accounts.market.total_positions;
    let totals_pubkey = ctx.accounts.market.totals_pubkey;
    let totals_nonce = ctx.accounts.market.totals_nonce;
    let totals_ciphertext = ctx.accounts.market.totals_ciphertext;

    {
        let position = &mut ctx.accounts.position;
        position.market = market_key;
        position.user = ctx.accounts.payer.key();
        position.ciphertext = position_ciphertext;
        position.user_pubkey = user_pubkey;
        position.nonce = nonce;
        position.stake_amount = stake_amount;
        position.claimed = false;
        position.created_ts = now;
        position.bump = ctx.bumps.position;
    }
    let position_key = ctx.accounts.position.key();

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        stake_amount,
    )?;

    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(user_pubkey)
        .plaintext_u128(nonce)
        .encrypted_u8(slice_32(&position_ciphertext, 0))
        .encrypted_u64(slice_32(&position_ciphertext, 1))
        .plaintext_u128(totals_nonce)
        .encrypted_u64(slice_32(&totals_ciphertext, 0))
        .encrypted_u64(slice_32(&totals_ciphertext, 1))
        .encrypted_u32(slice_32(&totals_ciphertext, 2))
        .build();

    let extra_accounts = vec![
        CallbackAccount { pubkey: market_key, is_writable: true },
        CallbackAccount { pubkey: position_key, is_writable: true },
    ];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![SubmitPositionV3Callback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &extra_accounts,
        )?],
        1,
        0,
    )?;

    emit!(PositionSubmitted {
        market: market_key,
        user: ctx.accounts.payer.key(),
        stake_amount,
        total_positions: market_total_positions_now,
        timestamp: now,
    });

    Ok(())
}

#[callback_accounts("submit_position_v3")]
#[derive(Accounts)]
pub struct SubmitPositionV3Callback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_SUBMIT_POSITION))]
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

    #[account(mut)]
    pub position: Box<Account<'info, Position>>,
}

pub fn submit_position_v3_callback_handler(
    ctx: Context<SubmitPositionV3Callback>,
    output: SignedComputationOutputs<SubmitPositionV3Output>,
) -> Result<()> {
    let outputs = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(o) => o,
        Err(_) => return Err(ErrorCode::AbortedComputation.into()),
    };

    // Single output: Enc<Mxe, MarketTotals> — 3 ciphertext elements
    let new_totals = &outputs.field_0;

    let market = &mut ctx.accounts.market;
    let mut totals_packed = [0u8; 96];
    totals_packed[..32].copy_from_slice(&new_totals.ciphertexts[0]);
    totals_packed[32..64].copy_from_slice(&new_totals.ciphertexts[1]);
    totals_packed[64..].copy_from_slice(&new_totals.ciphertexts[2]);
    market.totals_ciphertext = totals_packed;
    market.totals_nonce = new_totals.nonce;
    market.total_positions = market
        .total_positions
        .checked_add(1)
        .ok_or(ErrorCode::AbortedComputation)?;

    Ok(())
}
fn slice_32(blob: &[u8], idx: usize) -> [u8; 32] {
    let mut out = [0u8; 32];
    let start = idx * 32;
    out.copy_from_slice(&blob[start..start + 32]);
    out
}
