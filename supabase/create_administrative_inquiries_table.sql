-- ==============================================================================
-- إنشاء جدول المسائلات الإدارية (administrative_inquiries) في Supabase
-- دورة إدارية متكاملة مستقلة: إنشاء المساءلة -> إرسال الرابط -> رد المعلمة -> اعتماد الإدارة
-- ==============================================================================

-- 1. جدول المسائلات الإدارية
CREATE TABLE IF NOT EXISTS public.administrative_inquiries (
    id TEXT PRIMARY KEY,
    inquiry_number TEXT,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE RESTRICT,
    teacher_name TEXT NOT NULL,
    national_id TEXT,
    job_number TEXT,
    specialty TEXT,
    job_title TEXT DEFAULT 'معلم',
    inquiry_type TEXT NOT NULL,
    custom_type TEXT,
    incident_date DATE NOT NULL,
    description TEXT,
    vice_principal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending_teacher',
    token TEXT UNIQUE NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    teacher_response TEXT,
    response_date TIMESTAMPTZ,
    response_ip TEXT,
    attachment_url TEXT,
    director_decision TEXT,
    director_notes TEXT,
    decision_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by TEXT,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN DEFAULT FALSE
);

-- 2. الفهارس لتسريع البحث والاستعلام
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_token ON public.administrative_inquiries(token);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_teacher_id ON public.administrative_inquiries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_status ON public.administrative_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_created_at ON public.administrative_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_date ON public.administrative_inquiries(incident_date);

-- 3. تفعيل أمان الصفوف (RLS)
ALTER TABLE public.administrative_inquiries ENABLE ROW LEVEL SECURITY;

-- 4. سياسات الوصول (Admins + Anon Token-based)
DROP POLICY IF EXISTS "Admin full access to administrative_inquiries" ON public.administrative_inquiries;
CREATE POLICY "Admin full access to administrative_inquiries"
    ON public.administrative_inquiries FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- سياسة القراءة للمعلمة عبر التوكن الآمن
DROP POLICY IF EXISTS "Anon token-based view administrative_inquiry" ON public.administrative_inquiries;
CREATE POLICY "Anon token-based view administrative_inquiry"
    ON public.administrative_inquiries FOR SELECT
    TO anon
    USING (token IS NOT NULL AND status IN ('pending_teacher', 'teacher_responded', 'pending_director', 'completed'));

-- سياسة إرسال الإفادة للمعلمة عبر التوكن الآمن
DROP POLICY IF EXISTS "Anon token-based submit administrative_inquiry" ON public.administrative_inquiries;
CREATE POLICY "Anon token-based submit administrative_inquiry"
    ON public.administrative_inquiries FOR UPDATE
    TO anon
    USING (token IS NOT NULL AND status = 'pending_teacher')
    WITH CHECK (status IN ('teacher_responded', 'pending_director'));
