# تقرير تدقيق الروابط العامة في المنصة (Public Link Audit Report)
## Sprint: Global Public Link Expiration Upgrade — 7 Days

---

### 1. أنواع الروابط العامة المعتمدة في النظام

| # | نوع الإجراء | المسار العام (Route) | دالة التوليد البرمجية | جدول قاعدة البيانات | حقل انتهاء الصلاحية | نوع البيانات في DB |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **مساءلة الغياب** | `/inquiry/[token]` | `getInquiryPublicUrl` | `absence_inquiries` | `expires_at` | `TIMESTAMPTZ NOT NULL` |
| **2** | **تنبيه التأخر والانصراف** | `/teacher-response/[token]` | `getDelayNoticePublicUrl` | `delay_notices` | `token_expires_at` | `TIMESTAMPTZ` |
| **3** | **المساءلة الإدارية المستقلة** | `/administrative-inquiry/[token]` | `getAdministrativeInquiryPublicUrl` | `administrative_inquiries` | `token_expires_at` | `TIMESTAMPTZ NOT NULL` |

---

### 2. تدقيق مخطط قاعدة البيانات (Database Schema Audit)

1. **جدول `public.absence_inquiries`:**
   - الحقل: `expires_at TIMESTAMPTZ NOT NULL`
   - الفهرس: `idx_inquiries_expires_at ON public.absence_inquiries(expires_at)` (موجود ومفعل)
   - صيغة التخزين: ISO 8601 UTC string (`2026-10-03T16:00:00.000Z`)

2. **جدول `public.delay_notices`:**
   - الحقل: `token_expires_at TIMESTAMPTZ`
   - الفهرس: `idx_delay_notices_share_token ON public.delay_notices(share_token)`
   - صيغة التخزين: ISO 8601 UTC string

3. **جدول `public.administrative_inquiries`:**
   - الحقل: `token_expires_at TIMESTAMPTZ NOT NULL`
   - الفهرس: `idx_admin_inquiries_token ON public.administrative_inquiries(token)`
   - صيغة التخزين: ISO 8601 UTC string

---

### 3. تدقيق منطق الصلاحية الحالي مقابل المستهدف

- **الوضع السابق:**
  - القيمة: 48 ساعة = 2 أيام = 172,800,000 مللي ثانية.
  - طريقة الحساب: `new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()`
  - مشكلة العرض: كان يتم عرض التاريخ فقط دون الساعة، مما يوحي بسريان الرابط لنهاية اليوم.
- **الوضع المستهدف الجديد:**
  - القيمة: 7 أيام كاملة = 168 ساعة بالضبط = 604,800,000 مللي ثانية.
  - طريقة الحساب: دالة مركزية `calculateTokenExpiry()` تحسب 168 ساعة بالدقيقة والثانية.
  - ميزة التجديد: إمكانية تمديد صلاحية أي رابط لمدة 7 أيام إضافية مع تسجيل ذلك في سجل التدقيق (`audit_logs`).
  - المحافظة التامة: عدم المساس بالسجلات القديمة أو تواريخ الغياب أو المرفقات.
