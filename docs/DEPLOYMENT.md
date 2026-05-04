# Deployment — Devnet

Status: **Live** on Solana Devnet.

## Program

| Field | Value |
|---|---|
| Program ID | `3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A` |
| Authority | `EBea3UVndSrNdgdtfuXC6PoN7573GdS43XDoB6pja9fh` |
| Cluster | Solana Devnet |
| Explorer | https://explorer.solana.com/address/3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A?cluster=devnet |

## Arcium MXE

| Field | Value |
|---|---|
| MXE Account | `9HxgnVRqFmKiYbyhB6xtg9UhZJRFCypN25RB8sttcGFj` |
| Cluster Offset | `456` |
| Recovery Set Size | `4` |
| LUT | `Gep2AtVB24hCY7qWMtheqxShPTwXmXHA8sfjG9iNGE3b` |

## Computation Definitions

| Circuit | CompDef PDA | Circuit Size |
|---|---|---|
| `submit_position` | `CLnRKFpbbAqJ84fi56897EFYBPjA87EEbayiMzuCDTXQ` | 1.08 MB |
| `resolve_market` | `2Mo8FMZAuLumPZfLCtEeUzAeZYjRexzPpUiekF1Nubj3` | 0.86 MB |
| `claim_payout` | `D1hriaJHmFQDTcXbk4cbqUoMDJL6BKhg1xwnRJDuoNLr` | 0.73 MB |

## Cost Summary (Devnet)

- Program deploy: ~4.6 SOL (rent for 666 KB program)
- MXE init + key generation: ~0.1 SOL
- 3 CompDef inits: ~0.005 SOL
- 3 circuit uploads: ~10 SOL combined (mostly rent on raw circuit accounts)

Some rent (~5 SOL) is recoverable via `claimComputationRent` once MPC executions complete.

## Re-deployment

```bash
# Rebuild
arcium build

# Upgrade program
anchor upgrade target/deploy/prediction_market.so \
  --program-id 3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A \
  --provider.cluster devnet

# Upgrade IDL
anchor idl upgrade 3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A \
  --filepath target/idl/prediction_market.json \
  --provider.cluster devnet

# Re-upload circuits if changed (idempotent)
RPC_URL="<helius-or-quicknode>" \
pnpm exec tsx scripts/init-comp-defs.ts
```
