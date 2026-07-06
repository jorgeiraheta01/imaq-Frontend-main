import { useEffect } from 'react';

/** Locks background page scroll while `active` is true (e.g. a modal is open). */
export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
