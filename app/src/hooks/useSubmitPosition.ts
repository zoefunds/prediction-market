"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { toast } from "sonner";
import {
  getCompDefAccAddress,
  getCompDefAccOffset,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getClusterAccAddress,
} from "@arcium-hq/client";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveMarketPda, deriveVaultPda, derivePositionPda } from "@/lib/solana/pdas";
import { encryptPosition } from "@/lib/arcium/encryption";

const CLUSTER_OFFSET = Number(
  process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET ?? "456",
);

export interface SubmitPositionInput {
  marketId: string;
  outcome: 0 | 1;
  stakeSol: number;
}

export interface SubmitPositionResult {
  signature: string;
  positionPda: string;
  computationOffset: string;
  receipt: { outcome: 0 | 1; amountLamports: string };
}

function randomU64BN(): BN {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return new BN(buf, "le");
}

function readUInt32LE(arr: Uint8Array): number {
  return (
    (arr[0] | 0) |
    ((arr[1] | 0) << 8) |
    ((arr[2] | 0) << 16) |
    ((arr[3] | 0) << 24)
  ) >>> 0;
}

/** Translate raw program errors into something humans can read. */
function humanizeError(message: string): string {
  // 0x189c = ComputationDefinitionNotCompleted
  if (message.includes("0x189c") || message.includes("6300")) {
    return (
      "The Arcium MPC circuit for this network isn't fully provisioned yet. " +
      "Position submission is on hold while infrastructure finishes uploading. " +
      "(Devnet preview limitation; not a wallet issue.)"
    );
  }
  // 0x7dc = ConstraintAddress
  if (message.includes("0x7dc") || message.includes("ConstraintAddress")) {
    return "An on-chain account address didn't match expected. Try refreshing.";
  }
  // 0xbc4 = AccountNotInitialized
  if (message.includes("0xbc4") || message.includes("AccountNotInitialized")) {
    return "A required on-chain account isn't initialized. Devnet preview limitation.";
  }
  // 0x1777 = MultiTxCallbacksDisabled (shouldn't happen post-fix, but just in case)
  if (message.includes("0x1777")) {
    return "Multi-tx callbacks not enabled on the deployed program.";
  }
  // Insufficient lamports
  if (message.toLowerCase().includes("insufficient")) {
    return "Insufficient SOL for stake + transaction fee.";
  }
  return message.split("\n")[0]; // first line only, so toast isn't massive
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

      const enc = await encryptPosition(
        program.provider,
        PROGRAM_ID,
        outcome,
        lamports,
      );

      const computationOffset = randomU64BN();
      const compDefOffsetBytes = getCompDefAccOffset("submit_position_v2");
      const compDefOffsetU32 = readUInt32LE(compDefOffsetBytes);
      const compDefAccount = getCompDefAccAddress(
        PROGRAM_ID,
        compDefOffsetU32,
      );
      const computationAccount = getComputationAccAddress(
        CLUSTER_OFFSET,
        computationOffset,
      );
      const clusterAccount = getClusterAccAddress(CLUSTER_OFFSET);
      const mxeAccount = getMXEAccAddress(PROGRAM_ID);
      const mempoolAccount = getMempoolAccAddress(CLUSTER_OFFSET);
      const executingPool = getExecutingPoolAccAddress(CLUSTER_OFFSET);

      let sig: string;
      try {
        sig = await program.methods
          .submitPosition(
            computationOffset,
            enc.ciphertext,
            enc.userPubkey,
            new BN(enc.nonce.toString()),
            new BN(lamports.toString()),
          )
          .accountsPartial({
            payer: wallet.publicKey,
            market: marketPda,
            vault: vaultPda,
            position: positionPda,
            computationAccount,
            clusterAccount,
            mxeAccount,
            mempoolAccount,
            executingPool,
            compDefAccount,
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
        computationOffset: computationOffset.toString(),
        receipt: { outcome, amountLamports: lamports.toString() },
      };
    },
    onSuccess: (r) => {
      toast.success("Position submitted", {
        description: `Encrypted on-chain. tx: ${r.signature.slice(0, 12)}…`,
      });
    },
    onError: (err) => {
      toast.error("Submit failed", {
        description: err.message,
      });
    },
  });
}
