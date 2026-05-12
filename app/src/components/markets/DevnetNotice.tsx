"use client";

import { Info } from "lucide-react";

export function DevnetNotice() {
  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-yellow-200/90">Devnet preview</p>
          <p className="mt-0.5">
            Submissions are temporarily paused due to a devnet Arcium MPC
            finalization incident. Position entry is disabled until callback
            finalization is stable again.
          </p>
        </div>
      </div>
    </div>
  );
}
