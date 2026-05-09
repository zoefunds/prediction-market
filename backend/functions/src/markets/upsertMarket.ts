import { onCall, HttpsError } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import { buildSearchKeywords } from "../lib/search";
import type { MarketDoc } from "../types";

/**
 * Callable — adds rich metadata (image, tags, formatted description) to a
 * market that was just created on-chain. The on-chain creation is the source
 * of truth; this only enriches the off-chain mirror.
 *
 * The indexer (workers/) will create the bare-minimum mirror; this callable
 * lets the frontend immediately attach UI metadata.
 */
export const upsertMarket = onCall(
  { region: "us-central1", cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in first.");
    }
    const data = (request.data ?? {}) as Partial<MarketDoc> & {
      id?: string;
      imageUrl?: string;
      tags?: string[];
    };

    if (!data.id) {
      throw new HttpsError("invalid-argument", "Market id required.");
    }

    const ref = db.collection("markets").doc(data.id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Market not yet indexed; try again shortly.");
    }
    const existing = snap.data() as MarketDoc;

    // Authorization: only creator can enrich.
    const callerUid = request.auth.uid;
    const userSnap = await db.collection("users").doc(callerUid).get();
    const callerWallet = userSnap.data()?.walletAddress;
    if (callerWallet !== existing.creator) {
      throw new HttpsError("permission-denied", "Only creator may enrich.");
    }

    const update: Partial<MarketDoc> = {
      updatedAt: Timestamp.now(),
    };
    if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
    if (data.tags !== undefined) update.tags = data.tags.slice(0, 8);
    update.searchKeywords = buildSearchKeywords(
      existing.question,
      existing.description,
      existing.category,
      update.tags ?? existing.tags ?? [],
    );

    await ref.set(update, { merge: true });
    return { ok: true };
  },
);
