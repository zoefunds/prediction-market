"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { MarketGrid } from "@/components/markets/MarketGrid";
import { useMarkets } from "@/hooks/useMarkets";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lock, Shield, Zap } from "lucide-react";

const CATEGORIES = ["All", "Crypto", "Politics", "Sports", "Tech", "Culture"];

export default function HomePage() {
  const { data: markets, loading } = useMarkets();
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
  const [category, setCategory] = useState("All");

  const filtered = markets.filter((m) => {
    if (tab === "open" && m.status !== "Open") return false;
    if (tab === "resolved" && m.status !== "Resolved") return false;
    if (category !== "All" && m.category?.toLowerCase() !== category.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <Hero />

        <div className="mt-10 mb-5 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (category === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <MarketGrid markets={filtered} loading={loading} />
      </main>
    </>
  );
}

function Hero() {
  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-10">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <Badge
          variant="secondary"
          className="mb-4 gap-1.5 border border-primary/30 bg-primary/10 text-primary"
        >
          <Lock className="h-3 w-3" /> Encrypted positions
        </Badge>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Trade on outcomes privately.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Your prediction stays encrypted on-chain via Arcium MPC. The market
          settles in SOL on Solana, and only you know your position until you
          claim.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Feature icon={<Shield className="h-4 w-4" />} text="MPC-encrypted positions" />
          <Feature icon={<Zap className="h-4 w-4" />} text="Settled on Solana in SOL" />
          <Feature icon={<Lock className="h-4 w-4" />} text="Pools revealed only at resolution" />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-secondary/60 px-3 py-1.5 text-xs">
      <span className="text-primary">{icon}</span>
      {text}
    </div>
  );
}
