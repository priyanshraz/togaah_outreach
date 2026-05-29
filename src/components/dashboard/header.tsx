'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar-context';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <div className="flex h-16 items-center border-b bg-white px-4 lg:px-6 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        className="mr-3 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        onClick={toggle}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate lg:text-lg">{title}</h1>
        {description && (
          <p className="hidden text-sm text-gray-500 sm:block truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
