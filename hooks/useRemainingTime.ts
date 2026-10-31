"use client";

import { useState, useEffect } from "react";
import {
  calculateRemainingCountdown,
  RemainingCountdown,
} from "@/lib/timeUtils";

export interface RemainingTimeDetails extends RemainingCountdown {
  isCompleted: boolean;
}

/**
 * خطاف تفاعلي لحساب وعرض الوقت المتبقي الحي (أيام، ساعات، دقائق، ثوانٍ)
 * مع تحديث زمني مستمر وتدرج لوني ذكي
 */
export function useRemainingTime(
  expiresAt?: string | null,
  isCompleted: boolean = false
): RemainingTimeDetails {
  const [countdown, setCountdown] = useState<RemainingCountdown>(() =>
    calculateRemainingCountdown(expiresAt)
  );

  useEffect(() => {
    if (isCompleted || !expiresAt) {
      setCountdown(calculateRemainingCountdown(expiresAt));
      return;
    }

    // التحديث الفوري
    const update = () => {
      const current = calculateRemainingCountdown(expiresAt);
      setCountdown(current);
      return current;
    };

    const initial = update();
    if (initial.isExpired) {
      return;
    }

    // اختيار معدل التحديث: كل ثانية للمدة الحرجة (أقل من ساعة)، أو كل دقيقة
    const intervalMs = initial.totalMs <= 60 * 60 * 1000 ? 1000 : 60000;

    const timer = setInterval(() => {
      const next = update();
      if (next.isExpired) {
        clearInterval(timer);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [expiresAt, isCompleted]);

  if (isCompleted) {
    return {
      isExpired: false,
      isUrgent: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      totalRemainingSeconds: 0,
      formattedExact: "تم تقديم الإفادة بنجاح",
      formattedShort: "مكتمل",
      badgeVariant: "emerald",
      isCompleted: true,
    };
  }

  return {
    ...countdown,
    isCompleted: false,
  };
}
