---
name: arabic-administrative-procedures-engine
description: Architectural and implementation blueprint for Arabic administrative platforms, 7-day reactive countdowns, unified electronic signatures, and zero-wrap Arabic PDF print layout engineering.
---

# Arabic Administrative Procedures & PDF Print Engine

Use this skill when building, enhancing, or debugging administrative inquiry workflows, expiration timers, and Arabic RTL PDF print/export systems in Next.js/React environments.

## 1. Zero-Wrap Arabic PDF Layout Architecture (Mandatory Rule)

When designing printable forms (A4) in Arabic RTL:
1. **Never allow browser default word-wrapping on signatures or dates:** Long Arabic names cause subsequent words like `إلكترونياً` to break into two lines, colliding with adjacent date fields.
2. **Mandatory CSS Rule:**
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
3. **Proportional Column Distribution:**
   - Name column (Right): `style="flex: 1 1 auto; text-align: right; white-space: nowrap;"`
   - Signature column (Center): `style="flex: 0 0 auto; text-align: center; white-space: nowrap; padding: 0 8px;"`
   - Date column (Left): `style="flex: 0 0 auto; text-align: left; white-space: nowrap;"`

## 2. Unified Electronic Signature Protocol

- When an employee responds electronically:
  `التوقيع : تم التوقيع والمصادقة إلكترونياً` with explicit response timestamp.
- When an empty form is printed manually:
  `التوقيع : ....................` with dotted date placeholder.

## 3. Date Formatting Hierarchy

1. **Official Document Header:** Full dual date:
   `1448/05/16 هـ (الموافق 2026/10/27م)`
2. **Signature and Decision Rows:** Compact DMY:
   `27 / 10 / 2026 م` (prevents crowding adjacent fields).
3. **System Timezone:** Always bind to `Asia/Riyadh` with Latin numbers:
   `toLocaleString("ar-SA-u-nu-latn", { timeZone: "Asia/Riyadh", ... })`.

## 4. Reactive Countdown & 7-Day Mahdar Escalation

1. Calculate remaining time with `getTimeRemaining(expiresAt)`.
2. Wrap badge in `mounted` check to prevent React hydration mismatch between server and client.
3. When `isExpired` (168 hours elapsed without response):
   - Display expiration warning badge.
   - Show administrative escalation action to convert unresponded inquiry into an official report (محضر إداري).
   - Encode all transfer parameters using `encodeURIComponent`.

## 5. Next.js App Router Hardening

- Any page consuming `useSearchParams()` must wrap child components in `<Suspense fallback={...}>` to prevent build-time static bailout errors.
