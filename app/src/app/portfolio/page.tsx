"use client";

import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, ExternalLink, Lock, CheckCircle2, HelpCircle } from "lucide-react";
import { usePortfolio, type PortfolioPosition } from "@/hooks/usePortfolio";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawButton } from "@/components/markets/WithdrawButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER ?? "devnet";

function fmtSol(lamports: string): string {
  const sol = Number(lamports) / 1e9;
  return sol < 0.01 ? sol.toFixed(4) : sol.toFixed(3);
}

function PositionRow({ position: p }: { position: PortfolioPosition }) {
  const explorer = p.signature
    ? `https://explorer.solana.com/tx/${p.signature}?cluster=${CLUSTER}`
    : `https://explorer.solana.com/address/${p.positionPda}?cluster=${CLUSTER}`;

  const sideLabel = p.outcome === 1 ? "YES" : p.outcome === 0 ? "NO" : "?";
  const sideColor =
    p.outcome === 1
      ? "text-[color:var(--color-yes)]"
      : p.outcome === 0
        ? "text-[color:var(--color-no)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div className={`grid h-12 w-12 place-items-center rounded-md bg-secondary/40 font-bold ${sideColor}`}>
          {p.outcome === undefined ? <HelpCircle className="h-5 w-5" /> : sideLabel}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/markets/${p.marketId}`} className="line-clamp-1 text-sm font-semibold hover:text-primary">
            {p.marketQuestion}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{fmtSol(p.amountLamports)} SOL</span>
            <span>·</span>
            <Badge variant="outline">{p.marketStatus}</Badge>
            <span className="flex items-center gap-1 text-[10px] text-primary">
              <CheckCircle2 className="h-3 w-3" />
              On-chain
            </span>
            {p.claimed ? <Badge variant="secondary" className="text-[10px]">claimed</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {p.marketStatus === "Cancelled" && !p.claimed ? (
            <WithdrawButton marketId={p.marketId} />
          ) : null}
          <a href={explorer} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" title="View on Solana Explorer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  const wallet = useWallet();
  const { positions, loading } = usePortfolio();

  const totalStaked = positions.reduce((s, p) => s + Number(p.amountLamports) / 1e9, 0).toFixed(3);
  const active = positions.filter((p) => p.marketStatus === "Open" && !p.claimed).length;

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your encrypted positions across all markets.</p>
          </div>
          {wallet.publicKey ? (
            <p className="text-xs text-muted-foreground font-mono">
              {wallet.publicKey.toBase58().slice(0, 4)}…{wallet.publicKey.toBase58().slice(-4)}
            </p>
          ) : null}
        </div>

        {!wallet.publicKey ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Connect your wallet</p>
            <p className="mt-1 text-sm text-muted-foreground">Connect a Solana wallet to see your portfolio.</p>
          </div>
        ) : loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : positions.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No positions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse <Link href="/" className="text-primary underline">open markets</Link> to take a position.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active positions</div>
                <div className="mt-1 font-mono text-lg font-semibold">{active}</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total staked</div>
                <div className="mt-1 font-mono text-lg font-semibold">{totalStaked} SOL</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Markets</div>
                <div className="mt-1 font-mono text-lg font-semibold">{positions.length}</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {positions.map((p) => <PositionRow key={p.positionPda} position={p} />)}
            </div>
          </>
        )}
      </main>
    </>
  );
}
