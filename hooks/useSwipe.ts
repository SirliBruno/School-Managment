'use client';

import { useRef } from 'react';

/**
 * خطاف مخصص لاكتشاف إيماءات السحب باللمس على الجوال
 * @param onSwipeRight استدعاء عند السحب لليمين (إغلاق الدرج في الـ RTL مثلاً)
 * @param onSwipeLeft استدعاء عند السحب لليسار
 * @param threshold مسافة السحب الدنيا بالبكسل لتفعيل الإجراء
 */
export function useSwipe(
  onSwipeRight?: () => void,
  onSwipeLeft?: () => void,
  threshold = 50
) {
  const startX = useRef(0);
  const startY = useRef(0);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;

      // تجاهل إذا كانت الحركة رأسية وليست أفقية
      if (Math.abs(dx) < Math.abs(dy)) return;

      if (dx > threshold) onSwipeRight?.();
      if (dx < -threshold) onSwipeLeft?.();
    },
  };
}
