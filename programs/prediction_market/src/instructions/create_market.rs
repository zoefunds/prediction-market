use anchor_lang::prelude::*;

use crate::{
    constants::{
        CONFIG_SEED, MARKET_SEED, MAX_CATEGORY_LEN, MAX_DESCRIPTION_LEN, MAX_QUESTION_LEN,
        VAULT_SEED,
    },
    error::ErrorCode,
    events::MarketCreated,
    state::{Config, Market, MarketStatus},
};

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, &config.market_count.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// CHECK: PDA used as a SOL vault for stakes; no data, just lamports.
    #[account(
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_market_handler(
    ctx: Context<CreateMarket>,
    question: String,
    description: String,
    category: String,
    close_ts: i64,
    resolver: Pubkey,
) -> Result<()> {
    require!(
        question.len() <= MAX_QUESTION_LEN,
        ErrorCode::QuestionTooLong
    );
    require!(
        description.len() <= MAX_DESCRIPTION_LEN,
        ErrorCode::DescriptionTooLong
    );
    require!(category.len() <= MAX_CATEGORY_LEN, ErrorCode::CategoryTooLong);

    let now = Clock::get()?.unix_timestamp;
    require!(close_ts > now, ErrorCode::InvalidCloseTime);

    let config = &mut ctx.accounts.config;
    let market = &mut ctx.accounts.market;

    market.id = config.market_count;
    market.creator = ctx.accounts.creator.key();
    market.resolver = resolver;
    market.question = question;
    market.description = description;
    market.category = category;
    market.close_ts = close_ts;
    market.resolved_ts = 0;
    market.status = MarketStatus::Open;
    market.winning_outcome = 0;
    market.yes_pool = 0;
    market.no_pool = 0;
    market.total_positions = 0;
    market.bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;

    config.market_count = config
        .market_count
        .checked_add(1)
        .ok_or(error!(ErrorCode::ArithmeticOverflow))?;

    emit!(MarketCreated {
        market: market.key(),
        id: market.id,
        creator: market.creator,
        close_ts,
    });

    Ok(())
}
