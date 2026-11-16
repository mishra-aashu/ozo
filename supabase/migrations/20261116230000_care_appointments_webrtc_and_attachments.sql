-- Migration: Add WebRTC Video Calling, Attachments, and Real-time Slot Engine to OzoCare
ALTER TABLE public.care_appointments
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meeting_room_id TEXT,
  ADD COLUMN IF NOT EXISTS call_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER DEFAULT 0;

-- Index for fast doctor slot checking
CREATE INDEX IF NOT EXISTS idx_care_appointments_slot_lookup 
  ON public.care_appointments (doctor_id, appointment_date, status);

-- Storage bucket for care documents (Images, PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'care-documents', 
  'care-documents', 
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage policies for care-documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public read on care-documents'
  ) THEN
    CREATE POLICY "Allow public read on care-documents" 
      ON storage.objects FOR SELECT 
      USING (bucket_id = 'care-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow upload to care-documents'
  ) THEN
    CREATE POLICY "Allow upload to care-documents" 
      ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'care-documents');
  END IF;
END $$;
