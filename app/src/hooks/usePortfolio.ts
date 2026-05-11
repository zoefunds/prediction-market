"use client";

import { useEffect, useState, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { collection, getDocs } from "firebase/firestore";
import { PublicKey } from "@solana/web3.js";
import { getFirebase } from "@/lib/firebase/client";
import { PROGRAM_ID } from "@/lib/solana/program";
import type { Market } from "@/types";

export interface PortfolioPosition {
  marketId: string;
  marketQuestion: string;
  marketStatus: string;
  marketCloseTs: number;
  marketPda: string;
  positionPda: string;
  amountLamports: string;
  outcome: 0 | 1;
  signature?: string;
  createdAt: number;
  onChainConfirmed: boolean;
  claimed: boolean;
}

// Position struct layout (post-v0.2):
// 8  disc
// 32 market         offset 8
// 32 user           offset 40
// 1  outcome        offset 72
// 8  stake_amount   offset 73
// 1  claimed        offset 81
// 8  created_ts     offset 82
// 1  bump           offset 90
const OUTCOME_OFFSET = 72;
const STAKE_OFFSET = 73;
const CLAIMED_OFFSET = 81;

export function usePortfolio() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const lastWalletRef = useRef<string | null>(null);

  useEffect(() => {
    const walletKey = publicKey?.toBase58() ?? null;
    if (walletKey === lastWalletRef.current) return;
    lastWalletRef.current = walletKey;

    if (!walletKey) {
      setPositions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Filter for Position accounts owned by this wallet.
        // memcmp at offset 40 = user pubkey.
        const accs = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { dataSize: 8 + 32 + 32 + 1 + 8 + 1 + 8 + 1 },
            { memcmp: { offset: 40, bytes: walletKey } },
          ],
        });

        if (cancelled) return;

        const { db } = getFirebase();
        const snap = await getDocs(collection(db, "markets"));
        const marketByPda: Record<string, Market> = {};
        snap.forEach((d) => {
          const m = { id: d.id, ...(d.data() as Omit<Market, "id">) };
          if (m.marketPda) marketByPda[m.marketPda] = m;
        });

        if (cancelled) return;

        const out: PortfolioPosition[] = [];
        for (const a of accs) {
          const data = a.account.data;
          const marketPda = new PublicKey(data.slice(8, 40)).toBase58();
          const outcome = (data[OUTCOME_OFFSET] === 1 ? 1 : 0) as 0 | 1;
          const stake = data.readBigUInt64LE(STAKE_OFFSET).toString();
          const claimed = data[CLAIMED_OFFSET] === 1;

          const market = marketByPda[marketPda];
          const marketId = market?.id ?? marketPda.slice(0, 8);

          out.push({
            marketId,
            marketQuestion: market?.question ?? "(unknown — indexer pending)",
            marketStatus: market?.status ?? "Unknown",
            marketCloseTs: market?.closeTs ?? 0,
            marketPda,
            positionPda: a.pubkey.toBase58(),
            amountLamports: stake,
            outcome,
            createdAt: 0,
            onChainConfirmed: true,
            claimed,
          });
        }

        if (!cancelled) setPositions(out);
      } catch (e) {
        console.error("portfolio load failed", e);
        if (!cancelled) setPositions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  return { positions, loading };
}
