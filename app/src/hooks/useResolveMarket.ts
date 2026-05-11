"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveMarketPda } from "@/lib/solana/pdas";

export function useResolveMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMutation<string, Error, { marketId: string; winningOutcome: 0 | 1 }>({
    mutationFn: async ({ marketId, winningOutcome }) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Connect a wallet first.");
      }
      const program = getProgram(connection, wallet as never);
      const marketPda = deriveMarketPda(PROGRAM_ID, new BN(marketId));

      const sig = await program.methods
        .resolveMarket(winningOutcome)
        .accountsPartial({
          resolver: wallet.publicKey,
          market: marketPda,
        })
        .rpc({ commitment: "confirmed" });

      return sig;
    },
    onSuccess: (sig) => {
      toast.success("Market resolved", {
        description: `tx: ${sig.slice(0, 12)}…`,
      });
    },
    onError: (e) => toast.error("Resolve failed", { description: e.message }),
  });
}
