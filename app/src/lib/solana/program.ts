"use client";

import { Program, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./idl/prediction_market.json";
import type { PredictionMarket } from "./idl/prediction_market";
import { RawAnchorProvider } from "./rawProvider";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID!,
);

export function getProgram(
  connection: Connection,
  wallet: Wallet,
): Program<PredictionMarket> {
  const provider = new RawAnchorProvider(connection, wallet, {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return new Program<PredictionMarket>(idl as PredictionMarket, provider);
}
