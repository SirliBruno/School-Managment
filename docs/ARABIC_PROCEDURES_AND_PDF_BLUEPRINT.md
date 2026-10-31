# دليل بناء منظومة المساءلات والعد التنازلي وطباعة الـ PDF العربية (ARABIC PROCEDURES & PDF BLUEPRINT)

> تم استخلاص هذا المرجع وتوثيقه بناءً على التعديلات المعتمدة والمثبتة بنجاح، ليكون دليلاً استرشادياً شاملاً لنقل وتكرار نفس المنظومة في أي مشروع إداري أو تعليمي جديد.

---

## 1. محرك العد التنازلي التفاعلي والمهلة الزمنية (7 أيام)

### أ. حساب الوقت المتبقي (`timeUtils.ts`)
```typescript
export interface TimeRemainingResult {
  isExpired: boolean;
  totalHours: number;
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
  formattedArabic: string;
  variant: "normal" | "urgent" | "expired";
}

export function getTimeRemaining(expiresAt?: string | null): TimeRemainingResult {
  if (!expiresAt) {
    return {
      isExpired: false,
      totalHours: 0,
      totalMinutes: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formattedArabic: "مهلة مفتوحة",
      variant: "normal",
    };
  }

  const now = Date.now();
  const target = new Date(expiresAt).getTime();
  const diffMs = target - now;

  if (isNaN(target) || diffMs <= 0) {
    return {
      isExpired: true,
      totalHours: 0,
      totalMinutes: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      formattedArabic: "انتهت المهلة",
      variant: "expired",
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const remainingMinutes = totalMinutes % 60;

  let formattedArabic = "";
  if (days > 0) {
    formattedArabic = `${days} يوم و ${remainingHours} ساعة`;
  } else if (remainingHours > 0) {
    formattedArabic = `${remainingHours} ساعة و ${remainingMinutes} دقيقة`;
  } else {
    formattedArabic = `${remainingMinutes} دقيقة`;
  }

  return {
    isExpired: false,
    totalHours,
    totalMinutes,
    days,
    hours: remainingHours,
    minutes: remainingMinutes,
    formattedArabic,
    variant: totalHours < 24 ? "urgent" : "normal",
  };
}
```

### ب. خطاف التحديث التلقائي (`useRemainingTime.ts`)
```typescript
import { useState, useEffect } from "react";
import { getTimeRemaining, TimeRemainingResult } from "@/lib/timeUtils";

export function useRemainingTime(expiresAt?: string | null, updateIntervalMs = 60000) {
  const [result, setResult] = useState<TimeRemainingResult>(() => getTimeRemaining(expiresAt));

  useEffect(() => {
    setResult(getTimeRemaining(expiresAt));
    if (!expiresAt) return;

    const timer = setInterval(() => {
      setResult(getTimeRemaining(expiresAt));
    }, updateIntervalMs);

    return () => clearInterval(timer);
  }, [expiresAt, updateIntervalMs]);

  return result;
}
```

### ج. حماية الـ Hydration في شارة العد التنازلي (`RemainingTimeBadge.tsx`)
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) {
  return <span className="inline-block w-20 h-6 bg-slate-100 rounded-full animate-pulse" />;
}
```

---

## 2. توحيد صياغة التوقيع والمصادقة الإلكترونية في مستندات الطباعة

### أ. النص الرسمي المعتمد
- عند وجود رد إلكتروني: `التوقيع : تم التوقيع والمصادقة إلكترونياً` مع تاريخ تقديم الإفادة.
- عند طباعة استمارة فارغة: `التوقيع : ....................` مع تاريخ نقطي `.... / .... / ........`.

---

## 3. هندسة منع انكسار وتداخل النصوص في الطباعة العربية (Zero-Wrap Flex Layout)

### أ. أنماط الـ CSS الإلزامية
```css
.sig-row, .sig {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 8px;
  font-size: 8.5pt;
  font-weight: bold;
  box-sizing: border-box;
  gap: 8px;
}

.sig-row > div, .sig > div {
  white-space: nowrap;
}

.sig-electronic-badge {
  display: inline-block;
  white-space: nowrap;
}

.sig-img {
  max-height: 48px;
  max-width: 140px;
  object-fit: contain;
  vertical-align: middle;
  display: inline-block;
}
```

### ب. هيكل الـ HTML للأعمدة الثلاثة
```html
<div class="sig-row">
  <div style="flex: 1 1 auto; text-align: right; white-space: nowrap;">
    اسم الموظفة : <span style="font-weight:700">${teacherName}</span>
  </div>
  <div style="flex: 0 0 auto; text-align: center; white-space: nowrap; padding: 0 8px;">
    التوقيع : <span class="sig-electronic-badge">
      ${hasResponse ? "تم التوقيع والمصادقة إلكترونياً" : "...................."}
    </span>
  </div>
  <div style="flex: 0 0 auto; text-align: left; white-space: nowrap;">
    التاريخ : <span>${hasResponse ? responseDateFormatted : ".... / .... / ........"}</span>
  </div>
</div>
```

---

## 4. قائمة التحقق السريعة للنقل لأي مشروع جديد
1. استيراد دوال التاريخ وضبط المنطقة الزمنية `Asia/Riyadh`.
2. تضمين قواعد `.sig-row > div { white-space: nowrap; }` في جميع قوالب الطباعة.
3. اعتماد `getTimeRemaining` و `useRemainingTime` لإدارة المهل الزمنية.
4. تغليف صفحات الـ Query Params بـ `<Suspense>`.
