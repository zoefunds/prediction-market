"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { useCancelMarket } from "@/hooks/useCancelMarket";
import { Loader2, Ban } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function CancelMarketButton({
  marketId,
  creator,
  status,
}: {
  marketId: string;
  creator: string;
  status: string;
}) {
  const wallet = useWallet();
  const cancel = useCancelMarket();
  const [confirm, setConfirm] = useState(false);

  if (
    !wallet.publicKey ||
    wallet.publicKey.toBase58() !== creator ||
    status !== "Open"
  ) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirm(true)}
        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Ban className="h-3.5 w-3.5" />
        Cancel market
      </Button>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this market?</DialogTitle>
            <DialogDescription>
              All participants will be able to withdraw their stakes. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirm(false)}
              disabled={cancel.isPending}
            >
              Keep market open
            </Button>
            <Button
              onClick={async () => {
                await cancel.mutateAsync({ marketId });
                setConfirm(false);
              }}
              disabled={cancel.isPending}
              className="bg-destructive text-destructive-foreground hover:brightness-110"
            >
              {cancel.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cancelling…
                </>
              ) : (
                "Yes, cancel it"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
