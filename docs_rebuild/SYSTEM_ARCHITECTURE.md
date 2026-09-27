# وثيقة المعمارية التقنية الموصى بها (System Architecture Document)
## منصة الغياب والمساءلات الإدارية المدرسية (Administrative Absence Platform)

---

## 1. المقدمة ودوافع إعادة البناء المعماري (Architectural Rationale)

### 1.1 تشخيص المعمارية السابقة والخلل البرمجي (Legacy Anti-Patterns)
عانى الإصدار السابق من المنصة من مشاكل بنيوية وتراكم تقني (Technical Debt) أعاق الصيانة والتوسع، وأبرز هذه الاختناقات:
1. **السياق الأحادي العملاق (The 4,190-Line God Context):**
   - تم تجميع كافة وظائف النظام داخل ملف واحد (`TeacherContext.tsx`) تجاوزت أسطره 4,190 سطراً.
   - قام الملف بإدارة حالة React، وتوليد استعلامات Supabase، ومزامنة LocalStorage، وخوارزميات استيراد Excel، وخوارزمية دمج التكرارات (Union-Find)، وحسابات مدد التأخر باللغة العربية، وحالات نوافذ العرض (Modals)، وعمليات الأرشفة والاستعادة.
   - هذا التداخل أدى إلى صعوبة تتبع الأخطاء، وإعادة تصيير كاملة وغير مبررة للمكونات (Unnecessary Re-renders)، وسباقات غير متزامنة (Race Conditions) أثناء انقطاع الشبكة.
2. **ازدواجية واضطراب نماذج البيانات (Type Inconsistency):**
   - تكرار تمثيل المعلمات بمسميات متضاربة في نفس النموذج: `nationalId` و `jobNumber` و `username` لنفس الغرض، و `name` مقابل `fullName`.
   - افتقار بعض الكيانات الأساسية (مثل `deduction_decisions`) إلى جدول حقيقي في قاعدة بيانات Supabase، والاعتماد بدلاً من ذلك على التخزين المحلي للمتصفح.
3. **الثغرات الأمنية في سياسات الوصول (Permissive RLS):**
   - احتوت قواعد Supabase السابقة على سياسات وصول مفتوحة للعامة (`USING (true) WITH CHECK (true)` على دور `anon`) مما مثل مخاطرة أمنية تتطلب ضبطاً دقيقاً عبر فحص الرموز الأمنية (Tokens) أو صلاحيات الحساب الإداري.
4. **غياب طبقة الخدمات المستقلة (Missing Service Layer):**
   - امتزجت قواعد الأعمال الحسابية (Business Logic) الخاصة بالمادة (21) والقرار الوزاري مباشرة بواجهات العرض، مما منع إعادة استخدامها واختبارها بمعزل عن واجهات المستخدم.

### 1.2 أهداف المعمارية الجديدة
- **فصل الاهتمامات (Separation of Concerns):** عزل طبقة واجهات العرض تماماً عن طبقة الأعمال وعن طبقة الوصول للبيانات.
- **النوعية الصارمة (Strict Type Safety):** استخدام كود TypeScript دقيق مبني على استخراج مخطط Supabase آلياً (`supabase gen types`).
- **معمارية الخدمات والمستودعات (Service-Repository Pattern):** تحويل كافة العمليات إلى دوال وخدمات برمجية نقية وسهلة الاختبار.
- **إدارة الحالة الحديثة والذكية (Modern Data Fetching & Caching):** استبدال السياق الضخم بحلول استعلام مؤقتة ومستقلة (TanStack Query / SWR) تدعم التحديث بالوقت الفعلي دون إرهاق المعالج.

---

## 2. الهيكل التقني الموصى به (Recommended Tech Stack)

