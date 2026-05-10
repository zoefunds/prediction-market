"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveMarketPda, deriveVaultPda, derivePositionPda } from "@/lib/solana/pdas";

export function useWithdrawPosition() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMutation<string, Error, { marketId: string }>({
    mutationFn: async ({ marketId }) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Connect a wallet first.");
      }
      const program = getProgram(connection, wallet as never);
      const marketPda = deriveMarketPda(PROGRAM_ID, new BN(marketId));
      const vaultPda = deriveVaultPda(PROGRAM_ID, marketPda);
      const positionPda = derivePositionPda(
        PROGRAM_ID,
        marketPda,
        wallet.publicKey,
      );

      const sig = await program.methods
        .withdrawPosition()
        .accountsPartial({
          user: wallet.publicKey,
          market: marketPda,
          vault: vaultPda,
          position: positionPda,
        })
        .rpc({ commitment: "confirmed" });

      // Clean local receipt
      try {
        const key = `pm:position:${wallet.publicKey.toBase58()}:${marketId}`;
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }

      return sig;
    },
    onSuccess: (sig) => {
      toast.success("Withdrawn", {
        description: `Stake refunded. tx: ${sig.slice(0, 12)}…`,
      });
    },
    onError: (e) => toast.error("Withdraw failed", { description: e.message }),
  });
}
