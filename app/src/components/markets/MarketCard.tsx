"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Market } from "@/types";

export function MarketCard({ market }: { market: Market }) {
  const closeMs = market.closeTs * 1000;
  const closing = closeMs - Date.now();
  const closingLabel =
    closing > 0
      ? `Closes ${formatDistanceToNow(closeMs, { addSuffix: true })}`
      : "Closed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Link
        href={`/markets/${market.id}`}
        className="group block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
      >
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-sm text-primary">
            #{market.id}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-card-foreground group-hover:text-primary">
              {market.question || "Untitled market"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{closingLabel}</p>
          </div>
          {market.category ? (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {market.category}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              YES
            </div>
            <div className="font-mono text-sm font-semibold text-[color:var(--color-yes)]">
              {market.status === "Resolved" && market.winningOutcome === 1
                ? "WON"
                : "—"}
            </div>
          </div>
          <div className="rounded-md bg-secondary/40 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              NO
            </div>
            <div className="font-mono text-sm font-semibold text-[color:var(--color-no)]">
              {market.status === "Resolved" && market.winningOutcome === 0
                ? "WON"
                : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {market.totalPositions ?? 0} positions
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {market.status}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