| الطبقة / التقنية | التقنية المختارة | الإصدار الموصى به | مسوغات الاختيار |
| :--- | :--- | :--- | :--- |
| **إطار العمل الأساسي** | Next.js (App Router) | `14.2+` أو `15.x` | أداء فائق في التحميل الأولي، دعم Server Components، وتوجيه آمن للمسارات العامة والمحمية. |
| **لغة البرمجة** | TypeScript | `5.7+` | التحقق المسبق من صحة الأنواع في بيئة الإدارة المالية والغياب. |
| **قاعدة البيانات والتخزين** | Supabase (PostgreSQL 15+) | سحابية / محلية | قاعدة بيانات علائقية متينة، دعم أصلي لسياسات الأمان على مستوى الصفوف (RLS)، والتخزين السحابي للمرفقات وRealtime. |
| **إدارة جلب وتكييش البيانات** | TanStack Query (React Query) | `v5.x` | تكييش فائق، إدارة دورة حياة الاستعلامات، إعادة المحاولة التلقائية، وإلغاء الحاجة للسياقات العملاقة. |
| **تنسيق الواجهات والتصميم** | Tailwind CSS | `3.4+` | بناء واجهات خفيفة، سرعة التطوير، وتوافق تام مع نظام الاتجاه من اليمين لليسار (RTL). |
| **الحركات والمؤثرات** | Framer Motion | `11.x` أو `12.x` | تجربة مستخدم سلسة في النوافذ المنبثقة، التنبيهات، واللوحات السفلية على الجوال. |
| **أيقونات النظام** | Lucide React | `0.47+` | مكتبة أيقونات خفيفة متناسقة ومعبرة عن الإجراءات الإدارية. |
| **قراءة ومعالجة ملفات Excel** | SheetJS (`xlsx`) | `0.18.5` | تحليل واستيراد ملفات الإكسل بكافة صيغها في بيئة العميل بكفاءة. |
| **ضغط الصور ومعالجة الوسائط** | Browser Canvas API | مدمجة في المتصفح | ضغط تقارير المعلمات الطبية قبل رفعها دون الحاجة لخوادم وسيطة. |
| **بيئة الاختبارات البرمجية** | Vitest | `2.x` | سرعة فائقة في تشغيل اختبارات الوحدة المنطقية (Unit Tests) للمعادلات الحسابية والاستيراد. |

---

