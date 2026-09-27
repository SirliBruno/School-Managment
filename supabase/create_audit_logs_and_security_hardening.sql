-- ==============================================================================
-- SPRINT 2: Audit Logs, Soft Delete Columns & Database Constraints Migration
-- Self-contained: Creates tables if missing, adds soft-delete columns safely,
-- and establishes unique partial indices.
-- ==============================================================================

-- 1. جدول استئذان الموظفين (employee_permissions) - إن لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.employee_permissions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT,
    national_id TEXT,
    job_number TEXT,
    specialty TEXT,
    permission_date DATE NOT NULL,
    exit_time TEXT NOT NULL,
    return_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by TEXT,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_permissions_teacher_id ON public.employee_permissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_permissions_date ON public.employee_permissions(permission_date);
CREATE INDEX IF NOT EXISTS idx_permissions_is_archived ON public.employee_permissions(is_archived);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on employee_permissions" ON public.employee_permissions;
CREATE POLICY "Allow anon all on employee_permissions"
    ON public.employee_permissions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. جدول قرارات حسم ساعات التأخر (deduction_decisions) - إن لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.deduction_decisions (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    civil_id TEXT NOT NULL,
    specialization TEXT,
    rank TEXT,
    job_number TEXT,
    current_action TEXT,
    delay_minutes INTEGER NOT NULL DEFAULT 0,
    total_hours NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    deduction_days INTEGER NOT NULL DEFAULT 1,
    decision_number TEXT NOT NULL,
    decision_date DATE NOT NULL,
    principal_name TEXT,
    settled_notice_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    remainder_minutes INTEGER NOT NULL DEFAULT 0,
    hijri_year TEXT DEFAULT '١٤٤٨',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by TEXT,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deductions_teacher_id ON public.deduction_decisions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_deductions_is_archived ON public.deduction_decisions(is_archived);

ALTER TABLE public.deduction_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on deduction_decisions" ON public.deduction_decisions;
CREATE POLICY "Allow anon all on deduction_decisions"
    ON public.deduction_decisions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. جدول سجل العمليات والتدقيق الإداري (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all on audit_logs"
    ON public.audit_logs FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. فحص وإضافة أعمدة الأرشفة الناعمة للجداول القائمة بأمان
DO $$
BEGIN
    -- teachers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teachers') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'is_archived') THEN
            ALTER TABLE public.teachers ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE public.teachers ADD COLUMN archived_at TIMESTAMPTZ;
            ALTER TABLE public.teachers ADD COLUMN archive_reason TEXT;
        END IF;
    END IF;

    -- absence_records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'absence_records') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'absence_records' AND column_name = 'is_archived') THEN
            ALTER TABLE public.absence_records ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE public.absence_records ADD COLUMN archived_at TIMESTAMPTZ;
            ALTER TABLE public.absence_records ADD COLUMN archive_reason TEXT;
            ALTER TABLE public.absence_records ADD COLUMN archived_by_cascade BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- delay_notices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delay_notices') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delay_notices' AND column_name = 'is_archived') THEN
            ALTER TABLE public.delay_notices ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE public.delay_notices ADD COLUMN archived_at TIMESTAMPTZ;
            ALTER TABLE public.delay_notices ADD COLUMN archive_reason TEXT;
            ALTER TABLE public.delay_notices ADD COLUMN archived_by_cascade BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- deduction_decisions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deduction_decisions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'deduction_decisions' AND column_name = 'is_archived') THEN
            ALTER TABLE public.deduction_decisions ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE public.deduction_decisions ADD COLUMN archived_at TIMESTAMPTZ;
            ALTER TABLE public.deduction_decisions ADD COLUMN archive_reason TEXT;
            ALTER TABLE public.deduction_decisions ADD COLUMN archived_by_cascade BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;

    -- employee_permissions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_permissions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employee_permissions' AND column_name = 'is_archived') THEN
            ALTER TABLE public.employee_permissions ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE public.employee_permissions ADD COLUMN archived_at TIMESTAMPTZ;
            ALTER TABLE public.employee_permissions ADD COLUMN archived_by TEXT;
            ALTER TABLE public.employee_permissions ADD COLUMN archive_reason TEXT;
            ALTER TABLE public.employee_permissions ADD COLUMN archived_by_cascade BOOLEAN DEFAULT FALSE;
        END IF;
    END IF;
END $$;

-- 5. فهارس منع الازدواجية للسجلات النشطة (Unique Partial Indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_national_id_active 
ON public.teachers (national_id) 
WHERE is_archived = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_absence_teacher_date_active 
ON public.absence_records (teacher_id, date) 
WHERE is_archived = FALSE;
