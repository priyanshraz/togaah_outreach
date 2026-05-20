'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Mail,
  Search,
  Trash2,
  BarChart3,
  History,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Email Messages', icon: Mail },
  { href: '/dashboard/outreach', label: 'Outreach Analytics', icon: TrendingUp },
  { href: '/dashboard/scraper', label: 'Lead Scraper', icon: Search },
  { href: '/dashboard/scraper/history', label: 'Scraper History', icon: History },
  { href: '/dashboard/leads/reset', label: 'Reset Lead Status', icon: RefreshCw },
  { href: '/dashboard/cleanup', label: 'Cleanup', icon: Trash2 },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-[#1a1a2e] text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-9 w-9 flex-shrink-0">
            <Image
              src="https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg"
              alt="Toga Logo"
              fill
              className="object-contain rounded-lg"
              unoptimized
            />
          </div>
          <span className="text-lg font-bold tracking-wide text-white">TOGA</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
          Main Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#0077b6] text-white shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
