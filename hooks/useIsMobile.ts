'use client';

import { useEffect, useState } from 'react';

/**
 * خطاف مخصص لاكتشاف ما إذا كان العرض الحالي ضمن نطاق شاشات الجوال
 * @param breakpoint نقطة الكسر بالبكسل (الافتراضي 768px - md في Tailwind)
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
