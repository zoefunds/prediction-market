import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../lib/admin";
import { PublicKey } from "@solana/web3.js";

/**
 * Callable — user links their Solana wallet to their Firebase profile.
 *
 * Anti-abuse note: this only stores the address. To prove ownership we'd
 * normally have the user sign a nonce — we'll add that in the frontend
 * (sign-in-with-Solana) before any action that depends on wallet truth.
 */
export const linkWallet = onCall(
  { region: "us-central1", cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in first.");
    }
    const { walletAddress } = (request.data ?? {}) as { walletAddress?: string };
    if (!walletAddress || typeof walletAddress !== "string") {
      throw new HttpsError("invalid-argument", "walletAddress required.");
    }
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid Solana address.");
    }
    await db.collection("users").doc(request.auth.uid).set(
      {
        walletAddress,
      },
      { merge: true },
    );
    return { ok: true };
  },
);
