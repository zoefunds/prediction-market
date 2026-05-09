import { onCall } from "firebase-functions/v2/https";
import { db } from "../lib/admin";

export const getFeaturedMarkets = onCall(
  { region: "us-central1", cors: true },
  async () => {
    const snap = await db
      .collection("markets")
      .where("status", "==", "Open")
      .orderBy("totalPositions", "desc")
      .limit(12)
      .get();
    return {
      markets: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    };
  },
);
