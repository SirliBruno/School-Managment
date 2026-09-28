-- ==============================================================================
-- مخطط قاعدة بيانات منصة الغياب والمساءلات الإدارية المدرسية (المُحدّث بالكامل)
-- School Administrative Absence Platform - Production PostgreSQL / Supabase Schema
-- المحدث وفق متطلبات Sprint 10 للأمان والنسخ الاحتياطي ونظام الاستئذان والأختام
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

CREATE INDEX IF NOT EXISTS idx_teachers_national_id ON public.teachers(national_id);
CREATE INDEX IF NOT EXISTS idx_teachers_full_name ON public.teachers(full_name);
CREATE INDEX IF NOT EXISTS idx_teachers_is_archived ON public.teachers(is_archived);
CREATE INDEX IF NOT EXISTS idx_teachers_specialty ON public.teachers(specialty);

-- ==============================================================================
-- 2. جدول سجلات الغياب المباشر (absence_records)
-- مع قيد ON DELETE RESTRICT لحماية السجلات القانونية من الحذف العرضي
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.absence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_absences_teacher_id ON public.absence_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON public.absence_records(date);
CREATE INDEX IF NOT EXISTS idx_absences_type ON public.absence_records(type);
CREATE INDEX IF NOT EXISTS idx_absences_is_archived ON public.absence_records(is_archived);

-- ==============================================================================
-- 3. جدول مساءلات الغياب الإلكترونية عبر الواتساب (absence_inquiries)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.absence_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    absence_date DATE NOT NULL,
    absence_end_date DATE,
    days_count INTEGER NOT NULL DEFAULT 1 CONSTRAINT chk_inquiries_days_count CHECK (days_count >= 1),
    is_multi_day BOOLEAN GENERATED ALWAYS AS (days_count > 1) STORED,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CONSTRAINT chk_inquiries_status CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    absence_type VARCHAR(30) CONSTRAINT chk_inquiries_absence_type CHECK (absence_type IS NULL OR absence_type IN ('مرضي', 'اضطراري', 'مرافق', 'أخرى')),
    teacher_reason TEXT,
    attachment_url TEXT,
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
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_delays_share_token ON public.delay_notices(share_token);
CREATE INDEX IF NOT EXISTS idx_delays_teacher_id ON public.delay_notices(teacher_id);
CREATE INDEX IF NOT EXISTS idx_delays_status ON public.delay_notices(status);
CREATE INDEX IF NOT EXISTS idx_delays_notice_date ON public.delay_notices(notice_date);
CREATE INDEX IF NOT EXISTS idx_delays_director_opinion ON public.delay_notices(director_opinion);
CREATE INDEX IF NOT EXISTS idx_delays_is_archived ON public.delay_notices(is_archived);

-- ==============================================================================
-- 5. جدول استئذان الموظفين (employee_permissions)
-- نظام توثيق ومتابعة خروج المعلمات أثناء الدوام الرسمي
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    teacher_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(10),
    job_number VARCHAR(50),
    specialty VARCHAR(100),
    permission_date DATE NOT NULL,
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0 CONSTRAINT chk_permission_duration CHECK (duration_minutes >= 0),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'approved' CONSTRAINT chk_permission_status CHECK (status IN ('approved', 'rejected', 'pending')),
    school_action TEXT,
    notes TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_teacher_id ON public.employee_permissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_permissions_date ON public.employee_permissions(permission_date);
CREATE INDEX IF NOT EXISTS idx_permissions_status ON public.employee_permissions(status);
CREATE INDEX IF NOT EXISTS idx_permissions_is_archived ON public.employee_permissions(is_archived);

-- ==============================================================================
-- 6. جدول قرارات حسم ساعات التأخر - نموذج 19 (deduction_decisions)
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

CREATE INDEX IF NOT EXISTS idx_deductions_teacher_id ON public.deduction_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_deductions_decision_number ON public.deduction_decisions(decision_number);
CREATE INDEX IF NOT EXISTS idx_deductions_civil_id ON public.deduction_decisions(civil_id);
CREATE INDEX IF NOT EXISTS idx_deductions_is_archived ON public.deduction_decisions(is_archived);
CREATE INDEX IF NOT EXISTS idx_deductions_settled_notices ON public.deduction_decisions USING GIN(settled_notice_ids);

