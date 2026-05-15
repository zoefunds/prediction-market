"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Users, TrendingUp, Coins } from "lucide-react";

import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFirebase } from "@/lib/firebase/client";
import type { Market } from "@/types";
import { PositionDialog } from "@/components/markets/PositionDialog";

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const { db } = getFirebase();
    const ref = doc(db, "markets", params.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setMarket({ id: snap.id, ...(snap.data() as Omit<Market, "id">) });
        } else {
          setMarket(null);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [params?.id]);

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="mb-4 -ml-3 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Button>

        {loading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : !market ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Market not found. The indexer may still be syncing this one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <MarketView market={market} onPick={setSide} />
            <PositionDialog
              open={side !== null}
              onOpenChange={(open) => !open && setSide(null)}
              marketPubkey={market.marketPda}
              marketQuestion={market.question || "Untitled market"}
              outcome={side ?? 1}
            />
          </>
        )}
      </main>
    </>
  );
}

function computeOdds(yesPool: number, noPool: number) {
  const total = yesPool + noPool;
  if (total === 0) return { yesPct: 50, noPct: 50, total: 0 };
  const yesPct = Math.round((yesPool / total) * 100);
  return { yesPct, noPct: 100 - yesPct, total };
}

function MarketView({
  market,
  onPick,
}: {
  market: Market;
  onPick: (side: 0 | 1) => void;
}) {
  const closeMs = market.closeTs * 1000;
  const isOpen = market.status === "Open" && closeMs > Date.now();
  const closeLabel =
    closeMs > Date.now()
      ? `Closes ${formatDistanceToNow(closeMs, { addSuffix: true })}`
      : `Closed ${formatDistanceToNow(closeMs, { addSuffix: true })}`;

  const yesPool = market.yesPool ?? 0;
  const noPool = market.noPool ?? 0;
  const { yesPct, noPct, total } = computeOdds(yesPool, noPool);
  const hasActivity = total > 0;
  const positionsPaused = true;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {market.category ? (
            <Badge variant="secondary" className="capitalize">
              {market.category}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={
              isOpen
                ? "border-primary/40 text-primary"
                : "border-border text-muted-foreground"
            }
          >
            {market.status}
            {market.status === "Resolved" && market.winningOutcome !== undefined
              ? ` • ${market.winningOutcome === 1 ? "YES" : "NO"} won`
              : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Market #{market.id}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          {market.question || "Untitled market"}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">{closeLabel}</p>
      </div>

      {/* Odds bar */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-mono font-semibold text-[color:var(--color-yes)]">
              YES {hasActivity ? `${yesPct}%` : "—"}
            </span>
            <span className="font-mono font-semibold text-[color:var(--color-no)]">
              {hasActivity ? `${noPct}%` : "—"} NO
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/60">
            {hasActivity ? (
              <div
                className="h-full bg-[color:var(--color-yes)] transition-all"
                style={{ width: `${yesPct}%` }}
              />
            ) : (
              <div className="h-full w-full bg-secondary/40" />
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            {hasActivity
              ? `${(yesPool / 1e9).toFixed(3)} / ${(noPool / 1e9).toFixed(3)} SOL pooled`
              : "No positions yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Take a position</CardTitle>
        </CardHeader>
        <CardContent>
          {isOpen ? (
            <>
              {positionsPaused ? (
                <div className="mb-3">
                  <DevnetNotice />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="bg-[color:var(--color-yes)] text-[color:var(--color-yes-fg)] hover:brightness-110"
                onClick={() => onPick(1)}
                disabled={positionsPaused}
              >
                YES {hasActivity ? `${yesPct}%` : ""}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[color:var(--color-no)]/50 text-[color:var(--color-no)] hover:bg-[color:var(--color-no)]/10"
                onClick={() => onPick(0)}
                disabled={positionsPaused}
              >
                NO {hasActivity ? `${noPct}%` : ""}
              </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This market is no longer accepting positions.
            </p>
          )}
        </CardContent>
      </Card>

      {market.description ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {market.description}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-3">
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Participants"
            value={String(market.totalPositions ?? 0)}
          />
          <Stat
            icon={<Coins className="h-4 w-4" />}
            label="Total staked"
            value={`${(total / 1e9).toFixed(3)} SOL`}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="Status"
            value={market.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-mono text-base">{value}</div>
    </div>
  );
}
