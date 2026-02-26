
-- Add embeddings column to users table for vector storage
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS embeddings jsonb;

-- Create index on attendance for duplicate prevention (user_id + timestamp)
CREATE INDEX IF NOT EXISTS idx_attendance_user_timestamp ON public.attendance (user_id, timestamp DESC);
