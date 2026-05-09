"use client";

import { TopNav } from "@/components/layout/TopNav";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";

export default function PortfolioPage() {
  const wallet = useWallet();

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your encrypted positions across all markets.
        </p>

        {!wallet.publicKey ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Connect your wallet to see your portfolio.
            </p>
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No positions yet. Browse{" "}
              <a href="/" className="text-primary underline">
                open markets
              </a>{" "}
              to take a position.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
