"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/create", label: "Create" },
];

export function TopNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/brand/logo.svg" alt="CipherMarket" className="h-9 w-9 rounded-md" />
          <span className="hidden text-base font-semibold tracking-tight sm:inline">CipherMarket</span>
        </a>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <a key={n.href} href={n.href} className={cn("rounded-md px-3 py-1.5 transition-colors", active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
                {n.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground w-72">
            <Search className="h-4 w-4" />
            <input type="text" placeholder="Search markets..." className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" />
          </div>
          <div className="cm-wallet-shell">{mounted ? <WalletMultiButton /> : null}</div>
        </div>
      </div>
    </header>
  );
}
