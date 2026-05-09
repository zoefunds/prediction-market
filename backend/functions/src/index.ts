import { setGlobalOptions } from "firebase-functions/v2";

// Apply once globally so cold starts use a small instance.
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// ── Auth triggers ──
export { onUserCreate } from "./users/onCreate";

// ── Callables: users ──
export { linkWallet } from "./users/linkWallet";

// ── Callables: markets ──
export { upsertMarket } from "./markets/upsertMarket";
export { getFeaturedMarkets } from "./markets/getFeatured";
