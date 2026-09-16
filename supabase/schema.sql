-- ==============================================================================
-- مخطط قاعدة بيانات منصة الغياب الإدارية المدرسية (Supabase PostgreSQL Schema)
-- ==============================================================================

-- 1. جدول بيانات المعلمات (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    job_number TEXT NOT NULL UNIQUE,
    specialty TEXT NOT NULL,
    total_absences INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس للبحث السريع برقم الوظيفة والاسم
CREATE INDEX IF NOT EXISTS idx_teachers_job_number ON public.teachers(job_number);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON public.teachers(name);

-- 2. جدول سجلات الغياب والمساءلات الإدارية (absence_records)
CREATE TABLE IF NOT EXISTS public.absence_records (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    job_number TEXT NOT NULL,
    specialty TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس لسجلات الغياب
CREATE INDEX IF NOT EXISTS idx_absences_teacher_id ON public.absence_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absence_records(date);
CREATE INDEX IF NOT EXISTS idx_absences_type ON public.absence_records(type);

-- 3. سياسات الأمان والحماية (Row Level Security - RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;

-- السماح بالعمليات الكاملة لمفتاح التطبيق (anon) لتمكين المزامنة الفورية
DROP POLICY IF EXISTS "Allow anon all on teachers" ON public.teachers;
CREATE POLICY "Allow anon all on teachers"
    ON public.teachers FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on absence_records" ON public.absence_records;
CREATE POLICY "Allow anon all on absence_records"
    ON public.absence_records FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
