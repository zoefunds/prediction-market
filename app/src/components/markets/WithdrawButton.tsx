"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWithdrawPosition } from "@/hooks/useWithdrawPosition";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";

export function WithdrawButton({ marketId }: { marketId: string }) {
  const withdraw = useWithdrawPosition();
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    try {
      await withdraw.mutateAsync({ marketId });
      setDone(true);
    } catch {
      // toast already shown by hook
    }
  };

  if (done || withdraw.isSuccess) {
    return (
      <Button size="sm" variant="ghost" disabled className="gap-1.5 text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Withdrawn
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={withdraw.isPending}
      className="gap-1.5"
    >
      {withdraw.isPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Withdrawing…
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          Withdraw
        </>
      )}
    </Button>
  );
}
