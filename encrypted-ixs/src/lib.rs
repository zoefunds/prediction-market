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

    /// Add encrypted position to market totals. Single output (Mxe-only) so the
    /// callback fits in one Solana tx. The user keeps their plaintext locally
    /// and re-supplies it for claim.
    #[instruction]
    pub fn init_market_totals(
        totals_ctxt: Enc<Shared, MarketTotals>,
    ) -> Enc<Mxe, MarketTotals> {
        let totals = totals_ctxt.to_arcis();
        Mxe::get().from_arcis(totals)
    }

    #[instruction]
    pub fn submit_position_v3(
        position_ctxt: Enc<Shared, PositionInput>,
        totals_ctxt: Enc<Mxe, MarketTotals>,
    ) -> Enc<Mxe, MarketTotals> {
        let pos = position_ctxt.to_arcis();
        let mut totals = totals_ctxt.to_arcis();

        let is_yes = pos.outcome == 1u8;
        if is_yes {
            totals.yes_pool = totals.yes_pool + pos.amount;
        } else {
            totals.no_pool = totals.no_pool + pos.amount;
        }
        totals.total_positions = totals.total_positions + 1u32;

        totals_ctxt.owner.from_arcis(totals)
    }

    #[instruction]
    pub fn resolve_market_v2(
        outcome_ctxt: Enc<Shared, u8>,
        totals_ctxt: Enc<Mxe, MarketTotals>,
    ) -> (u8, u64, u64) {
        let outcome = outcome_ctxt.to_arcis();
        let totals = totals_ctxt.to_arcis();
        (outcome, totals.yes_pool, totals.no_pool).reveal()
    }

    #[instruction]
    pub fn claim_payout_v2(
        user_position_ctxt: Enc<Shared, PositionInput>,
        winning_outcome: u8,
    ) -> (bool, u64) {
        let pos = user_position_ctxt.to_arcis();
        let won = pos.outcome == winning_outcome;
        (won, pos.amount).reveal()
    }
}
