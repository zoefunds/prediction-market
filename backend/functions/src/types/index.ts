import { Timestamp } from "firebase-admin/firestore";

export type MarketStatus = "Open" | "AwaitingResolution" | "Resolved" | "Cancelled";

export interface MarketDoc {
  /** On-chain market id (u64 stringified). */
  id: string;
  /** Creator wallet pubkey base58. */
  creator: string;
  /** Resolver wallet pubkey base58. */
  resolver: string;
  question: string;
  description: string;
  category: string;
  /** Unix epoch seconds. */
  closeTs: number;
  /** Unix epoch seconds; 0 until resolved. */
  resolvedTs: number;
  status: MarketStatus;
  /** 0 = NO, 1 = YES (only meaningful after resolution). */
  winningOutcome: number;
  /** Lamports. Revealed at resolution. */
  yesPool: number;
  /** Lamports. Revealed at resolution. */
  noPool: number;
  /** Public count of participants. */
  totalPositions: number;
  /** Solana market PDA (base58). */
  marketPda: string;
  /** Solana vault PDA (base58). */
  vaultPda: string;
  /** Optional banner image. */
  imageUrl?: string;
  tags?: string[];
  /** Lowercased tokens for substring search. */
  searchKeywords?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  photoURL?: string;
  /** Linked Solana wallet (base58). */
  walletAddress?: string;
  joinedAt: Timestamp;
  marketsCreated: number;
  positionsTaken: number;
  totalVolumeStaked: number;
}

export type EventType =
  | "MarketCreated"
  | "PositionSubmitted"
  | "MarketResolutionRequested"
  | "MarketResolved"
  | "PayoutClaimed";

export interface EventDoc {
  type: EventType;
  /** On-chain market id when applicable. */
  marketId?: string;
  txSig: string;
  slot: number;
  blockTime: number;
  payload: Record<string, unknown>;
  indexedAt: Timestamp;
}
