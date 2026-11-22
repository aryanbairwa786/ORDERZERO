"use client";

import { ShieldAlert } from "lucide-react";

export function SebiDisclaimerBar() {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-[#09090B] px-3 py-1.5 text-[11px] text-zinc-400 dark:bg-[#09090B]">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#8B5CF6]" />
          <span>
            <strong className="text-zinc-200">Disclaimer:</strong> For educational and
            informational purposes only. Not investment advice. OrderZero is not a
            SEBI-registered investment adviser / research analyst. Order Blocks are
            technical price zones only.
          </span>
        </span>
        <span className="font-mono text-[10px] text-zinc-500">
          NSE / BSE • IST (UTC+5:30) • DPDP Act 2023 Compliant
        </span>
      </div>
    </footer>
  );
}
