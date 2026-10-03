# Global Public Link Expiration Upgrade (7 Days) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the entire platform's public procedure links (absence inquiries, delay notices, administrative inquiries) from a 48-hour expiration to a centralized 7-day (exactly 168 hours) expiration policy with link renewal, dynamic remaining-time indicators, and complete audit logging, without breaking existing data or workflows.

**Architecture:** Centralize link expiration logic in `lib/timeUtils.ts` with single-source-of-truth constants (`PUBLIC_LINK_EXPIRATION_DAYS = 7`, `PUBLIC_LINK_EXPIRATION_HOURS = 168`, `PUBLIC_LINK_EXPIRATION_MS = 604800000`). Integrate renewal handlers in `TeacherContext` that recalculate `expiresAt` upon resend/renew requests, log audit events in `lib/auditLogger.ts`, and update the UI in public portals and administrative tables with countdowns and status badges.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Supabase PostgreSQL (`TIMESTAMPTZ`), Lucide Icons, Vitest, Playwright E2E.

**Spec:** Sprint prompt requirements for Global Public Link Expiration Upgrade — 7 Days (`docs/superpowers/plans/2026-10-03-global-public-link-expiration-7days.md`).

## Global Constraints

- Expiration duration is exactly 168 hours (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds) from the exact timestamp of creation or renewal.
- Timestamps must be stored in UTC ISO 8601 (`toISOString()`) and formatted for user display in Saudi Arabia local time (`Asia/Riyadh`).
- Backward compatibility: Existing records in the database or `localStorage` must NOT be automatically modified or broken; their existing `expires_at` is preserved until explicitly renewed.
- Zero data loss: No teacher records, absence records, inquiries, responses, or attachments may be altered or deleted.
- Security: Cryptographically random tokens (UUID v4 / 16-byte hex) remain strictly bound to single entity records; links cannot be reused once submitted and approved.

## Review Focus

1. **Exact 168-Hour Precision vs End-of-Day Drift:** Links must expire at `createdAt + 168h` down to the millisecond, not at 23:59:59 of day 7.
2. **Timezone Boundary Consistency:** Users in different local system clocks or timezones must evaluate against server/ISO UTC timestamps.
3. **Renewal State Isolation:** Renewing an expired or pending link must update `expires_at` and trigger an audit log without altering the inquiry's underlying violation date or teacher association.
4. **Submitted Form Immutability:** An expired link that was already submitted by the teacher prior to expiration must still show the success/submitted state, NOT the expired error screen.
5. **Dynamic Countdown Degradation:** Badges and counters must gracefully handle edge cases (< 1 minute remaining, clock skew, already expired).

---

### Task 1: Audit Report & Database Schema Verification

**Files:**
- Create: `docs/PUBLIC_LINK_AUDIT_REPORT.md`
- Inspect: `supabase/schema.sql`, `supabase/create_administrative_inquiries_table.sql`, `supabase/create_delay_notices_table.sql`

**Interfaces:**
- Produces: Verified list of all 3 public link types, database table column names, index definitions, and current system inventory.

- [ ] **Step 1: Inspect and document all link types in `docs/PUBLIC_LINK_AUDIT_REPORT.md`**
  Record:
  1. Absence Inquiries (`/inquiry/[token]`): table `public.absence_inquiries`, column `expires_at TIMESTAMPTZ`, index `idx_inquiries_expires_at`.
  2. Delay Notices (`/teacher-response/[token]`): table `public.delay_notices`, column `token_expires_at TIMESTAMPTZ`.
  3. Administrative Inquiries (`/administrative-inquiry/[token]`): table `public.administrative_inquiries`, column `token_expires_at TIMESTAMPTZ`.
  Confirm all tables store `TIMESTAMPTZ` with ISO 8601 strings.

- [ ] **Step 2: Commit audit report**
  ```bash
  git add docs/PUBLIC_LINK_AUDIT_REPORT.md
  git commit -m "docs: audit all public link types and expiration schema"
  ```

---

### Task 2: Centralized Link Expiration Engine & Timezone Utilities

**Files:**
- Modify: `lib/timeUtils.ts`
- Test: `lib/__tests__/timeUtils.test.ts`

**Interfaces:**
- Produces:
  - `PUBLIC_LINK_EXPIRATION_DAYS: 7`
  - `PUBLIC_LINK_EXPIRATION_HOURS: 168`
  - `PUBLIC_LINK_EXPIRATION_MS: 604800000`
  - `calculateTokenExpiry(baseDate?: Date, days?: number): string`
  - `calculate48HoursExpiry(baseDate?: Date): string` (backward-compatible alias returning 7-day expiry)
  - `isTokenExpired(expiresAt?: string | null): boolean`
  - `formatSaudiDateTime(isoString: string): string`
  - `getLinkExpiryStatus(expiresAt?: string | null, status?: string): LinkExpiryStatus`

