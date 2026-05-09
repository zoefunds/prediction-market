"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSubmitPosition } from "@/hooks/useSubmitPosition";

export function PositionDialog({
  open,
  onOpenChange,
  marketId,
  marketQuestion,
  outcome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  marketId: string;
  marketQuestion: string;
  outcome: 0 | 1; // 0 = NO, 1 = YES
}) {
  const wallet = useWallet();
  const submit = useSubmitPosition();

  const [stake, setStake] = useState("0.05");
  const stakeNum = Number(stake);
  const valid = stakeNum >= 0.001 && stakeNum <= 1000 && !!wallet.publicKey;

  // Reset on open
  useEffect(() => {
    if (open) setStake("0.05");
  }, [open]);

  const onConfirm = async () => {
    if (!valid) return;
    await submit
      .mutateAsync({ marketId, outcome, stakeSol: stakeNum })
      .then(() => onOpenChange(false))
      .catch(() => {
        /* toast already shown */
      });
  };

  const sideLabel = outcome === 1 ? "YES" : "NO";
  const sideColor =
    outcome === 1
      ? "text-[color:var(--color-yes)]"
      : "text-[color:var(--color-no)]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Stake on{" "}
            <span className={sideColor}>{sideLabel}</span>
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {marketQuestion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="stake">Stake (SOL)</Label>
            <Input
              id="stake"
              type="number"
              step="0.001"
              min="0.001"
              max="1000"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="mt-1.5 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Minimum 0.001 SOL. Stake transfers to the market vault on-chain.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["0.01", "0.05", "0.1", "0.5"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStake(v)}
                className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-xs transition-colors hover:bg-accent"
              >
                {v} SOL
              </button>
            ))}
          </div>

          <div className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 text-foreground">
              <Lock className="h-3 w-3 text-primary" />
              Your side and stake amount are encrypted before going on-chain.
            </p>
            <p className="mt-1.5">
              Only you (with your wallet) can later prove what you wagered. The
              market totals stay encrypted until resolution.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submit.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!valid || submit.isPending}
            className={
              outcome === 1
                ? "bg-[color:var(--color-yes)] text-[color:var(--color-yes-fg)] hover:brightness-110"
                : "bg-[color:var(--color-no)] text-[color:var(--color-no-fg)] hover:brightness-110"
            }
          >
            {submit.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Encrypting & signing…
              </>
            ) : (
              `Stake ${stake} SOL on ${sideLabel}`
            )}
          </Button>
        </DialogFooter>

        {!wallet.publicKey ? (
          <p className="-mt-2 text-center text-xs text-muted-foreground">
            Connect a Solana wallet to continue.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
