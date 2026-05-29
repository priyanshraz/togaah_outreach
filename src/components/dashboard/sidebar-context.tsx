'use client';

import { createContext, useContext } from 'react';

interface SidebarContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
  collapsed: false,
  toggleCollapse: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