- [ ] **Step 1: Write failing unit tests in `lib/__tests__/timeUtils.test.ts`**
  Test cases for:
  - `calculateTokenExpiry()` produces exactly 7 days (168h = 604,800,000 ms) in the future.
  - `calculate48HoursExpiry()` produces 7 days for backward compatibility.
  - `isTokenExpired()` returns `false` at 167h59m and `true` at 168h01m.
  - `formatSaudiDateTime()` formats correctly in Arabic with `Asia/Riyadh` timezone.
  - `getLinkExpiryStatus()` calculates correct remaining days and hours, and badges (`emerald`, `amber`, `rose`).

- [ ] **Step 2: Run test to verify failure**
  Run: `npm.cmd test lib/__tests__/timeUtils.test.ts`
  Expected: FAIL on new exports or 7-day assertions.

- [ ] **Step 3: Implement centralized constants and helpers in `lib/timeUtils.ts`**
  Define constants and functions without hardcoded values.

- [ ] **Step 4: Run test to verify passes**
  Run: `npm.cmd test lib/__tests__/timeUtils.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add lib/timeUtils.ts lib/__tests__/timeUtils.test.ts
  git commit -m "feat(links): centralize 7-day link expiration policy and timezone utilities"
  ```

---

### Task 3: Context & State Management with Link Renewal

**Files:**
- Modify: `context/TeacherContext.tsx`
- Test: `lib/__tests__/linkRenewal.test.ts`

**Interfaces:**
- Consumes: `calculateTokenExpiry`, `isTokenExpired`, `logAuditEvent`
- Produces:
  - `renewAbsenceInquiryLink(inquiryId: string): Promise<{ success: boolean; newExpiresAt: string; token: string; error?: string }>`
  - `renewDelayNoticeLink(noticeId: string): Promise<{ success: boolean; newExpiresAt: string; token: string; error?: string }>`
  - `renewAdministrativeInquiryLink(inquiryId: string): Promise<{ success: boolean; newExpiresAt: string; token: string; error?: string }>`

- [ ] **Step 1: Write unit tests in `lib/__tests__/linkRenewal.test.ts`**
  Verify:
  - `createAbsenceInquiry` creates inquiry with `expiresAt` = `now + 7 days`.
  - `renewAbsenceInquiryLink` extends `expiresAt` to `now + 7 days` for both active and expired inquiries.
  - Generates audit log with action `"RENEW_LINK"` containing exact expiry date.
  - Preserves inquiry metadata, teacher details, and absence date.

- [ ] **Step 2: Run test to verify failure**
  Run: `npm.cmd test lib/__tests__/linkRenewal.test.ts`
  Expected: FAIL (renewal methods not yet defined).

- [ ] **Step 3: Implement renewal methods and update creation in `context/TeacherContext.tsx`**
  - Update `createAbsenceInquiry` to call `calculateTokenExpiry()`.
  - Update `createDelayNotice` to call `calculateTokenExpiry()`.
  - Update `createAdministrativeInquiry` to call `calculateTokenExpiry()`.
  - Implement `renewAbsenceInquiryLink`, `renewDelayNoticeLink`, and `renewAdministrativeInquiryLink`.
  - Sync updates to Supabase (`expires_at` / `token_expires_at`) and `localStorage`.
  - Trigger `logAuditEvent`.

- [ ] **Step 4: Run test to verify passes**
  Run: `npm.cmd test lib/__tests__/linkRenewal.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add context/TeacherContext.tsx lib/__tests__/linkRenewal.test.ts
  git commit -m "feat(context): implement 7-day link creation and renewal handlers with audit logging"
  ```

---

### Task 4: Public Portals UI & Expiration Experience

**Files:**
- Modify: `app/inquiry/[token]/page.tsx`
- Modify: `app/teacher-response/[token]/page.tsx`
- Modify: `app/administrative-inquiry/[token]/page.tsx`

**Interfaces:**
- Consumes: `isTokenExpired`, `formatSaudiDateTime`, `getLinkExpiryStatus`

- [ ] **Step 1: Update `app/inquiry/[token]/page.tsx`**
  - Replace hardcoded "(48 ساعة من تاريخ الإرسال)" with dynamic "(7 أيام كاملة من تاريخ الإرسال)".
  - Display both `تاريخ ووقت الإرسال` and `تاريخ ووقت الانتهاء` formatted via `formatSaudiDateTime`.
  - Show active countdown badge while pending (e.g., "متبقي على مهلة الرد: 5 أيام و 12 ساعة").

- [ ] **Step 2: Update `app/teacher-response/[token]/page.tsx`**
  - Replace "(48 ساعة من تاريخ الإرسال)" with "(7 أيام كاملة من تاريخ الإرسال)".
  - Display exact timestamps for creation and expiration.

- [ ] **Step 3: Update `app/administrative-inquiry/[token]/page.tsx`**
  - Replace "(48 ساعة من تاريخ الإصدار)" with "(7 أيام كاملة من تاريخ الإصدار)".
  - Display exact timestamps and 7-day duration pill.

