use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;
use arcium_client::idl::arcium::types::CallbackAccount;

use crate::{
    constants::{COMP_DEF_OFFSET_CLAIM_PAYOUT, MARKET_SEED, POSITION_SEED, VAULT_SEED},
    error::ErrorCode,
    events::PayoutClaimed,
    state::{Market, MarketStatus, Position},
    ArciumSignerAccount, ID, ID_CONST,
};

#[queue_computation_accounts("claim_payout", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [MARKET_SEED, &market.id.to_le_bytes()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Resolved @ ErrorCode::NotResolved,
    )]
    pub market: Box<Account<'info, Market>>,

    /// CHECK: vault PDA, lamports source.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, market.key().as_ref(), payer.key().as_ref()],
        bump = position.bump,
        constraint = position.user == payer.key() @ ErrorCode::UnauthorizedResolver,
        constraint = !position.claimed @ ErrorCode::AlreadyClaimed,
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
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_PAYOUT))]
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

pub fn claim_payout_handler(
    ctx: Context<ClaimPayout>,
    computation_offset: u64,
) -> Result<()> {
    let market = &ctx.accounts.market;
    let position = &ctx.accounts.position;

    ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

    let args = ArgBuilder::new()
        .x25519_pubkey(position.user_pubkey)
        .plaintext_u128(position.nonce)
        .encrypted_u8(slice_32(&position.ciphertext, 0))
        .encrypted_u64(slice_32(&position.ciphertext, 1))
        .plaintext_u8(market.winning_outcome)
        .build();

    let extra_accounts = vec![
        CallbackAccount { pubkey: market.key(), is_writable: false },
        CallbackAccount { pubkey: position.key(), is_writable: true },
        CallbackAccount { pubkey: ctx.accounts.payer.key(), is_writable: true },
        CallbackAccount { pubkey: ctx.accounts.vault.key(), is_writable: true },
    ];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        vec![ClaimPayoutCallback::callback_ix(
            computation_offset,
            &ctx.accounts.mxe_account,
            &extra_accounts,
        )?],
        1,
        0,
    )?;

    Ok(())
}

#[callback_accounts("claim_payout")]
#[derive(Accounts)]
pub struct ClaimPayoutCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLAIM_PAYOUT))]
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

    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub position: Box<Account<'info, Position>>,
    /// CHECK: receiver, validated against position.user.
    #[account(mut, constraint = recipient.key() == position.user @ ErrorCode::UnauthorizedResolver)]
    pub recipient: UncheckedAccount<'info>,
    /// CHECK: vault PDA holding funds.
    #[account(
        mut,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump = market.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,
}

pub fn claim_payout_callback_handler(
    ctx: Context<ClaimPayoutCallback>,
    output: SignedComputationOutputs<ClaimPayoutOutput>,
) -> Result<()> {
    let result = match output.verify_output(
        &ctx.accounts.cluster_account,
        &ctx.accounts.computation_account,
    ) {
        Ok(o) => o,
        Err(_) => return Err(ErrorCode::AbortedComputation.into()),
    };

    let inner = &result.field_0;
    let won = inner.field_0;
    let amount = inner.field_1;

    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    let payout: u64 = if won {
        let total_pool = market
            .yes_pool
            .checked_add(market.no_pool)
            .ok_or(ErrorCode::AbortedComputation)?;
        let winning_pool = if market.winning_outcome == 1 {
            market.yes_pool
        } else {
            market.no_pool
        };
        if winning_pool == 0 {
            0
        } else {
            let scaled = (amount as u128)
                .checked_mul(total_pool as u128)
                .ok_or(ErrorCode::AbortedComputation)?;
            (scaled / winning_pool as u128) as u64
        }
    } else {
        0
    };

    position.claimed = true;

    if payout > 0 {
        let vault_lamports = **ctx.accounts.vault.lamports.borrow();
        require!(vault_lamports >= payout, ErrorCode::InsufficientVaultBalance);
        **ctx.accounts.vault.try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.recipient.try_borrow_mut_lamports()? += payout;
    }

    emit!(PayoutClaimed {
        market: ctx.accounts.market.key(),
        user: ctx.accounts.recipient.key(),
        amount: payout,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

fn slice_32(blob: &[u8], idx: usize) -> [u8; 32] {
    let mut out = [0u8; 32];
    let start = idx * 32;
    out.copy_from_slice(&blob[start..start + 32]);
    out
}
