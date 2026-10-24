-- ============================================================================
-- Migration: Recorded Sessions Table
-- Purpose: Store recorded lesson sessions for the Parent Dashboard library
-- Author: Fahem Platform
-- Date: 2026-10-24
-- ============================================================================

-- Create recorded_sessions table
CREATE TABLE IF NOT EXISTS recorded_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key text NOT NULL,
  lesson_id text NOT NULL,
  title text NOT NULL,
  teacher_name text,
  duration text NOT NULL DEFAULT '00:00',
  video_url text,
  thumbnail_gradient text DEFAULT 'linear-gradient(135deg, #1e3a8a, #7c3aed)',
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recorded_sessions ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can browse recorded sessions)
CREATE POLICY "Anyone can read recorded sessions" 
  ON recorded_sessions FOR SELECT 
  USING (true);

-- Only admins can manage recorded sessions
CREATE POLICY "Admins can manage recorded sessions" 
  ON recorded_sessions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'teacher')
    )
  );

-- Index for common queries
CREATE INDEX idx_recorded_sessions_subject ON recorded_sessions(subject_key);
CREATE INDEX idx_recorded_sessions_recorded_at ON recorded_sessions(recorded_at DESC);

-- Seed initial recorded sessions (matching frontend data)
INSERT INTO recorded_sessions (subject_key, lesson_id, title, teacher_name, duration, thumbnail_gradient, recorded_at)
VALUES
  ('english', 'eng_hello', 'Connect 1: Unit 1 Phonics & Busy Bee', 'أ/ دينا مصطفى', '27:30', 'linear-gradient(135deg, #1e293b, #8b5cf6)', '2026-10-20'),
  ('discover', 'disc_senses', 'اكتشف: الحواس الخمس واستكشاف العالم', 'أ/ أحمد سالم', '29:30', 'linear-gradient(135deg, #1e3a8a, #0284c7)', '2026-10-18'),
  ('values', 'val_honesty', 'التربية والأخلاق: الصدق والأمانة في الفصل', NULL, '25:20', 'linear-gradient(135deg, #1e3a8a, #d97706)', '2026-10-15')
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE recorded_sessions IS 'مكتبة الحصص المسجلة — تعرض في لوحة ولي الأمر';
