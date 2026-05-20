'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 rounded-full bg-[#0077b6]/10 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0077b6] text-white text-xs font-bold">
            T
          </div>
          <span className="text-sm font-medium text-gray-700">Toga Admin</span>
        </div>
      </div>
    </div>
  );
}