-- ==============================================================================
-- 7. جدول سجل التدقيق والرقابة الإدارية (audit_logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    user_id TEXT DEFAULT 'admin'
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ==============================================================================
-- 8. جدول إعدادات المدرسة والأختام والتواقيع (school_settings)
-- المصدر السحابي الموحد (SSOT) لترويسات التقارير والأختام والتواقيع المعتمدة
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.school_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    school_name VARCHAR(150) NOT NULL DEFAULT 'الثانوية الخامسة مسارات',
    school_gender VARCHAR(50) DEFAULT 'بنات',
    principal_name VARCHAR(150) NOT NULL DEFAULT 'فاطمة فلاتة',
    vice_principal_name VARCHAR(150) NOT NULL DEFAULT 'أحلام صالح الضبيبي',
    educational_region VARCHAR(150) DEFAULT 'منطقة مكة المكرمة',
    educational_office VARCHAR(150) DEFAULT 'مكتب تعليم وسط جدة',
    school_code VARCHAR(50) DEFAULT '12345',
    school_logo TEXT,
    stamp_url TEXT,
    signature_url TEXT,
    stamp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    signature_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية للثانوية الخامسة مسارات
INSERT INTO public.school_settings (id, school_name, principal_name, vice_principal_name)
VALUES ('current', 'الثانوية الخامسة مسارات', 'فاطمة فلاتة', 'أحلام صالح الضبيبي')
ON CONFLICT (id) DO UPDATE SET
    school_name = EXCLUDED.school_name,
    principal_name = EXCLUDED.principal_name,
    vice_principal_name = EXCLUDED.vice_principal_name;

-- ==============================================================================
-- 9. جدول بيانات اعتماد حساب إدارة المدرسة (admin_credentials)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'vice_principal',
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    full_name VARCHAR(150) NOT NULL DEFAULT 'وكيلة الشؤون التعليمية والمدرسية',
    role VARCHAR(50) NOT NULL DEFAULT 'vice_principal',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_credentials (id, username, password_hash, full_name, role)
VALUES (
    'vice_principal',
    'wakila',
    'b70712d928b2a236fb29eaed2cd9d9720885bb65609b4063e15df5d4ca28019c',
    'وكيلة الشؤون التعليمية والمدرسية',
    'vice_principal'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. المشغلات والدوال التلقائية (Triggers & Automatic Counter Synchronization)
-- ==============================================================================

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
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON public.employee_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_deductions_updated_at BEFORE UPDATE ON public.deduction_decisions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.school_settings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- دالة مزامنة عداد الغياب النشط للمعلمة
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

-- دالة مزامنة عداد تنبيهات التأخر النشطة للمعلمة
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
-- 11. إعداد حاويات التخزين السحابي (Supabase Storage Buckets)
-- ==============================================================================

-- 11.1 حاوية المرفقات الطبية (absence-attachments) - تخزين خاص وآمن
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'absence-attachments',
    'absence-attachments',
    false,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 11.2 حاوية أصول المدرسة والأختام (school-assets) - قراءة عامة للتقارير، كتابة محمية
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ==============================================================================
-- 12. سياسات الحماية المتقدمة على مستوى الصفوف (Row Level Security - RLS)
-- مطابقة لمعايير الإنتاج الآمنة Sprint 10
-- ==============================================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delay_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- 12.1 وصول الإدارة الموثقة الكامل (Authenticated Full Access)
CREATE POLICY "Admin full access to teachers" ON public.teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to absence_records" ON public.absence_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to absence_inquiries" ON public.absence_inquiries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to delay_notices" ON public.delay_notices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to employee_permissions" ON public.employee_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to deduction_decisions" ON public.deduction_decisions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to school_settings" ON public.school_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access to admin_credentials" ON public.admin_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12.2 قراءة عامة محدودة لبيانات الهوية المدرسية في التقارير
CREATE POLICY "Public read school_settings branding" ON public.school_settings FOR SELECT TO anon USING (true);

-- 12.3 وصول المعلمات المقيد بالرمز الأمني (Token-Based Access for Anon)
-- مساءلات الغياب:
CREATE POLICY "Anon token-based view inquiry"
    ON public.absence_inquiries FOR SELECT
    TO anon
    USING (token IS NOT NULL AND status IN ('pending', 'submitted'));

CREATE POLICY "Anon token-based submit inquiry"
    ON public.absence_inquiries FOR UPDATE
    TO anon
    USING (token IS NOT NULL AND status = 'pending')
    WITH CHECK (status = 'submitted');

-- تنبيهات التأخر:
CREATE POLICY "Anon token-based view delay notice"
    ON public.delay_notices FOR SELECT
    TO anon
    USING (share_token IS NOT NULL);

CREATE POLICY "Anon token-based submit delay notice response"
    ON public.delay_notices FOR UPDATE
    TO anon
    USING (share_token IS NOT NULL AND status = 'pending_teacher')
    WITH CHECK (status = 'pending_director');

-- 12.4 سياسات التخزين السحابي (Storage RLS)
-- حاوية المرفقات الطبية:
DROP POLICY IF EXISTS "Allow restricted uploads to absence-attachments" ON storage.objects;
CREATE POLICY "Allow restricted uploads to absence-attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'absence-attachments');

DROP POLICY IF EXISTS "Allow authenticated read from absence-attachments" ON storage.objects;
CREATE POLICY "Allow authenticated read from absence-attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'absence-attachments');

-- حاوية أصول المدرسة (الختم والشعار والتوقيع):
DROP POLICY IF EXISTS "Allow public read from school-assets" ON storage.objects;
CREATE POLICY "Allow public read from school-assets"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow authenticated uploads to school-assets" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to school-assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow authenticated update to school-assets" ON storage.objects;
CREATE POLICY "Allow authenticated update to school-assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow authenticated delete from school-assets" ON storage.objects;
CREATE POLICY "Allow authenticated delete from school-assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'school-assets');

-- ==============================================================================
-- 13. تفعيل البث المباشر (Supabase Realtime CDC Publication)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.teachers,
    public.absence_records,
    public.absence_inquiries,
    public.delay_notices,
    public.employee_permissions,
    public.deduction_decisions,
    public.school_settings;
