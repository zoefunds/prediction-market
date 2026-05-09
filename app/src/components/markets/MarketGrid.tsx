"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { Market } from "@/types";
import { MarketCard } from "./MarketCard";

export function MarketGrid({
  markets,
  loading,
}: {
  markets: Market[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!markets.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No markets yet. Be the first to{" "}
          <a href="/create" className="text-primary underline">
            create one
          </a>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((m) => (
        <MarketCard key={m.id} market={m} />
      ))}
    </div>
  );
}
