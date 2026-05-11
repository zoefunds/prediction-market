"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveMarketPda, deriveVaultPda, derivePositionPda } from "@/lib/solana/pdas";

export interface SubmitPositionInput {
  marketId: string;
  outcome: 0 | 1;
  stakeSol: number;
}

export interface SubmitPositionResult {
  signature: string;
  positionPda: string;
  receipt: { outcome: 0 | 1; amountLamports: string };
}

function humanizeError(message: string): string {
  if (message.toLowerCase().includes("insufficient")) {
    return "Insufficient SOL for stake + transaction fee.";
  }
  if (message.includes("already in use") || message.includes("already exists")) {
    return "You already have a position on this market. One position per wallet.";
  }
  if (message.includes("MarketNotOpen")) {
    return "Market is no longer accepting positions.";
  }
  if (message.includes("ZeroStake")) {
    return "Stake must be greater than zero.";
  }
  if (message.includes("InvalidOutcome")) {
    return "Outcome must be YES or NO.";
  }
  return message.split("\n")[0];
}

export function useSubmitPosition() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMutation<SubmitPositionResult, Error, SubmitPositionInput>({
    mutationFn: async ({ marketId, outcome, stakeSol }) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Connect a wallet first.");
      }
      if (stakeSol <= 0) throw new Error("Stake must be positive.");
      const lamports = BigInt(Math.floor(stakeSol * 1e9));
      if (lamports < 1_000_000n) {
        throw new Error("Minimum stake is 0.001 SOL.");
      }

      const program = getProgram(connection, wallet as never);
      const marketIdBN = new BN(marketId);
      const marketPda = deriveMarketPda(PROGRAM_ID, marketIdBN);
      const vaultPda = deriveVaultPda(PROGRAM_ID, marketPda);
      const positionPda = derivePositionPda(
        PROGRAM_ID,
        marketPda,
        wallet.publicKey,
      );

      const existing = await connection.getAccountInfo(positionPda);
      if (existing) {
        throw new Error(
          "You already have a position on this market. One position per wallet.",
        );
      }

      let sig: string;
      try {
        sig = await program.methods
          .submitPosition(outcome, new BN(lamports.toString()))
          .accountsPartial({
            payer: wallet.publicKey,
            market: marketPda,
            vault: vaultPda,
            position: positionPda,
          })
          .rpc({ commitment: "confirmed", skipPreflight: false });
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : String(e);
        throw new Error(humanizeError(raw));
      }

      try {
        const key = `pm:position:${wallet.publicKey.toBase58()}:${marketId}`;
        localStorage.setItem(
          key,
          JSON.stringify({
            outcome,
            amountLamports: lamports.toString(),
            signature: sig,
            createdAt: Date.now(),
          }),
        );
      } catch {
        /* ignore quota errors */
      }

      return {
        signature: sig,
        positionPda: positionPda.toBase58(),
        receipt: { outcome, amountLamports: lamports.toString() },
      };
    },
    onSuccess: (r) => {
      toast.success("Position submitted", {
        description: `tx: ${r.signature.slice(0, 12)}…`,
      });
    },
    onError: (err) => {
      toast.error("Submit failed", {
        description: err.message,
      });
    },
  });
}
