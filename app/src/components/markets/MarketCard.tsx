"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Market } from "@/types";

function computeOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool;
  if (total === 0) return { yesPct: 50, noPct: 50, total: 0 };
  const yesPct = Math.round((yesPool / total) * 100);
  return { yesPct, noPct: 100 - yesPct, total };
}

export function MarketCard({ market }: { market: Market }) {
  const closeMs = market.closeTs * 1000;
  const closing = closeMs - Date.now();
  const closingLabel =
    closing > 0
      ? `Closes ${formatDistanceToNow(closeMs, { addSuffix: true })}`
      : "Closed";

  const yesPool = market.yesPool ?? 0;
  const noPool = market.noPool ?? 0;
  const { yesPct, noPct, total } = computeOdds(yesPool, noPool);
  const hasActivity = total > 0;
  const totalSol = total / 1e9;

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

        {/* YES/NO bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-mono text-[color:var(--color-yes)]">
              YES {hasActivity ? `${yesPct}%` : "—"}
            </span>
            <span className="font-mono text-[color:var(--color-no)]">
              {hasActivity ? `${noPct}%` : "—"} NO
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
            {hasActivity ? (
              <div
                className="h-full bg-[color:var(--color-yes)] transition-all"
                style={{ width: `${yesPct}%` }}
              />
            ) : (
              <div className="h-full w-full bg-secondary/40" />
            )}
          </div>
          {hasActivity ? (
            <p className="mt-1.5 text-[10px] text-muted-foreground font-mono">
              {totalSol.toFixed(3)} SOL staked
            </p>
          ) : (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              No positions yet
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {market.totalPositions ?? 0} positions
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {market.status}
            {market.status === "Resolved" && market.winningOutcome !== undefined
              ? ` • ${market.winningOutcome === 1 ? "YES" : "NO"} won`
              : ""}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
