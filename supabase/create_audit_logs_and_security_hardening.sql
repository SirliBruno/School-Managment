-- ==============================================================================
-- SPRINT 2: Data Integrity, Archive & Security Hardening Migration
-- ==============================================================================

-- 1. جدول سجل العمليات والتدقيق الإداري الشامل (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL, -- CREATE, UPDATE, ARCHIVE, RESTORE, APPROVE, REJECT, ISSUE_DEDUCTION, EXPORT_REPORT, BACKUP, RESTORE_BACKUP
    entity_type TEXT NOT NULL, -- teacher, absence, inquiry, delay, permission, deduction, report, backup, system
    entity_id TEXT,
    details TEXT,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all on audit_logs"
    ON public.audit_logs FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. تأكيد وتحديث حقول الأرشفة الإدارية (Soft Delete) لكافة الجداول التشغيلية

-- 2.1 المعلمات (teachers)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_teachers_is_archived ON public.teachers(is_archived);

-- 2.2 سجلات الغياب (absence_records)
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_absences_is_archived ON public.absence_records(is_archived);
CREATE INDEX IF NOT EXISTS idx_absences_teacher_date ON public.absence_records(teacher_id, date) WHERE is_archived = FALSE;

-- 2.3 مساءلات الغياب (absence_inquiries)
ALTER TABLE public.absence_inquiries ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.absence_inquiries ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.absence_inquiries ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.absence_inquiries ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.absence_inquiries ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_inquiries_is_archived ON public.absence_inquiries(is_archived);

-- 2.4 تنبيهات التأخر (delay_notices)
ALTER TABLE public.delay_notices ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.delay_notices ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.delay_notices ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.delay_notices ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.delay_notices ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_delays_is_archived ON public.delay_notices(is_archived);
CREATE INDEX IF NOT EXISTS idx_delays_teacher_date ON public.delay_notices(teacher_id, notice_date) WHERE is_archived = FALSE;

-- 2.5 استئذان الموظفين (employee_permissions)
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_permissions_is_archived ON public.employee_permissions(is_archived);

-- 2.6 قرارات الحسم (deduction_decisions)
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

ALTER TABLE public.deduction_decisions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.deduction_decisions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.deduction_decisions ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.deduction_decisions ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.deduction_decisions ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_deductions_is_archived ON public.deduction_decisions(is_archived);
CREATE INDEX IF NOT EXISTS idx_deductions_teacher_num ON public.deduction_decisions(teacher_id, decision_number) WHERE is_archived = FALSE;

ALTER TABLE public.deduction_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on deduction_decisions" ON public.deduction_decisions;
CREATE POLICY "Allow anon all on deduction_decisions"
    ON public.deduction_decisions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