- [ ] **Step 4: Verify rendering and build**
  Run: `npm.cmd test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add app/inquiry/[token]/page.tsx app/teacher-response/[token]/page.tsx app/administrative-inquiry/[token]/page.tsx
  git commit -m "feat(portals): update public inquiry portals with 7-day validity and precise timestamps"
  ```

---

### Task 5: Admin Dashboards, Resend Confirmation & Remaining Time Badges

**Files:**
- Modify: `components/procedures/InquiriesTable.tsx`
- Modify: `components/procedures/AdministrativeInquiryDetailsModal.tsx`
- Modify: `app/procedures/administrative-inquiries/page.tsx`
- Modify: `components/procedures/ShareDelayNoticeModal.tsx`

**Interfaces:**
- Consumes: `renewAbsenceInquiryLink`, `renewAdministrativeInquiryLink`, `getLinkExpiryStatus`, `formatSaudiDateTime`

- [ ] **Step 1: Update `components/procedures/InquiriesTable.tsx`**
  - Add remaining-time badge in each inquiry row (Green for > 24h, Amber for < 24h, Red for Expired).
  - Add "تجديد الرابط" action button / dialog when link is expired or near expiration.
  - On "إعادة إرسال عبر واتساب", prompt user with option: "إعادة الإرسال مع تجديد الصلاحية لمدة 7 أيام إضافية".

- [ ] **Step 2: Update `components/procedures/AdministrativeInquiryDetailsModal.tsx` and list page**
  - Update status badges from "48 ساعة" to "7 أيام" / remaining days.
  - Add link renewal action button for expired inquiries.

- [ ] **Step 3: Update `components/procedures/ShareDelayNoticeModal.tsx`**
  - Display: "صلاحية الرابط: 7 أيام كاملة تنتهي في {تاريخ ووقت الانتهاء}".

- [ ] **Step 4: Verify tests and build**
  Run: `npm.cmd test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add components/procedures/InquiriesTable.tsx components/procedures/AdministrativeInquiryDetailsModal.tsx app/procedures/administrative-inquiries/page.tsx components/procedures/ShareDelayNoticeModal.tsx
  git commit -m "feat(admin): add link status badges, remaining time counters, and renewal dialogs"
  ```

---

### Task 6: Alert Center & Integration Cleanliness

**Files:**
- Modify: `lib/delayDeductionIntegration.ts`
- Modify: existing unit tests in `lib/__tests__/` that assert 48h strings or durations

**Interfaces:**
- Consumes: `PUBLIC_LINK_EXPIRATION_DAYS`, `isTokenExpired`

- [ ] **Step 1: Update alert generation in `lib/delayDeductionIntegration.ts`**
  - Replace alert title: "مساءلة غياب تجاوزت المهلة المحددة (7 أيام)".
  - Replace alert description: "المعلمة ({teacherName}) لم تقدم إفادتها لمساءلة غياب تاريخ ({date}) وانتهت مهلة الـ 7 أيام النظامية."

- [ ] **Step 2: Update existing unit tests with legacy 48h expectations**
  Update `finalProductionReadinessAudit.test.ts`, `dataIntegrity.test.ts`, `chaosTestingSuite.test.ts` to assert against the 7-day expiration policy without regressions.

- [ ] **Step 3: Run full vitest suite**
  Run: `npm.cmd test`
  Expected: All 451+ tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add lib/delayDeductionIntegration.ts lib/__tests__/
  git commit -m "refactor(alerts): align system alerts and test suites with 7-day expiration policy"
  ```

---

### Task 7: Comprehensive Playwright E2E Suite & Production Verification

**Files:**
- Create: `e2e/link-expiration-7days.spec.ts`

**Interfaces:**
- Tests all 6 required E2E scenarios from prompt:
  1. **New Link Creation:** Check `expires_at` is exactly `created_at + 7 days` (168 hours).
  2. **Before Expiration:** Verify link opens and form is fully fillable.
  3. **Exactly At Expiration:** Verify link is blocked as expired.
  4. **After Expiration:** Verify expired screen displays correct 7-day message and timestamps.
  5. **Resend / Renew Link:** Verify renewing resets expiration to `new_timestamp + 7 days`.
  6. **Different Link Types:** Verify Absence Inquiry, Delay Notice, and Administrative Inquiry all enforce 7 days.

- [ ] **Step 1: Write Playwright E2E test in `e2e/link-expiration-7days.spec.ts`**
  Cover tests 1 through 6 with mock clocks and route checks.

- [ ] **Step 2: Run Playwright tests**
  Run: `npx.cmd playwright test e2e/link-expiration-7days.spec.ts`
  Expected: PASS

- [ ] **Step 3: Run full test suite & production build**
  Run: `npm.cmd test`
  Run: `npm.cmd run build`
  Expected: 0 errors, all tests pass, static pages generated.

- [ ] **Step 4: Commit and Push**
  ```bash
  git add e2e/link-expiration-7days.spec.ts
  git commit -m "test(e2e): add comprehensive 7-day link expiration and renewal test suite"
  git push origin main
  ```
