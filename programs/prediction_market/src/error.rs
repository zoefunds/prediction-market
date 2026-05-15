use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Cluster not set in MXE account")]
    ClusterNotSet,

    #[msg("Computation was aborted by the MPC cluster")]
    AbortedComputation,

    #[msg("Question text exceeds maximum length")]
    QuestionTooLong,

    #[msg("Description exceeds maximum length")]
    DescriptionTooLong,

    #[msg("Category exceeds maximum length")]
    CategoryTooLong,

    #[msg("Market is not currently open for positions")]
    MarketNotOpen,

    #[msg("Market has not yet reached its close timestamp")]
    MarketNotClosed,

    #[msg("Market has already been resolved")]
    AlreadyResolved,

    #[msg("Market is not yet resolved")]
    NotResolved,

    #[msg("Resolution timestamp is in the past")]
    InvalidCloseTime,

    #[msg("Caller is not authorized to resolve this market")]
    UnauthorizedResolver,

    #[msg("Position has already been claimed")]
    AlreadyClaimed,

    #[msg("Invalid outcome value (must be 0 or 1)")]
    InvalidOutcome,

    #[msg("Stake amount must be greater than zero")]
    ZeroStake,

    #[msg("Insufficient vault balance for payout")]
    InsufficientVaultBalance,

    #[msg("Caller is not authorized for this operation")]
    Unauthorized,

    #[msg("Market is not in Cancelled status")]
    MarketNotCancelled,

    #[msg("Vault does not have enough balance to refund")]
    VaultUnderfunded,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Stake amount must be greater than zero")]
    InvalidStake,
}
