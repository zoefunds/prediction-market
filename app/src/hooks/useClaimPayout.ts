"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveMarketPda, deriveVaultPda, derivePositionPda } from "@/lib/solana/pdas";

export function useClaimPayout() {
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
        .claimPayout()
        .accountsPartial({
          user: wallet.publicKey,
          market: marketPda,
          vault: vaultPda,
          position: positionPda,
        })
        .rpc({ commitment: "confirmed" });

      return sig;
    },
    onSuccess: (sig) => {
      toast.success("Payout claimed", {
        description: `tx: ${sig.slice(0, 12)}…`,
      });
    },
    onError: (e) => toast.error("Claim failed", { description: e.message }),
  });
}
