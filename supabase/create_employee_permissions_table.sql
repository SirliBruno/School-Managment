-- ==============================================================================
-- إنشاء جدول استئذان الموظفين (employee_permissions) مع دعم الأرشفة الإدارية (Soft Delete)
-- ==============================================================================

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
    -- حقول الأرشفة الإدارية (Soft Delete)
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by TEXT,
    archive_reason TEXT,
    archived_by_cascade BOOLEAN NOT NULL DEFAULT FALSE
);

-- إضافة الأعمدة بأمان إذا كان الجدول منشأ مسبقاً
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS archived_by_cascade BOOLEAN DEFAULT FALSE;
ALTER TABLE public.employee_permissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- الفهارس لتحسين الأداء وسرعة الاستعلام والتصفية
CREATE INDEX IF NOT EXISTS idx_permissions_teacher_id ON public.employee_permissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_permissions_date ON public.employee_permissions(permission_date);
CREATE INDEX IF NOT EXISTS idx_permissions_is_archived ON public.employee_permissions(is_archived);

-- تفعيل سياسات الأمان على مستوى الصف (RLS)
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon all on employee_permissions" ON public.employee_permissions;
CREATE POLICY "Allow anon all on employee_permissions"
    ON public.employee_permissions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