## 3. تقسيم الطبقات المعمارية (Layered Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                              │
│   Next.js App Router (app/*), UI Components, Modals, Forms & Charts    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Calls Hooks
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Data Fetching & State Layer                         │
│     TanStack Query Hooks, Scoped Contexts (Auth, Toast, UI Filters)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Executes Operations
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Domain & Service Layer                           │
│   DeductionService, DelayNoticeService, InquiryService, ImportService  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Queries Data
┌───────────────────────────────────▼────────────────────────────────────┐
│                     Repository & API Client Layer                      │
│     Typed Supabase Client, Storage Client, Local Cache Fallback        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Communicates via SQL & REST
┌───────────────────────────────────▼────────────────────────────────────┐
│                      Database & Storage Engine                         │
│        PostgreSQL Tables, RLS Policies, Indexes & Buckets              │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 تفصيل وظائف كل طبقة:
1. **طبقة العرض (Presentation Layer):**
   - مسؤولة حصرياً عن رسم واجهة المستخدم والتقاط الأحداث والمدخلات.
   - خالية تماماً من الاستعلامات المباشرة لقاعدة البيانات أو المعادلات الرياضية المعقدة.
2. **طبقة جلب البيانات وإدارة الحالة (Data Fetching & State Layer):**
   - استخدام Custom React Hooks مدعومة بـ TanStack Query للتعامل مع البيانات كاستعلامات (`useQuery`) وتعديلات (`useMutation`).
   - قصر استخدام React Context على الحالات العامة فقط: حالة تسجيل دخول الوكيلة (`AuthContext`)، والإشعارات العائمة (`ToastContext`).
3. **طبقة الخدمات ومجال العمل (Domain & Service Layer):**
   - دوال نقية (Pure Functions) مستقلة عن React وخالية من الـ Hooks.
   - تشمل: محرك احتساب الحسم، محرك الرادار، خوارزميات فحص التكرار، ومولد رسائل واتساب.
4. **طبقة المستودعات والوصول للبيانات (Repository Layer):**
   - تغليف كافة استدعاءات Supabase داخل دوال متخصصة (`teachersRepository.ts`, `inquiriesRepository.ts`).
   - التعامل مع الأخطاء وتوحيد مخرجات الاستعلامات والتحويل من Snake_case إلى CamelCase.
5. **طبقة الأمان وقاعدة البيانات (Database & RLS Layer):**
   - تطبيق القيود على مستوى محرك قاعدة البيانات (Foreign Keys, Unique Indexes, Check Constraints).

---

## 4. هيكل المجلدات والملفات الموصى به (Recommended Directory Structure)

```text
src/
├── app/                                 # مسارات التطبيق (Next.js App Router)
│   ├── (admin)/                         # مسارات الإدارة المحمية بـ AuthGuard
│   │   ├── layout.tsx                   # تخطيط لوحة التحكم (Sidebar + Header)
│   │   ├── page.tsx                     # لوحة المتابعة الرئيسية والرادار
│   │   ├── teachers/                    # إدارة المعلمات واستيراد Excel
│   │   │   └── page.tsx
│   │   ├── procedures/                  # الإجراءات الإدارية
│   │   │   ├── absence/page.tsx         # مساءلات الغياب
│   │   │   ├── delay-notice/page.tsx    # تنبيهات التأخر والانصراف
│   │   │   └── deduction-hours/page.tsx # قرارات الحسم (نموذج 19)
│   │   └── archive/                     # الأرشيف الموحد
│   │       └── page.tsx
│   ├── (public)/                        # البوابات العامة للمعلمات (بدون تسجيل دخول)
│   │   ├── inquiry/
│   │   │   └── [token]/page.tsx         # بوابة إفادة الغياب والمرفقات
│   │   └── teacher-response/
│   │       └── [token]/page.tsx         # بوابة مبررات تنبيه التأخر
│   ├── login/                           # تسجيل دخول وكيلة المدرسة
│   │   └── page.tsx
│   ├── api/                             # نقاط النهاية الخادمة (Route Handlers)
│   │   ├── cron/radar-cleanup/route.ts  # أرشفة ومتابعة المهل المنتهية
│   │   └── upload/route.ts              # نقطة رفع المرفقات المعالجة
│   ├── layout.tsx                       # التخطيط الجذري والخطوط وتحديد RTL
│   └── globals.css                      # تنسيقات Tailwind العالمية والطباعة
│
├── components/                          # مكونات الواجهة
│   ├── ui/                              # عناصر الواجهة الذرية القابلة لإعادة الاستخدام
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── KpiCard.tsx
│   │   ├── BottomSheet.tsx
│   │   └── SkeletonLoader.tsx
│   ├── layout/                          # مكونات الهيكل
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── PageHeader.tsx
│   ├── domain/                          # مكونات متخصصة بمجال العمل
│   │   ├── teachers/                    # جداول وبطاقات المعلمات ونماذج التعديل
│   │   ├── procedures/                  # نماذج الغياب والتأخر وقرار الحسم
│   │   └── analytics/                   # الرادار والرسوم البيانية ومؤشرات الأداء
│   └── common/                          # نوافذ التأكيد والتنبيه
│       └── ConfirmDialog.tsx
│
├── services/                            # طبقة الخدمات ونطاق العمل (Pure Business Logic)
│   ├── deductionService.ts              # حسابات المادة 21 ونموذج 19
│   ├── delayNoticeService.ts            # دورة حياة التنبيهات واحتساب الفروق
│   ├── inquiryService.ts                # إدارة المساءلات والتحقق من المهل
│   ├── teacherImportService.ts          # استيراد إكسل وتخطيط الدمج
│   ├── deduplicationService.ts          # خوارزمية Union-Find وتطهير السجلات
│   ├── whatsappService.ts               # صياغة وتوليد روابط ورسائل واتساب
│   ├── imageCompressionService.ts       # ضغط ومعالجة الصور المرفقة
│   └── pdfPrintService.ts               # توليد ملفات PDF الرسمية للوزارة
│
├── repositories/                        # طبقة استعلامات قاعدة البيانات (Supabase Calls)
│   ├── teachersRepository.ts
│   ├── absenceRecordsRepository.ts
│   ├── inquiriesRepository.ts
│   ├── delayNoticesRepository.ts
│   └── deductionDecisionsRepository.ts
│
├── hooks/                               # خطافات React المخصصة (Data & UI Hooks)
│   ├── queries/                         # استعلامات TanStack Query
│   │   ├── useTeachersQuery.ts
│   │   ├── useAbsencesQuery.ts
│   │   ├── useDelayNoticesQuery.ts
│   │   └── useDeductionsQuery.ts
│   ├── mutations/                       # تعديلات TanStack Query
│   │   ├── useCreateInquiryMutation.ts
│   │   └── useSettleDeductionMutation.ts
│   └── ui/                              # خطافات واجهة المستخدم
│       ├── useIsMobile.ts
│       └── useProactiveRadar.ts
│
├── context/                             # السياقات العامة المحدودة فقط
│   ├── AuthContext.tsx                  # جلسة وصلاحيات الوكيلة
│   └── ToastContext.tsx                 # إشعارات النظام
│
├── lib/                                 # أدوات مساعدة عامة وثوابت
│   ├── supabase/                        # إعداد عميل Supabase للمتصفح والخادم
│   │   ├── client.ts
│   │   └── server.ts
│   ├── timeUtils.ts                     # دوال توقيت مكة المكرمة والتنسيق العربي
│   ├── authCrypto.ts                    # تشفير كلمات المرور والرموز الآمنة
│   ├── attachments.ts                   # قواعد وخانات المرفقات
│   └── constants.ts                     # ثوابت النظام
│
└── types/                               # تعريفات الأنواع (TypeScript Single Source of Truth)
    ├── database.ts                      # الأنواع المستخرجة من جداول Supabase
    ├── domain.ts                        # نماذج الأعمال الخاصة بالتطبيق
    └── api.ts                           # استجابات ومذكرات نقاط النهاية
```

---

## 5. تنظيم الخدمات ومسارات العمل (Services & API Workflow)

### 5.1 نموذج عمل الخدمة (Service Pattern Example)
تُكتب الخدمات البرمجية بصيغة وحدات نقية (Pure Modules) مستقلة، بحيث يسهل إجراء اختبارات Unit Tests عليها دون الحاجة لـ Mocking لواجهة React:

```typescript
// مثال لهيكلية خدمة حساب الحسم المستقلة (src/services/deductionService.ts)
export class DeductionService {
  static readonly MINUTES_PER_WORK_DAY = 420; // 7 ساعات عمل معتمدة
  static readonly WARNING_THRESHOLD_MINUTES = 240; // 4 ساعات إنذار مبكر

  static calculateDeduction(totalMinutes: number): DeductionCalculationResult {
    const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0));
    const totalHours = Math.round((safeMinutes / 60) * 10) / 10;
    const deductionDays = Math.floor(safeMinutes / this.MINUTES_PER_WORK_DAY);
    const remainderMinutes = safeMinutes % this.MINUTES_PER_WORK_DAY;

    return {
      safeMinutes,
      totalHours,
      deductionDays,
      remainderMinutes,
      isDueForDeduction: deductionDays > 0,
      isApproachingThreshold: safeMinutes >= this.WARNING_THRESHOLD_MINUTES && deductionDays === 0
    };
  }
}
```

### 5.2 إدارة المزامنة الآنية (Real-Time Subscriptions)
بدلاً من اشتراك سياق واحد ضخم في كافة الجداول، يتم تفعيل قنوات الاستماع (Postgres Changes) في المكونات المتأثرة فقط عبر خطاف TanStack Query:
- عند وصول رد جديد من معلمة عبر جدول `absence_inquiries` أو `delay_notices`، يتم إبطال التكييش (`queryClient.invalidateQueries({ queryKey: ['inquiries'] })`) مما يجلب التحديث آلياً وبأقل استهلاك للموارد.

---

## 6. استراتيجية الأمان وحماية البيانات (Security Architecture)

1. **حماية مسارات الإدارة (Admin Route Guard):**
   - حظر كافة مسارات الإدارة بواسطة Next.js Middleware يفحص ملفات تعريف الارتباط الآمنة (Secure HttpOnly Session Cookies) وتوقيع الـ JWT.
2. **عزل البوابات العامة (Public Token Security):**
   - وصول المعلمات مقيد بالمسارين `/inquiry/[token]` و `/teacher-response/[token]`.
   - استعلامات الخادم لا تكشف سوى السجل المطابق للرمز (`eq('token', token)`).
   - يتم رفض أي استعلام إذا انتهت صلاحية الـ Token (`expires_at < NOW()`).
3. **تأمين حاوية التخزين السحابي (Supabase Storage):**
   - التحقق من نوع الملف (MIME Type: `image/jpeg`, `image/png`, `application/pdf`).
   - الحد الأقصى لحجم الملف الواحد 10 ميجابايت مع الضغط المسبق للصور.
   - تسمية الملفات بأسماء مشفرة فريدة مبنية على UUID تمنع استنتاج أو تصفح ملفات المعلمات الأخريات.
