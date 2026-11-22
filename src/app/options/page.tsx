import Link from 'next/link';
import { ArrowLeft, Database, ShieldAlert } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

export default function OptionsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-4 py-14">
        <section className="w-full rounded-2xl border border-amber-500/25 bg-[#141417] p-6 sm:p-10">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <Database className="h-6 w-6" />
          </div>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-amber-300">Options data unavailable</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">No option chain is connected</h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            This build does not have an authorized options feed for open interest, implied volatility, volume, or contract prices. Those fields are left blank instead of being invented.
          </p>
          <div role="note" className="mt-6 flex gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm leading-6 text-zinc-300">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <span>Live derivatives data can require provider access and exchange entitlements. A free hosting plan does not make a market-data feed free or grant redistribution rights.</span>
          </div>
          <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">
            <ArrowLeft className="h-4 w-4" /> Return to the demo terminal
          </Link>
        </section>
      </main>
    </>
  );
}
