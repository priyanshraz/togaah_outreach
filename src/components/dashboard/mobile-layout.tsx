'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { SidebarContext } from './sidebar-context';

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close sidebar on route change (mobile nav)
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <SidebarContext.Provider value={{ toggle: () => setOpen((o) => !o), close: () => setOpen(false) }}>
      <div className="flex h-screen overflow-hidden">

        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Sidebar — slides in on mobile, always visible on lg+ */}
        <div className={`
          fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300 ease-in-out
          lg:relative lg:z-auto lg:translate-x-0 lg:flex-shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>

      </div>
    </SidebarContext.Provider>
  );
}
