import { useState, useEffect } from 'react';

const BREAKPOINT = 768;

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.matchMedia(`(max-width: ${BREAKPOINT}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
