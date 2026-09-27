-- ==============================================================================
-- مخطط قاعدة بيانات منصة الغياب والمساءلات الإدارية المدرسية (الإصدار المعاد بناؤه)
-- School Administrative Absence Platform - Production PostgreSQL / Supabase Schema
-- ==============================================================================

-- تفعيل الامتدادات الضرورية لتوليد المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. جدول الكادر التعليمي (teachers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    national_id VARCHAR(10) NOT NULL UNIQUE CONSTRAINT chk_teachers_national_id CHECK (national_id ~ '^[0-9]{10}$'),
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) CONSTRAINT chk_teachers_mobile CHECK (mobile IS NULL OR mobile ~ '^9665[0-9]{8}$'),
    email VARCHAR(255) CONSTRAINT chk_teachers_email CHECK (email IS NULL OR email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    employment_status VARCHAR(20) NOT NULL DEFAULT 'دائم' CONSTRAINT chk_teachers_employment_status CHECK (employment_status IN ('دائم', 'عقد')),
    job_title VARCHAR(100) NOT NULL DEFAULT 'معلم',
    teaching_field VARCHAR(100),
    specialty VARCHAR(100) NOT NULL,
    total_absences INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_teachers_total_absences CHECK (total_absences >= 0),
    total_delay_notices INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_teachers_total_delays CHECK (total_delay_notices >= 0),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس جدول المعلمات
CREATE INDEX IF NOT EXISTS idx_teachers_national_id ON public.teachers(national_id);
CREATE INDEX IF NOT EXISTS idx_teachers_full_name ON public.teachers(full_name);
CREATE INDEX IF NOT EXISTS idx_teachers_is_archived ON public.teachers(is_archived);
CREATE INDEX IF NOT EXISTS idx_teachers_specialty ON public.teachers(specialty);

-- ==============================================================================
-- 2. جدول سجلات الغياب المباشر (absence_records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.absence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(30) NOT NULL CONSTRAINT chk_absences_type CHECK (type IN ('اضطراري', 'مرضي', 'مرافق', 'أخرى')),
    reason TEXT NOT NULL,
    notes TEXT,
    attachment_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس سجلات الغياب
CREATE INDEX IF NOT EXISTS idx_absences_teacher_id ON public.absence_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absence_records(date);
CREATE INDEX IF NOT EXISTS idx_absences_type ON public.absence_records(type);
CREATE INDEX IF NOT EXISTS idx_absences_is_archived ON public.absence_records(is_archived);

-- ==============================================================================
-- 3. جدول مساءلات الغياب الإلكترونية عبر الواتساب (absence_inquiries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.absence_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    absence_end_date DATE,
    days_count INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_inquiries_days_count CHECK (days_count >= 1),
    is_multi_day BOOLEAN GENERATED ALWAYS AS (days_count > 1) STORED,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CONSTRAINT chk_inquiries_status CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    absence_type VARCHAR(30) CONSTRAINT chk_inquiries_absence_type CHECK (absence_type IS NULL OR absence_type IN ('مرضي', 'اضطراري', 'مرافق', 'أخرى')),
    teacher_reason TEXT,
    attachment_url TEXT, -- يخزن مصفوفة المرفقات بصيغة JSON أو رابط مباشر
    admin_notes TEXT,
    submitted_at TIMESTAMPTZ,
    teacher_ip_address VARCHAR(45),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس مساءلات الغياب
CREATE INDEX IF NOT EXISTS idx_inquiries_token ON public.absence_inquiries(token);
CREATE INDEX IF NOT EXISTS idx_inquiries_teacher_id ON public.absence_inquiries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.absence_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_absence_date ON public.absence_inquiries(absence_date);
CREATE INDEX IF NOT EXISTS idx_inquiries_expires_at ON public.absence_inquiries(expires_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_is_archived ON public.absence_inquiries(is_archived);

-- ==============================================================================
-- 4. جدول تنبيهات التأخر والانصراف (delay_notices)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.delay_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notice_number VARCHAR(50),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    notice_date DATE NOT NULL,
    -- المخالفة 1: تأخر بداية الدوام
    violation_delay_start BOOLEAN NOT NULL DEFAULT FALSE,
    delay_start_from_time TIME,
    delay_start_time TIME,
    -- المخالفة 2: عدم تواجد أثناء الدوام
    violation_absent_during BOOLEAN NOT NULL DEFAULT FALSE,
    absent_from_time TIME,
    absent_to_time TIME,
    -- المخالفة 3: انصراف مبكر
    violation_early_departure BOOLEAN NOT NULL DEFAULT FALSE,
    early_departure_from_time TIME,
    early_departure_time TIME,
    -- المخالفة 4: انصراف من غير المدرسة
    violation_left_school BOOLEAN NOT NULL DEFAULT FALSE,
    left_school_from_time TIME,
    left_school_to_time TIME,
    left_school_details TEXT,
    -- الاحتساب الزمني
    calculated_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_delay_minutes CHECK (calculated_minutes >= 0),
    calculated_duration VARCHAR(100),
    additional_notes TEXT,
    -- حالة الإجراء
    status VARCHAR(30) NOT NULL DEFAULT 'pending_teacher' CONSTRAINT chk_delay_status CHECK (status IN ('pending_teacher', 'pending_director', 'completed')),
    -- إفادة المعلمة (المرحلة 2)
    teacher_reason TEXT,
    teacher_signature_date DATE,
    teacher_response_submitted_at TIMESTAMPTZ,
    teacher_ip_address VARCHAR(45),
    -- قرار المديرة (المرحلة 3)
    director_opinion VARCHAR(30) CONSTRAINT chk_director_opinion CHECK (director_opinion IS NULL OR director_opinion IN ('accepted', 'rejected_with_deduction')),
    director_notes TEXT,
    director_signature_date DATE,
    hijri_year VARCHAR(10) NOT NULL DEFAULT '١٤٤٨',
    -- الرمز المشفر للمشاركة العامة
    share_token VARCHAR(64) NOT NULL UNIQUE,
    token_expires_at TIMESTAMPTZ NOT NULL,
    link_shared_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس تنبيهات التأخر
CREATE INDEX IF NOT EXISTS idx_delays_share_token ON public.delay_notices(share_token);
CREATE INDEX IF NOT EXISTS idx_delays_teacher_id ON public.delay_notices(teacher_id);
CREATE INDEX IF NOT EXISTS idx_delays_status ON public.delay_notices(status);
CREATE INDEX IF NOT EXISTS idx_delays_notice_date ON public.delay_notices(notice_date);
CREATE INDEX IF NOT EXISTS idx_delays_director_opinion ON public.delay_notices(director_opinion);
CREATE INDEX IF NOT EXISTS idx_delays_is_archived ON public.delay_notices(is_archived);

-- ==============================================================================
-- 5. جدول قرارات حسم ساعات التأخر - نموذج 19 (deduction_decisions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.deduction_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_number VARCHAR(50) NOT NULL UNIQUE,
    decision_date VARCHAR(50) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    civil_id VARCHAR(10) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    rank VARCHAR(100) DEFAULT 'معلم ممارس',
    current_action VARCHAR(100) DEFAULT 'معلمة',
    school_name VARCHAR(150) NOT NULL DEFAULT 'مدرسة الثانوية الخامسة مسارات',
    principal_name VARCHAR(150) NOT NULL,
    delay_hours NUMERIC(5, 1) NOT NULL CONSTRAINT chk_deductions_hours CHECK (delay_hours > 0),
    delay_minutes INTEGER NOT NULL CONSTRAINT chk_deductions_minutes CHECK (delay_minutes > 0),
    deduction_days INTEGER NOT NULL CONSTRAINT chk_deductions_days CHECK (deduction_days >= 1),
    settled_notice_ids UUID[] NOT NULL DEFAULT '{}',
    remainder_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_deductions_remainder CHECK (remainder_minutes >= 0 AND remainder_minutes < 420),
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس قرارات الحسم
CREATE INDEX IF NOT EXISTS idx_deductions_teacher_id ON public.deduction_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_deductions_decision_number ON public.deduction_decisions(decision_number);
CREATE INDEX IF NOT EXISTS idx_deductions_civil_id ON public.deduction_decisions(civil_id);
CREATE INDEX IF NOT EXISTS idx_deductions_is_archived ON public.deduction_decisions(is_archived);
CREATE INDEX IF NOT EXISTS idx_deductions_settled_notices ON public.deduction_decisions USING GIN(settled_notice_ids);

-- ==============================================================================
-- 6. جدول بيانات اعتماد حساب إدارة المدرسة (admin_credentials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'vice_principal',
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    full_name VARCHAR(150) NOT NULL DEFAULT 'وكيلة الشؤون التعليمية والمدرسية',
    role VARCHAR(50) NOT NULL DEFAULT 'vice_principal',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إدراج الحساب الافتراضي لوكيلة المدرسة إذا لم يكن موجوداً
INSERT INTO public.admin_credentials (id, username, password_hash, full_name, role)
VALUES (
    'vice_principal',
    'wakila',
    'b70712d928b2a236fb29eaed2cd9d9720885bb65609b4063e15df5d4ca28019c', -- تجزئة كلمة المرور: 123456
    'وكيلة الشؤون التعليمية والمدرسية',
    'vice_principal'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 7. الدوال التلقائية والمشغلات (Triggers & Automatic Counter Synchronization)
-- ==============================================================================

-- 7.1 دالة تحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_absences_updated_at BEFORE UPDATE ON public.absence_records FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_inquiries_updated_at BEFORE UPDATE ON public.absence_inquiries FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_delays_updated_at BEFORE UPDATE ON public.delay_notices FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_deductions_updated_at BEFORE UPDATE ON public.deduction_decisions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 7.2 دالة مزامنة عداد الغياب النشط للمعلمة (Active Total Absences)
CREATE OR REPLACE FUNCTION public.fn_sync_teacher_absences_counter()
RETURNS TRIGGER AS $$
DECLARE
    target_teacher_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_teacher_id := OLD.teacher_id;
    ELSE
        target_teacher_id := NEW.teacher_id;
    END IF;

    UPDATE public.teachers
    SET total_absences = (
        SELECT COUNT(*)
        FROM public.absence_records
        WHERE teacher_id = target_teacher_id
          AND is_archived = FALSE
    )
    WHERE id = target_teacher_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_absences_count
AFTER INSERT OR UPDATE OR DELETE ON public.absence_records
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_teacher_absences_counter();

-- 7.3 دالة مزامنة عداد تنبيهات التأخر النشطة للمعلمة
CREATE OR REPLACE FUNCTION public.fn_sync_teacher_delays_counter()
RETURNS TRIGGER AS $$
DECLARE
    target_teacher_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_teacher_id := OLD.teacher_id;
    ELSE
        target_teacher_id := NEW.teacher_id;
    END IF;

    UPDATE public.teachers
    SET total_delay_notices = (
        SELECT COUNT(*)
        FROM public.delay_notices
        WHERE teacher_id = target_teacher_id
          AND is_archived = FALSE
    )
    WHERE id = target_teacher_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_delays_count
AFTER INSERT OR UPDATE OR DELETE ON public.delay_notices
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_teacher_delays_counter();

-- ==============================================================================
-- 8. إعداد حاوية التخزين السحابي للمرفقات (Supabase Storage Bucket)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'absence-attachments',
    'absence-attachments',
    true,
    10485760, -- الحد الأقصى: 10 ميجابايت
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- سياسات تخزين المرفقات
DROP POLICY IF EXISTS "Public Upload to absence-attachments" ON storage.objects;
CREATE POLICY "Public Upload to absence-attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'absence-attachments');

DROP POLICY IF EXISTS "Public Read from absence-attachments" ON storage.objects;
CREATE POLICY "Public Read from absence-attachments"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'absence-attachments');

-- ==============================================================================
-- 9. سياسات الحماية المتقدمة على مستوى الصفوف (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- 9.1 الوصول الكامل لحساب الإدارة الموثق (Authenticated Admin / Staff)
CREATE POLICY "Admin full access on teachers" ON public.teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on absences" ON public.absence_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on inquiries" ON public.absence_inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on delay notices" ON public.delay_notices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on deduction decisions" ON public.deduction_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on admin credentials" ON public.admin_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9.2 الوصول العام المقيد لروابط المعلمات (Public Token-Based Access)
-- للمعلمة قراءة وتحديث مساءلتها فقط عبر الرمز الصالح وغير المنتهي:
CREATE POLICY "Public teacher view inquiry by token"
    ON public.absence_inquiries FOR SELECT
    TO anon
    USING (token IS NOT NULL AND expires_at > NOW());

CREATE POLICY "Public teacher submit inquiry by token"
    ON public.absence_inquiries FOR UPDATE
    TO anon
    USING (token IS NOT NULL AND expires_at > NOW() AND status = 'pending')
    WITH CHECK (token IS NOT NULL AND status IN ('submitted', 'pending'));

-- للمعلمة قراءة وتحديث تنبيه التأخر فقط عبر الرمز الصالح:
CREATE POLICY "Public teacher view delay notice by token"
    ON public.delay_notices FOR SELECT
    TO anon
    USING (share_token IS NOT NULL AND token_expires_at > NOW());

CREATE POLICY "Public teacher submit delay notice by token"
    ON public.delay_notices FOR UPDATE
    TO anon
    USING (share_token IS NOT NULL AND token_expires_at > NOW() AND status = 'pending_teacher')
    WITH CHECK (share_token IS NOT NULL AND status IN ('pending_director', 'pending_teacher'));

-- سماح مؤقت للقراءة الإدارية في حالة الاتصال المباشر بمفتاح anon
CREATE POLICY "Allow anon read teachers for management" ON public.teachers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon write teachers for management" ON public.teachers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access absence_records" ON public.absence_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access delay_notices" ON public.delay_notices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access deduction_decisions" ON public.deduction_decisions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon check admin credentials" ON public.admin_credentials FOR SELECT TO anon USING (true);
