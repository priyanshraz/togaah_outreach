'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { SidebarContext } from './sidebar-context';
import { NavProgress } from './nav-progress';
import { BackgroundTaskProvider } from '@/components/background-tasks/background-task-context';
import { BackgroundTaskBar } from '@/components/background-tasks/background-task-bar';

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  // Auto-close mobile sidebar on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const desktopWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <BackgroundTaskProvider>
      <SidebarContext.Provider value={{
        open,
        toggle: () => setOpen((o) => !o),
        close: () => setOpen(false),
        collapsed,
        toggleCollapse,
      }}>
        <div className="flex h-screen overflow-hidden">
          <NavProgress />

          {/* Mobile backdrop */}
          {open && (
            <div
              className="fixed inset-0 z-20 bg-black/50 lg:hidden"
              onClick={() => setOpen(false)}
            />
          )}
          {/* Mobile sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300 ease-in-out lg:hidden
            ${open ? 'translate-x-0' : '-translate-x-full'}
          `}>
            <Sidebar />
          </div>

          {/* Desktop sidebar */}
          <div className={`
            hidden lg:block flex-shrink-0 transition-all duration-300 ease-in-out
            ${desktopWidth}
          `}>
            <Sidebar />
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
            <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
          </div>

        </div>

        {/* Floating background task progress bar */}
        <BackgroundTaskBar />

      </SidebarContext.Provider>
    </BackgroundTaskProvider>
  );
}
