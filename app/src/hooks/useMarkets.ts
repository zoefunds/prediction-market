"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { Market, MarketStatus } from "@/types";

function coerceDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const t = v as Timestamp;
  if (typeof t?.toDate === "function") return t.toDate();
  return undefined;
}

export function useMarkets(opts?: {
  status?: MarketStatus;
  includeHidden?: boolean;
}) {
  const [data, setData] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const { db } = getFirebase();
    const ref = collection(db, "markets");
    const q = query(ref, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const markets: Market[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...(data as Omit<Market, "id">),
            createdAt: coerceDate(data.createdAt),
            updatedAt: coerceDate(data.updatedAt),
          };
        });
        const filtered = markets.filter((m) => {
          if (!opts?.includeHidden && (m as Market & { hidden?: boolean }).hidden) {
            return false;
          }
          if (opts?.status && m.status !== opts.status) return false;
          return true;
        });
        setData(filtered);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [opts?.status, opts?.includeHidden]);

  return { data, loading, error };
}
