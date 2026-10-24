-- =====================================================
-- Recorded Lessons Schema
-- الحصص المسجلة
-- =====================================================

-- Table: recorded_lessons
CREATE TABLE IF NOT EXISTS recorded_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES curriculum_subjects(id) ON DELETE SET NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
  
  -- Video info
  video_url TEXT,
  thumbnail TEXT,
  duration TEXT, -- Format: "MM:SS"
  duration_seconds INTEGER,
  
  -- Metadata
  teacher_name TEXT,
  tags TEXT[], -- Array of tags
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published', 'archived')),
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_recorded_lessons_grade ON recorded_lessons(grade);
CREATE INDEX IF NOT EXISTS idx_recorded_lessons_subject ON recorded_lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_recorded_lessons_status ON recorded_lessons(status);

-- RLS
ALTER TABLE recorded_lessons ENABLE ROW LEVEL SECURITY;

-- Anyone can view published lessons
CREATE POLICY "Anyone can view published lessons"
  ON recorded_lessons FOR SELECT
  USING (status = 'published');

-- Admin can manage all lessons
CREATE POLICY "Admin can manage lessons"
  ON recorded_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE auth.uid() = user_id AND role = 'admin'
    )
  );

-- Teacher can manage own lessons
CREATE POLICY "Teacher can manage own lessons"
  ON recorded_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM families
      WHERE auth.uid() = user_id AND role = 'teacher'
    )
  );

-- Table: lesson_views (tracking)
CREATE TABLE IF NOT EXISTS lesson_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES recorded_lessons(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  watched_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(lesson_id, child_id)
);

-- RLS for lesson_views
ALTER TABLE lesson_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own children's views"
  ON lesson_views FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM children
      WHERE family_id IN (SELECT id FROM families WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can track views"
  ON lesson_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update views"
  ON lesson_views FOR UPDATE
  USING (true);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_lesson_view(p_lesson_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE recorded_lessons
  SET view_count = view_count + 1
  WHERE id = p_lesson_id;
END;
$$;
