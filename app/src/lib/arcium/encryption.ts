"use client";

/**
 * Arcium client-side encryption helpers.
 *
 * The MXE (Multi-Party eXecution Environment) holds a shared X25519 key pair.
 * To submit encrypted data:
 *   1. Generate a fresh X25519 keypair on the user's side.
 *   2. Derive a shared secret with the MXE's public key.
 *   3. Use RescueCipher with that shared secret to encrypt the data.
 *   4. Send the ciphertext + the user's pubkey + the nonce on-chain.
 */
import {
  RescueCipher,
  getMXEPublicKey,
  x25519,
  deserializeLE,
} from "@arcium-hq/client";
import type { Provider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface EncryptedTotals {
  ciphertext: number[];     // 96 bytes (3 ciphertext elements × 32B)
  userPubkey: number[];     // 32 bytes
  nonce: bigint;            // u128
}

/** Encrypt initial all-zero MarketTotals to send when creating a market. */
export async function encryptInitialTotals(
  provider: Provider,
  programId: PublicKey,
): Promise<EncryptedTotals> {
  const mxePub = await getMXEPublicKey(provider, programId);
  if (!mxePub) {
    throw new Error(
      "MXE public key not available. Ensure the MXE has been initialized.",
    );
  }

  const userPriv = x25519.utils.randomSecretKey();
  const userPub = x25519.getPublicKey(userPriv);
  const sharedSecret = x25519.getSharedSecret(userPriv, mxePub);
  const cipher = new RescueCipher(sharedSecret);

  const nonceBytes = randomNonce();
  // Encrypt three zero u64/u32 values: yes_pool, no_pool, total_positions
  const ct = cipher.encrypt(
    [BigInt(0), BigInt(0), BigInt(0)],
    nonceBytes,
  );

  const ciphertext: number[] = [];
  for (const word of ct) {
    for (const b of word) ciphertext.push(b);
  }

  return {
    ciphertext,
    userPubkey: Array.from(userPub),
    nonce: BigInt(deserializeLE(nonceBytes).toString()),
  };
}

/** Encrypt a user's position (outcome u8, amount u64). */
export async function encryptPosition(
  provider: Provider,
  programId: PublicKey,
  outcome: 0 | 1,
  amountLamports: bigint,
): Promise<{
  ciphertext: number[];     // 64 bytes
  userPubkey: number[];     // 32 bytes
  nonce: bigint;
}> {
  const mxePub = await getMXEPublicKey(provider, programId);
  if (!mxePub) throw new Error("MXE public key unavailable");

  const userPriv = x25519.utils.randomSecretKey();
  const userPub = x25519.getPublicKey(userPriv);
  const sharedSecret = x25519.getSharedSecret(userPriv, mxePub);
  const cipher = new RescueCipher(sharedSecret);

  const nonceBytes = randomNonce();
  const ct = cipher.encrypt([BigInt(outcome), amountLamports], nonceBytes);

  const ciphertext: number[] = [];
  for (const word of ct) {
    for (const b of word) ciphertext.push(b);
  }

  return {
    ciphertext,
    userPubkey: Array.from(userPub),
    nonce: BigInt(deserializeLE(nonceBytes).toString()),
  };
}

function randomNonce(): Uint8Array {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return buf;
}
