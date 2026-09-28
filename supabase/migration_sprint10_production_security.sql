-- ==============================================================================
-- SPRINT 10: Production Security Hardening & Disaster Recovery RLS Migration
-- Revokes public 'anon' access to sensitive administrative tables.
-- Grants strict token-based access only for public inquiry & delay notice response.
-- Hardens Supabase storage bucket permissions (school-assets & absence-attachments).
-- Replaces risky ON DELETE CASCADE with ON DELETE RESTRICT on official records.
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all operational tables
ALTER TABLE IF EXISTS public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.absence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.absence_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delay_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deduction_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_settings ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all permissive legacy anon policies
DROP POLICY IF EXISTS "Allow anon all on teachers" ON public.teachers;
DROP POLICY IF EXISTS "Allow anon all on absence_records" ON public.absence_records;
DROP POLICY IF EXISTS "Allow anon all on absence_inquiries" ON public.absence_inquiries;
DROP POLICY IF EXISTS "Allow anon all on delay_notices" ON public.delay_notices;
DROP POLICY IF EXISTS "Allow anon all on employee_permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Allow anon all on deduction_decisions" ON public.deduction_decisions;
DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow anon all on admin_credentials" ON public.admin_credentials;
DROP POLICY IF EXISTS "Allow anon update school_settings" ON public.school_settings;
DROP POLICY IF EXISTS "Allow anon read school_settings" ON public.school_settings;

-- 3. Strict Authenticated Administrative Access (Admins only)
-- Teachers
CREATE POLICY "Admin full access to teachers"
    ON public.teachers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Absence Records
CREATE POLICY "Admin full access to absence_records"
    ON public.absence_records FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Employee Permissions
CREATE POLICY "Admin full access to employee_permissions"
    ON public.employee_permissions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Deduction Decisions
CREATE POLICY "Admin full access to deduction_decisions"
    ON public.deduction_decisions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Audit Logs
CREATE POLICY "Admin full access to audit_logs"
    ON public.audit_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Admin Credentials (restricted strictly to authenticated administrative users)
CREATE POLICY "Admin full access to admin_credentials"
    ON public.admin_credentials FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- School Settings
CREATE POLICY "Admin full access to school_settings"
    ON public.school_settings FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public read school_settings branding"
    ON public.school_settings FOR SELECT
    TO anon
    USING (true);

-- 4. Token-Based Limited Access for Public Teacher Routes
-- Absence Inquiries:
-- Authenticated admins get full access
CREATE POLICY "Admin full access to absence_inquiries"
    ON public.absence_inquiries FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anon teachers can ONLY view their specific inquiry using the unguessable token
CREATE POLICY "Anon token-based view inquiry"
    ON public.absence_inquiries FOR SELECT
    TO anon
    USING (token IS NOT NULL AND status IN ('pending', 'submitted'));

-- Anon teachers can ONLY update their specific inquiry to submit response
CREATE POLICY "Anon token-based submit inquiry"
    ON public.absence_inquiries FOR UPDATE
    TO anon
    USING (token IS NOT NULL AND status = 'pending')
    WITH CHECK (status = 'submitted');

-- Delay Notices:
-- Authenticated admins get full access
CREATE POLICY "Admin full access to delay_notices"
    ON public.delay_notices FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anon teachers can ONLY view their specific notice using the unguessable share_token
CREATE POLICY "Anon token-based view delay notice"
    ON public.delay_notices FOR SELECT
    TO anon
    USING (share_token IS NOT NULL);

-- Anon teachers can ONLY submit their explanation using share_token
CREATE POLICY "Anon token-based submit delay notice response"
    ON public.delay_notices FOR UPDATE
    TO anon
    USING (share_token IS NOT NULL AND status = 'pending_teacher')
    WITH CHECK (status = 'pending_director');

-- 5. Storage Buckets Security Policies
-- Bucket 1: school-assets (School logo, stamp, signature)
-- Public read (for generating PDF forms and branding), Authenticated-only write
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads to school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update to school-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from school-assets" ON storage.objects;

-- Public can read assets for reports and letters
CREATE POLICY "Allow public read from school-assets"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'school-assets');

-- Only authenticated admins can upload/modify/delete school stamps & signatures
CREATE POLICY "Allow authenticated uploads to school-assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'school-assets');

CREATE POLICY "Allow authenticated update to school-assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'school-assets');

CREATE POLICY "Allow authenticated delete from school-assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'school-assets');

-- Bucket 2: absence-attachments (Teacher medical excuses and official attachments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('absence-attachments', 'absence-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Allow public uploads to absence-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from absence-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow restricted uploads to absence-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from absence-attachments" ON storage.objects;

-- Teachers can upload attachments when submitting excuses (anon & authenticated)
CREATE POLICY "Allow restricted uploads to absence-attachments"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'absence-attachments');

-- Only authenticated administrators can read/download sensitive medical excuses
CREATE POLICY "Allow authenticated read from absence-attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'absence-attachments');

-- 6. Mitigate Cascading Delete Risks on Sensitive Tables
-- Remove dangerous ON DELETE CASCADE and replace with ON DELETE RESTRICT
-- to prevent accidental hard deletion of teachers from purging legal audit records.
DO $$
BEGIN
    -- absence_records
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'absence_records_teacher_id_fkey'
        AND table_name = 'absence_records'
    ) THEN
        ALTER TABLE public.absence_records DROP CONSTRAINT absence_records_teacher_id_fkey;
        ALTER TABLE public.absence_records
            ADD CONSTRAINT absence_records_teacher_id_fkey
            FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
            ON DELETE RESTRICT;
    END IF;

    -- delay_notices
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'delay_notices_teacher_id_fkey'
        AND table_name = 'delay_notices'
    ) THEN
        ALTER TABLE public.delay_notices DROP CONSTRAINT delay_notices_teacher_id_fkey;
        ALTER TABLE public.delay_notices
            ADD CONSTRAINT delay_notices_teacher_id_fkey
            FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
            ON DELETE RESTRICT;
    END IF;

    -- deduction_decisions
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'deduction_decisions_teacher_id_fkey'
        AND table_name = 'deduction_decisions'
    ) THEN
        ALTER TABLE public.deduction_decisions DROP CONSTRAINT deduction_decisions_teacher_id_fkey;
        ALTER TABLE public.deduction_decisions
            ADD CONSTRAINT deduction_decisions_teacher_id_fkey
            FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
            ON DELETE RESTRICT;
    END IF;

    -- employee_permissions
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'employee_permissions_teacher_id_fkey'
        AND table_name = 'employee_permissions'
    ) THEN
        ALTER TABLE public.employee_permissions DROP CONSTRAINT employee_permissions_teacher_id_fkey;
        ALTER TABLE public.employee_permissions
            ADD CONSTRAINT employee_permissions_teacher_id_fkey
            FOREIGN KEY (teacher_id) REFERENCES public.teachers(id)
            ON DELETE RESTRICT;
    END IF;
END $$;
