-- ==============================================================================
-- ترقية الجاهزية السحابية والمصدر الموحد للحقيقة (Cloud Sync Hardening Migration)
-- ==============================================================================

-- 1. إضافة عمود رابط المرفق في جدول سجلات الغياب (absence_records)
ALTER TABLE public.absence_records ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 2. جدول إعدادات المدرسة والأختام والتواقيع السحابية (school_settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    school_name TEXT NOT NULL DEFAULT 'ثانوية خديجة بنت خويلد',
    school_logo TEXT,
    principal_name TEXT DEFAULT 'ريم هزاع الشمري',
    vice_principal_name TEXT DEFAULT 'أحلام صالح الضبيبي',
    stamp_url TEXT,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية إذا لم تكن موجودة
INSERT INTO public.school_settings (id, school_name, principal_name, vice_principal_name)
VALUES ('current', 'ثانوية خديجة بنت خويلد', 'ريم هزاع الشمري', 'أحلام صالح الضبيبي')
ON CONFLICT (id) DO NOTHING;

-- تفعيل أمان الصفوف RLS لجدول إعدادات المدرسة
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read school_settings" ON public.school_settings;
CREATE POLICY "Allow anon read school_settings"
    ON public.school_settings FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon update school_settings" ON public.school_settings;
CREATE POLICY "Allow anon update school_settings"
    ON public.school_settings FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. إعداد حاوية التخزين السحابي للأختام والتواقيع (school-assets)
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- سياسات الوصول لحاوية school-assets
DROP POLICY IF EXISTS "Allow public uploads to school-assets" ON storage.objects;
CREATE POLICY "Allow public uploads to school-assets"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow public read from school-assets" ON storage.objects;
CREATE POLICY "Allow public read from school-assets"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow public update to school-assets" ON storage.objects;
CREATE POLICY "Allow public update to school-assets"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id = 'school-assets');

-- 4. تفعيل البث المباشر (Supabase Realtime) لكافة الجداول التشغيلية السبعة
DO $$
BEGIN
    -- إضافة الجداول للنشر إذا لم تكن مضافة مسبقاً
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.absence_records;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.absence_inquiries;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delay_notices;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_permissions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deduction_decisions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.school_settings;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;
