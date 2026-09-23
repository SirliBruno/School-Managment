-- ==============================================================================
-- إنشاء جدول إشعارات وتنبيهات التأخر (delay_notices) في Supabase
-- تعليمات: افتح محرر جديد في Supabase (New Query)، الصق الكود كاملاً،
-- وتأكد من عدم تظليل/تحديد أي نص بالماوس قبل الضغط على زر RUN الأخضر.
-- ==============================================================================

-- 1. جدول تنبيهات التأخر والانصراف
CREATE TABLE IF NOT EXISTS public.delay_notices (
    id TEXT PRIMARY KEY,
    notice_number TEXT,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    job_number TEXT,
    specialty TEXT,
    notice_date DATE NOT NULL,
    violation_delay_start BOOLEAN DEFAULT FALSE,
    delay_start_time TEXT,
    violation_absent_during BOOLEAN DEFAULT FALSE,
    absent_from_time TEXT,
    absent_to_time TEXT,
    violation_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_time TEXT,
    violation_left_school BOOLEAN DEFAULT FALSE,
    left_school_details TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending_teacher',
    teacher_reason TEXT,
    teacher_signature_date DATE,
    director_opinion TEXT,
    director_notes TEXT,
    director_signature_date DATE,
    hijri_year TEXT DEFAULT '١٤٤٨',
    share_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    teacher_response_submitted_at TIMESTAMPTZ,
    teacher_ip_address TEXT,
    link_shared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. الفهارس لتسريع البحث والاستعلام
CREATE INDEX IF NOT EXISTS idx_delay_notices_token ON public.delay_notices(share_token);
CREATE INDEX IF NOT EXISTS idx_delay_notices_teacher_id ON public.delay_notices(teacher_id);
CREATE INDEX IF NOT EXISTS idx_delay_notices_status ON public.delay_notices(status);
CREATE INDEX IF NOT EXISTS idx_delay_notices_date ON public.delay_notices(notice_date);

-- 3. تفعيل الأمان وسياسات الوصول
ALTER TABLE public.delay_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on delay_notices" ON public.delay_notices;

CREATE POLICY "Allow anon all on delay_notices"
    ON public.delay_notices FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
