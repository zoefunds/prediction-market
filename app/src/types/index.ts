import type { Timestamp } from "firebase/firestore";

export type MarketStatus =
  | "Open"
  | "AwaitingResolution"
  | "Resolved"
  | "Cancelled";

export interface Market {
  id: string;
  creator: string;
  resolver?: string;
  question: string;
  description?: string;
  category?: string;
  closeTs: number;
  resolvedTs?: number;
  status: MarketStatus;
  winningOutcome?: number;
  yesPool?: number;
  noPool?: number;
  totalPositions: number;
  marketPda: string;
  vaultPda?: string;
  imageUrl?: string;
  tags?: string[];
  searchKeywords?: string[];
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type EventType =
  | "MarketCreated"
  | "PositionSubmitted"
  | "MarketResolutionRequested"
  | "MarketResolved"
  | "PayoutClaimed";

export interface MarketEvent {
  id: string;
  type: EventType;
  marketId?: string;
  txSig: string;
  slot: number;
  blockTime: number;
  payload: Record<string, unknown>;
  indexedAt: Timestamp | Date;
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  walletAddress?: string;
  joinedAt?: Timestamp | Date;
  marketsCreated: number;
  positionsTaken: number;
  totalVolumeStaked: number;
}
