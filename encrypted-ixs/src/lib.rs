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

    pub struct ResolutionOutput {
        winning_outcome: u8,
        yes_pool: u64,
        no_pool: u64,
    }

    pub struct PayoutOutput {
        amount: u64,
    }

    /// Add a user's encrypted position to the market's encrypted totals.
    /// Returns:
    ///   - the user's position (encrypted to the user) — they keep a receipt
    ///   - the updated market totals (encrypted to MXE) — written back on-chain
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
    /// Individual positions remain hidden — only aggregates surface.
    #[instruction]
    pub fn resolve_market(
        outcome_ctxt: Enc<Shared, u8>,
        totals_ctxt: Enc<Mxe, MarketTotals>,
    ) -> (u8, u64, u64) {
        let outcome = outcome_ctxt.to_arcis();
        let totals = totals_ctxt.to_arcis();

        (outcome, totals.yes_pool, totals.no_pool).reveal()
    }

    /// Compute one user's payout, given the (now public) winning outcome
    /// and pool totals. Only the claimer learns the value (encrypted to them).
    ///
    /// Parimutuel: payout = stake * total_pool / winning_pool, only if won.
    #[instruction]
    pub fn claim_payout(
        user_position_ctxt: Enc<Shared, UserPosition>,
        winning_outcome: u8,
        yes_pool: u64,
        no_pool: u64,
    ) -> Enc<Shared, PayoutOutput> {
        let pos = user_position_ctxt.to_arcis();
        let total_pool = yes_pool + no_pool;

        let winning_pool = if winning_outcome == 1u8 { yes_pool } else { no_pool };
        let user_won = pos.outcome == winning_outcome;
        let safe_winning_pool = if winning_pool == 0u64 { 1u64 } else { winning_pool };

        let gross = (pos.amount * total_pool) / safe_winning_pool;

        let payout = if user_won && winning_pool > 0u64 {
            gross
        } else {
            0u64
        };

        user_position_ctxt
            .owner
            .from_arcis(PayoutOutput { amount: payout })
    }
}
