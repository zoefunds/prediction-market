"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveConfigPda } from "@/lib/solana/pdas";

export interface CreateMarketInput {
  question: string;
  description: string;
  category: string;
  closeTs: number;       // unix seconds
  resolverAddress?: string; // base58 pubkey, defaults to creator
}

export interface CreateMarketResult {
  signature: string;
  marketId: number;
}

export function useCreateMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMutation<CreateMarketResult, Error, CreateMarketInput>({
    mutationFn: async (input) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Connect a wallet first.");
      }

      const program = getProgram(connection, wallet as never);
      const configPda = deriveConfigPda(PROGRAM_ID);

      let marketCount: BN;
      try {
        const cfg = await program.account.config.fetch(configPda);
        marketCount = cfg.marketCount as BN;
      } catch {
        throw new Error(
          "Program Config is not yet initialized. Ask an admin to call `initialize`.",
        );
      }

      const resolverPk = input.resolverAddress
        ? new (await import("@solana/web3.js")).PublicKey(input.resolverAddress)
        : wallet.publicKey;

      const sig = await program.methods
        .createMarket(
          input.question,
          input.description,
          input.category,
          new BN(input.closeTs),
          resolverPk,
        )
        .accounts({ creator: wallet.publicKey })
        .rpc({ commitment: "confirmed" });

      return {
        signature: sig,
        marketId: marketCount.toNumber(),
      };
    },
    onSuccess: (r) => {
      toast.success(`Market #${r.marketId} created`, {
        description: `tx: ${r.signature.slice(0, 12)}…`,
      });
    },
    onError: (err) => {
      toast.error("Create failed", { description: err.message });
    },
  });
}
