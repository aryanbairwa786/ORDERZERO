"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart2, BookOpen, GitFork, ShieldCheck } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Terminal", icon: Activity },
  { href: "/chart/NIFTY%2050", label: "Full Chart", icon: BarChart2 },
  { href: "/playbook", label: "Playbook & Flowchart", icon: GitFork },
  { href: "/journal", label: "Journal & P&L", icon: BookOpen },
  { href: "/disclosures", label: "Method & Disclosures", icon: ShieldCheck },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm font-mono shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            OB
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight text-white">
              Order<span className="text-emerald-400">Zero</span>
            </span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
              100% FREE
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href.startsWith("/chart") && pathname?.startsWith("/chart"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-950 transition"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Open Terminal</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
