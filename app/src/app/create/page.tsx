"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateMarket } from "@/hooks/useCreateMarket";
import { useWallet } from "@solana/wallet-adapter-react";
import { Lock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["crypto", "politics", "sports", "tech", "culture", "general"];

function defaultCloseDate(): string {
  // Default to 7 days from now, formatted for <input type="datetime-local">.
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  // toISOString gives Z; strip the Z and seconds for datetime-local
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function CreatePage() {
  const wallet = useWallet();
  const router = useRouter();
  const createMarket = useCreateMarket();

  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("crypto");
  const [closeAt, setCloseAt] = useState(defaultCloseDate());

  const closeTs = Math.floor(new Date(closeAt).getTime() / 1000);
  const valid =
    question.trim().length > 5 &&
    description.trim().length > 10 &&
    closeTs * 1000 > Date.now() + 60_000 &&
    !!wallet.publicKey;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const res = await createMarket.mutateAsync({
      question: question.trim(),
      description: description.trim(),
      category,
      closeTs,
    });
    // Indexer will mirror it shortly; navigate to the dashboard.
    router.push("/");
  };

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a market
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Markets settle in SOL on Solana. Positions stay encrypted on-chain
          until you choose to claim.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-primary" />
                Market details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  placeholder="Will SOL reach $500 by year end?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={200}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A clear yes-or-no question. {question.length}/200
                </p>
              </div>

              <div>
                <Label htmlFor="description">Resolution criteria</Label>
                <textarea
                  id="description"
                  placeholder="How will this be decided? Specify exact source and condition."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-md border border-input bg-input px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {description.length}/1000
                </p>
              </div>

              <div>
                <Label>Category</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCategory(c)}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors capitalize " +
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

              <div>
                <Label htmlFor="closeAt">Closes at</Label>
                <Input
                  id="closeAt"
                  type="datetime-local"
                  value={closeAt}
                  onChange={(e) => setCloseAt(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  No more positions can be submitted after this time. Resolution
                  is performed by you (the creator) after this point.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-start gap-3">
              <Badge
                variant="secondary"
                className="border border-primary/30 bg-primary/10 text-primary"
              >
                cost
              </Badge>
              <p className="text-xs text-muted-foreground">
                Creating a market costs roughly <strong className="text-foreground">~0.012 SOL</strong> in
                rent for the on-chain Market and Vault accounts. You earn the
                creator fee on the total pool when participants claim.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/")}
              disabled={createMarket.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || createMarket.isPending}>
              {createMarket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create market"
              )}
            </Button>
          </div>

          {!wallet.publicKey ? (
            <p className="text-center text-xs text-muted-foreground">
              Connect a Solana wallet to continue.
            </p>
          ) : null}
        </form>
      </main>
    </>
  );
}
