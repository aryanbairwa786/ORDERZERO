'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  CandlestickChart,
  GitFork,
  LayoutDashboard,
  ListFilter,
  Menu,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Terminal', icon: LayoutDashboard },
  { href: '/chart/RELIANCE.NS', label: 'Charts', icon: CandlestickChart },
  { href: '/screener', label: 'Screener', icon: ScanSearch },
  { href: '/playbook', label: 'Playbook', icon: GitFork },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/options', label: 'Options', icon: ListFilter },
  { href: '/disclosures', label: 'Method', icon: ShieldCheck },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60_000);
    return () => clearInterval(interval);
  }, []);

  const renderLinks = (mobile = false) => navItems.map((item) => {
    const Icon = item.icon;
    const root = item.href.split('/').slice(0, 2).join('/');
    const isActive = pathname === item.href || pathname.startsWith(root);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => mobile && setMobileOpen(false)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
        }`}
      >
        <Icon className="h-4 w-4" />{item.label}
      </Link>
    );
  });

  return (
    <nav className="sticky top-0 z-50 border-b border-[#27272A] bg-[#09090B]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-[1920px] items-center justify-between gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-violet-600 text-white">
            <TrendingUp className="h-5 w-5" />
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-white sm:block">Order<span className="text-emerald-400">Zero</span></span>
        </Link>
        <div className="hidden items-center gap-0.5 lg:flex">{renderLinks()}</div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <Activity className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-zinc-400">Demo · {timeStr ? `${timeStr} IST` : 'IST'}</span>
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && <div className="grid grid-cols-2 gap-1 border-t border-[#27272A] px-4 py-3 sm:grid-cols-3 lg:hidden">{renderLinks(true)}</div>}
    </nav>
  );
}
