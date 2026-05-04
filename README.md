# Prediction Market

A confidential prediction & opinion market on **Solana Devnet**, powered by **Arcium** for private staking and voting.

## Why this exists

Public prediction markets leak signal: whales bet, others see it, herding kicks in, and the "wisdom of the crowd" decays into a popularity contest. This project keeps stakes and votes encrypted via Arcium's MPC network — no one (not even node operators) can see individual positions until resolution.

## Stack

| Layer | Tech |
|---|---|
| On-chain settlement | Solana + Anchor (Rust) |
| Confidential compute | Arcium MXE (Rust + arcis) |
| Backend | Firebase (Auth, Firestore, Functions) |
| Frontend | Next.js 14 + Tailwind + shadcn/ui |
| Indexer | Python (solana-py) |

## Repo layout
programs/    Solana on-chain programs (Anchor)
arcium/      Confidential MPC circuits
app/         Next.js frontend
backend/     Firebase Cloud Functions
workers/     Off-chain Python indexer
scripts/     Deploy + automation
docs/        Architecture & runbooks

## Status

🚧 In active development. Devnet only. Do not use with real funds.

## License

MIT
