-- ==============================================================================
-- مخطط قاعدة بيانات منصة الغياب الإدارية المدرسية (Supabase PostgreSQL Schema)
-- ==============================================================================

-- 1. جدول بيانات المعلمات (teachers)
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    full_name TEXT,
    job_number TEXT NOT NULL UNIQUE,
    username TEXT,
    mobile TEXT,
    employment_status TEXT DEFAULT 'دائم',
    job_title TEXT DEFAULT 'معلم',
    teaching_field TEXT,
    specialty TEXT,
    total_absences INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teachers_job_number ON public.teachers(job_number);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON public.teachers(name);

-- 2. جدول سجلات الغياب والمساءلات الإدارية المباشرة (absence_records)
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
    attachment_url TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_absences_teacher_id ON public.absence_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absence_records(date);
CREATE INDEX IF NOT EXISTS idx_absences_type ON public.absence_records(type);

-- 3. جدول مساءلات الغياب الإلكترونية عبر الواتساب (absence_inquiries)
CREATE TABLE IF NOT EXISTS public.absence_inquiries (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    job_number TEXT NOT NULL,
    specialty TEXT,
    mobile TEXT,
    absence_date DATE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted, approved, rejected, expired
    expires_at TIMESTAMPTZ NOT NULL,
    absence_type TEXT,
    teacher_reason TEXT,
    attachment_url TEXT,
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_token ON public.absence_inquiries(token);
CREATE INDEX IF NOT EXISTS idx_inquiries_teacher_id ON public.absence_inquiries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.absence_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_date ON public.absence_inquiries(absence_date);

-- 4. إعداد حاوية التخزين للمرفقات (Supabase Storage Bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('absence-attachments', 'absence-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- سياسات التخزين السحابي للمرفقات
DROP POLICY IF EXISTS "Allow public uploads to absence-attachments" ON storage.objects;
CREATE POLICY "Allow public uploads to absence-attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'absence-attachments');

DROP POLICY IF EXISTS "Allow public read from absence-attachments" ON storage.objects;
CREATE POLICY "Allow public read from absence-attachments"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'absence-attachments');

-- 5. جدول بيانات اعتماد حساب الوكيلة (admin_credentials)
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id TEXT PRIMARY KEY DEFAULT 'vice_principal',
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT DEFAULT 'وكيلة الشؤون التعليمية',
    role TEXT DEFAULT 'vice_principal',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج الحساب الافتراضي للوكيلة (اسم المستخدم: wakila / كلمة المرور: 123456) إذا لم يكن موجوداً
INSERT INTO public.admin_credentials (id, username, password_hash, full_name, role)
VALUES (
    'vice_principal',
    'wakila',
    'b70712d928b2a236fb29eaed2cd9d9720885bb65609b4063e15df5d4ca28019c',
    'وكيلة الشؤون التعليمية',
    'vice_principal'
)
ON CONFLICT (id) DO NOTHING;

-- 6. سياسات الأمان والحماية (Row Level Security - RLS)
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Allow anon all on absence_inquiries" ON public.absence_inquiries;
CREATE POLICY "Allow anon all on absence_inquiries"
    ON public.absence_inquiries FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on admin_credentials" ON public.admin_credentials;
CREATE POLICY "Allow anon all on admin_credentials"
    ON public.admin_credentials FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


