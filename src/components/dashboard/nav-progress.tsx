'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const hideRef = useRef<ReturnType<typeof setTimeout>>();

  // When pathname changes → navigation finished → complete the bar
  useEffect(() => {
    clearInterval(timerRef.current);
    clearTimeout(hideRef.current);
    setWidth(100);
    setVisible(true);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 400);
  }, [pathname]);

  // On mount, add a click listener on all <a> tags to start progress
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (!target || target.target === '_blank') return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http')) return;

      clearInterval(timerRef.current);
      clearTimeout(hideRef.current);
      setWidth(15);
      setVisible(true);

      // Slowly advance to 85% while waiting
      let pct = 15;
      timerRef.current = setInterval(() => {
        pct = Math.min(pct + Math.random() * 8, 85);
        setWidth(pct);
      }, 200);
    }

    document.addEventListener('click', onLinkClick);
    return () => {
      document.removeEventListener('click', onLinkClick);
      clearInterval(timerRef.current);
      clearTimeout(hideRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[3px] bg-[#0077b6] transition-all duration-200 ease-out"
      style={{ width: `${width}%` }}
    />
  );
}
