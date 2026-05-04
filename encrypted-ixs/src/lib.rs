use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    pub struct PositionInput {
        outcome: u8,
        amount: u64,
    }

    pub struct MarketTotals {
        yes_pool: u64,
        no_pool: u64,
        total_positions: u32,
    }

    pub struct UserPosition {
        outcome: u8,
        amount: u64,
    }

    /// Add a user's encrypted position to the market's encrypted totals.
    #[instruction]
    pub fn submit_position(
        position_ctxt: Enc<Shared, PositionInput>,
        totals_ctxt: Enc<Mxe, MarketTotals>,
    ) -> (Enc<Shared, UserPosition>, Enc<Mxe, MarketTotals>) {
        let pos = position_ctxt.to_arcis();
        let mut totals = totals_ctxt.to_arcis();

        let is_yes = pos.outcome == 1u8;
        if is_yes {
            totals.yes_pool = totals.yes_pool + pos.amount;
        } else {
            totals.no_pool = totals.no_pool + pos.amount;
        }
        totals.total_positions = totals.total_positions + 1u32;

        let user_pos = UserPosition {
            outcome: pos.outcome,
            amount: pos.amount,
        };

        (
            position_ctxt.owner.from_arcis(user_pos),
            totals_ctxt.owner.from_arcis(totals),
        )
    }

    /// Reveal the resolution: which side won, and the two pool totals.
    #[instruction]
    pub fn resolve_market(
        outcome_ctxt: Enc<Shared, u8>,
        totals_ctxt: Enc<Mxe, MarketTotals>,
    ) -> (u8, u64, u64) {
        let outcome = outcome_ctxt.to_arcis();
        let totals = totals_ctxt.to_arcis();

        (outcome, totals.yes_pool, totals.no_pool).reveal()
    }

    /// Reveal whether this user won and their staked amount.
    /// Payout math is done on-chain in plaintext (cheap u64 ops).
    /// This circuit is small (no division, no big multiplication).
    #[instruction]
    pub fn claim_payout(
        user_position_ctxt: Enc<Shared, UserPosition>,
        winning_outcome: u8,
    ) -> (bool, u64) {
        let pos = user_position_ctxt.to_arcis();
        let won = pos.outcome == winning_outcome;
        (won, pos.amount).reveal()
    }
}
