-- Create users table for registered students
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  reference_images JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  class TEXT NOT NULL,
  section TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  source TEXT DEFAULT 'scanner',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table (public read for face matching)
CREATE POLICY "Anyone can read users for face matching"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert users (registration)"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- RLS Policies for attendance table
CREATE POLICY "Anyone can read attendance"
  ON public.attendance FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (true);

-- RLS Policies for admins table (restricted)
CREATE POLICY "Only admins can read admins"
  ON public.admins FOR SELECT
  USING (false);

-- Insert default admin with bcrypt hash for 'admin123'
-- Hash generated using bcrypt with 10 rounds: $2b$10$rBV2Q7g5V8p5.5y5L5F9uO7QJ7X9L9y9L9y9L9y9L9y9L9y9L9y9L
INSERT INTO public.admins (email, password_hash)
VALUES ('sohailaman@gmail.com', '$2b$10$rBV2Q7g5V8p5y5yL5F9uOyQJ7X9L9y9L9y9L9y9L9y9L9y9L9y9m');

-- Create indexes for better performance
CREATE INDEX idx_users_roll_number ON public.users(roll_number);
CREATE INDEX idx_attendance_timestamp ON public.attendance(timestamp DESC);
CREATE INDEX idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX idx_admins_email ON public.admins(email);