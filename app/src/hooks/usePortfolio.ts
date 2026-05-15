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
  outcome?: 0 | 1;
  signature?: string;
  createdAt: number;
  onChainConfirmed: boolean;
  claimed: boolean;
}

interface LocalReceipt {
  outcome: 0 | 1;
  amountLamports: string;
  signature: string;
  createdAt: number;
}

const STAKE_OFFSET = 8 + 32 + 32 + 64 + 32 + 16; // 184
const CLAIMED_OFFSET = STAKE_OFFSET + 8;          // 192

export function usePortfolio() {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  // Use a ref to ensure we never run twice, even if React strict-mode double-mounts
  const lastWalletRef = useRef<string | null>(null);

  useEffect(() => {
    const walletKey = publicKey?.toBase58() ?? null;

    // Skip if same wallet — prevents re-fetch on connection reference changes
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
        const accs = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: 40, bytes: walletKey } }],
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

        const prefix = `pm:position:${walletKey}:`;
        const receipts: Record<string, LocalReceipt> = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key?.startsWith(prefix)) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            const marketId = key.slice(prefix.length);
            try {
              receipts[marketId] = JSON.parse(raw);
            } catch {
              /* skip */
            }
          }
        } catch {
          /* no localStorage */
        }

        const out: PortfolioPosition[] = [];
        for (const a of accs) {
          const data = a.account.data;
          const marketPda = new PublicKey(data.slice(8, 40)).toBase58();
          const stake = data.readBigUInt64LE(STAKE_OFFSET).toString();
          const claimed = data[CLAIMED_OFFSET] === 1;

          const market = marketByPda[marketPda];
          const marketId = market?.id ?? marketPda.slice(0, 8);
          const r = market ? receipts[market.id] : undefined;

          out.push({
            marketId,
            marketQuestion: market?.question ?? "(unknown — indexer pending)",
            marketStatus: market?.status ?? "Unknown",
            marketCloseTs: market?.closeTs ?? 0,
            marketPda,
            positionPda: a.pubkey.toBase58(),
            amountLamports: stake,
            outcome: r?.outcome,
            signature: r?.signature,
            createdAt: r?.createdAt ?? 0,
            onChainConfirmed: true,
            claimed,
          });
        }

        out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
