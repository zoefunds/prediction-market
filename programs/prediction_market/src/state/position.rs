use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub market: Pubkey,
    pub user: Pubkey,
    /// Encrypted UserPosition (outcome + amount), owned by the user's key.
    /// 2 ciphertext elements = 64 bytes.
    pub ciphertext: [u8; 64],
    /// X25519 public key of the user (recipient of the encrypted output).
    pub user_pubkey: [u8; 32],
    /// Nonce used for this position's ciphertext.
    pub nonce: u128,
    /// Plaintext stake amount the user actually transferred to the vault.
    /// We need this on-chain to enforce conservation: vault_balance >= sum(stake).
    /// It's NOT private — but it doesn't reveal the *outcome* the user picked,
    /// which is the herd-inducing signal we care about.
    pub stake_amount: u64,
    /// Has this position been claimed post-resolution?
    pub claimed: bool,
    pub created_ts: i64,
    pub bump: u8,
}
