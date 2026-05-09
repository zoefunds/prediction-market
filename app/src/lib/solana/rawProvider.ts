"use client";

import {
  AnchorProvider,
  type Wallet,
} from "@coral-xyz/anchor";
import {
  type ConfirmOptions,
  Connection,
  type Signer,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * AnchorProvider that bypasses Anchor 0.32.1's broken SendTransactionError
 * wrapper. Anchor calls `new SendTransactionError(message, logs)` (positional
 * 2-arg) but web3.js 1.95.x expects an object form. The mismatch surfaces as
 * the unhelpful "Unknown action 'undefined'". We override `sendAndConfirm` to
 * use `connection.sendRawTransaction` directly and surface real errors.
 */
export class RawAnchorProvider extends AnchorProvider {
  override async sendAndConfirm(
    tx: Transaction | VersionedTransaction,
    signers?: Signer[],
    opts?: ConfirmOptions,
  ): Promise<string> {
    const conf = opts ?? this.opts;
    const isVersioned = tx instanceof VersionedTransaction;

    let raw: Buffer | Uint8Array;
    let blockhash: string;
    let lastValidBlockHeight: number;

    if (isVersioned) {
      if (signers?.length) (tx as VersionedTransaction).sign(signers);
      const signed = await this.wallet.signTransaction(tx);
      raw = signed.serialize();
      const bh = await this.connection.getLatestBlockhash(
        conf.commitment ?? "confirmed",
      );
      blockhash = bh.blockhash;
      lastValidBlockHeight = bh.lastValidBlockHeight;
    } else {
      const legacy = tx as Transaction;
      if (!legacy.recentBlockhash) {
        const bh = await this.connection.getLatestBlockhash(
          conf.commitment ?? "confirmed",
        );
        legacy.recentBlockhash = bh.blockhash;
        legacy.lastValidBlockHeight = bh.lastValidBlockHeight;
      }
      legacy.feePayer = legacy.feePayer ?? this.wallet.publicKey;
      if (signers?.length) legacy.partialSign(...signers);
      const signed = await this.wallet.signTransaction(legacy);
      raw = signed.serialize();
      blockhash = legacy.recentBlockhash!;
      lastValidBlockHeight = legacy.lastValidBlockHeight!;
    }

    let sig: string;
    try {
      sig = await this.connection.sendRawTransaction(raw, {
        skipPreflight: conf.skipPreflight ?? false,
        preflightCommitment: conf.preflightCommitment ?? "confirmed",
        maxRetries: 5,
      });
    } catch (e: unknown) {
      // Surface the real preflight reason instead of Anchor's bad wrapper.
      const err = e as { message?: string; logs?: string[] };
      const logsTail = err.logs ? `\n${err.logs.slice(-6).join("\n")}` : "";
      throw new Error(
        `${err.message ?? "send failed"}${logsTail}`,
      );
    }

    try {
      const result = await this.connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        conf.commitment ?? "confirmed",
      );
      if (result.value.err) {
        // Pull logs to expose the program error.
        const txInfo = await this.connection.getTransaction(sig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        const logsTail = txInfo?.meta?.logMessages?.slice(-8).join("\n") ?? "";
        throw new Error(
          `tx failed: ${JSON.stringify(result.value.err)}\n${logsTail}`,
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }

    return sig;
  }
}
