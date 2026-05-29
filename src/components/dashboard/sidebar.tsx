'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar-context';
import {
  LayoutDashboard, Mail, Search, Trash2,
  History, TrendingUp, RefreshCw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',               label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/dashboard/campaigns',     label: 'Email Messages',    icon: Mail },
  { href: '/dashboard/outreach',      label: 'Outreach Analytics',icon: TrendingUp },
  { href: '/dashboard/scraper',       label: 'Lead Scraper',      icon: Search },
  { href: '/dashboard/scraper/history', label: 'Scraper History', icon: History },
  { href: '/dashboard/leads/reset',   label: 'Reset Lead Status', icon: RefreshCw },
  { href: '/dashboard/cleanup',       label: 'Cleanup',           icon: Trash2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapse } = useSidebar();

  return (
    <div className="flex h-full w-full flex-col bg-[#1a1a2e] text-white overflow-hidden">

      {/* Logo */}
      <div className="flex-shrink-0 flex h-16 items-center border-b border-white/10 px-3">
        {collapsed ? (
          <div className="mx-auto relative h-8 w-8 flex-shrink-0">
            <Image
              src="https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg"
              alt="Toga Logo" fill className="object-contain rounded-lg" unoptimized
            />
          </div>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative h-9 w-9 flex-shrink-0">
              <Image
                src="https://res.cloudinary.com/dhnimveep/image/upload/v1778551521/WhatsApp_Image_2026-05-11_at_1.16.48_PM_w1wshg.jpg"
                alt="Toga Logo" fill className="object-contain rounded-lg" unoptimized
              />
            </div>
            <span className="text-lg font-bold tracking-wide text-white">TOGA</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {!collapsed && (
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            Main Menu
          </p>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (pathname.startsWith(href + '/') &&
              !navItems.some(
                (other) =>
                  other.href !== href &&
                  other.href.length > href.length &&
                  (pathname === other.href || pathname.startsWith(other.href + '/'))
              ));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center' : 'gap-3 px-3',
                isActive
                  ? 'bg-[#0077b6] text-white shadow-md'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:flex flex-shrink-0 border-t border-white/10 p-2">
        <button
          onClick={toggleCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex w-full items-center gap-2 px-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </div>
          )}
        </button>
      </div>

    </div>
  );
}
