"use client";

import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "bn.js";
import { randomBytes } from "crypto";
import { toast } from "sonner";

import {
  RescueCipher,
  awaitComputationFinalization,
  deserializeLE,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMempoolAccAddress,
  getMXEPublicKey,
  getMXEAccAddress,
  x25519,
} from "@arcium-hq/client";

import { getProgram, PROGRAM_ID } from "@/lib/solana/program";
import { deriveVaultPda, derivePositionPda } from "@/lib/solana/pdas";

export interface SubmitPositionInput {
  marketPubkey: string;
  outcome: 0 | 1;
  stakeSol: number;
}

export interface SubmitPositionResult {
  signature: string;
  queueSig: string;
  finalizedTxSig: string;
  positionPda: string;
  receipt: { outcome: 0 | 1; amountLamports: string };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}



function humanizeError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient")) return "Insufficient SOL for stake + transaction fee.";
  if (message.includes("already in use") || message.includes("already exists")) {
    return "You already have a position on this market. One position per wallet.";
  }
  if (message.includes("MarketNotOpen")) return "Market is no longer accepting positions.";
  if (message.includes("ZeroStake")) return "Stake must be greater than zero.";
  if (message.includes("InvalidOutcome")) return "Outcome must be YES or NO.";
  return message.split("\n")[0];
}

function packCiphertexts(cts: Array<Uint8Array | number[]>): number[] {
  return Array.from(Buffer.concat(cts.map((c) => Buffer.from(c))));
}

function formatAnyError(err: unknown): string {
  const e: any = err;

  const toStr = (v: any): string => {
    if (typeof v === "string") return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  };

  if (typeof err === "string") return err;

  if (e?.logs) return Array.isArray(e.logs) ? e.logs.join("\n") : String(e.logs);

  if (e?.error?.logs) {
    return Array.isArray(e.error.logs) ? e.error.logs.join("\n") : String(e.error.logs);
  }

  if (e?.cause?.logs) {
    return Array.isArray(e.cause.logs) ? e.cause.logs.join("\n") : String(e.cause.logs);
  }

  if (e?.message && typeof e.message === "string" && e.message !== "[object Object]") {
    return e.message;
  }

  if (e?.error?.message) return toStr(e.error.message);
  if (e?.cause?.message) return toStr(e.cause.message);
  if (e?.cause) return toStr(e.cause);

  return toStr(err);
}

export function useSubmitPosition() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMutation<SubmitPositionResult, Error, SubmitPositionInput>({
    mutationFn: async ({ marketPubkey, outcome, stakeSol }) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Connect a wallet first.");
      }
      if (stakeSol <= 0) throw new Error("Stake must be positive.");

      const lamports = BigInt(Math.floor(stakeSol * 1e9));
      if (lamports < 1_000_000n) throw new Error("Minimum stake is 0.001 SOL.");

      const program = getProgram(connection, wallet as never);
      const { PublicKey } = await import("@solana/web3.js");
      const marketPda = new PublicKey(marketPubkey);
      const vaultPda = deriveVaultPda(PROGRAM_ID, marketPda);
      const positionPda = derivePositionPda(PROGRAM_ID, marketPda, wallet.publicKey);

      const existing = await connection.getAccountInfo(positionPda);
      if (existing) throw new Error("You already have a position on this market. One position per wallet.");

      const clusterOffset = Number(process.env.NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET);
      if (!Number.isFinite(clusterOffset)) {
        throw new Error("Missing/invalid NEXT_PUBLIC_ARCIUM_CLUSTER_OFFSET");
      }

      const clusterAccount = getClusterAccAddress(clusterOffset);
      const mxeAccount = getMXEAccAddress(program.programId);
      const mempoolAccount = getMempoolAccAddress(clusterOffset);
      const executingPool = getExecutingPoolAccAddress(clusterOffset);

      const compDefAccount = getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("submit_position_v2")).readUInt32LE(),
      );

      const computationOffset = new BN(randomBytes(8), "le");
      const computationAccount = getComputationAccAddress(clusterOffset, computationOffset);

      const mxePub = await getMXEPublicKey(program.provider as never, program.programId);
      if (!mxePub) throw new Error("MXE public key not available");

      const userPriv = x25519.utils.randomSecretKey();
      const userPub = x25519.getPublicKey(userPriv);
      const sharedSecret = x25519.getSharedSecret(userPriv, mxePub);
      const cipher = new RescueCipher(sharedSecret);

      const nonce = randomBytes(16);
      const encrypted = cipher.encrypt([BigInt(outcome), lamports], nonce);
      const ciphertext = packCiphertexts(encrypted);
      const nonceBn = new BN(deserializeLE(nonce).toString());

      let queueSig: string;
      try {
        const builder = program.methods
          .submitPosition(
            computationOffset,
            ciphertext,
            Array.from(userPub),
            nonceBn,
            new BN(lamports.toString()),
          )
          .accountsPartial({
            payer: wallet.publicKey,
            market: marketPda,
            vault: vaultPda,
            position: positionPda,
            mxeAccount,
            mempoolAccount,
            executingPool,
            computationAccount,
            compDefAccount,
            clusterAccount,
          });

        // Force debug logs from simulation before send
        try {
          await builder.simulate();
        } catch (simErr: any) {
          const simMsg = formatAnyError(simErr);
          throw new Error(`Simulation failed: ${simMsg}`);
        }

        queueSig = await builder.rpc({
          commitment: "confirmed",
          preflightCommitment: "confirmed",
          skipPreflight: true,
        });
      } catch (e: unknown) {
        const raw = formatAnyError(e);
        throw new Error(raw);
      }

      let finalizedTxSig: string;
      try {
        finalizedTxSig = await awaitComputationFinalization(
          program.provider as never,
          computationOffset,
          program.programId,
          "confirmed",
          300_000,
        );
      
        const statusResp = await connection.getSignatureStatuses([finalizedTxSig], {
          searchTransactionHistory: true,
        });
        const finalStatus = statusResp.value?.[0];
        if (!finalStatus) {
          throw new Error(`Queued but finalization status missing: ${finalizedTxSig}`);
        }
        if (finalStatus.err) {
          throw new Error(
            `Queued but finalization failed (${finalizedTxSig}): ${JSON.stringify(finalStatus.err)}`
          );
        }
} catch (e: unknown) {
        const raw = formatAnyError(e);
        throw new Error(`Queued but not finalized: ${raw}`);
      }

      return {
        signature: queueSig,
        queueSig,
        finalizedTxSig,
        positionPda: positionPda.toBase58(),
        receipt: { outcome, amountLamports: lamports.toString() },
      };
    },
    onSuccess: (r) => {
      toast.success("Position finalized", {
        description: `queue: ${r.queueSig.slice(0, 8)}… | final: ${r.finalizedTxSig.slice(0, 8)}…`,
      });
    },
    onError: (err) => {
      console.error("submit raw error:", err);
      const msg = formatAnyError(err);
      toast.error("Submission/Finalization failed", { description: msg.slice(0, 800) });
    },
  });
}
