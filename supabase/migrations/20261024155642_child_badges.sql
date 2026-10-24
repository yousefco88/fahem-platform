-- =====================================================
-- Child Badges Table
-- =====================================================

-- Earned badges for each child
CREATE TABLE IF NOT EXISTS child_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, badge_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);

-- RLS
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

-- Parents can view their children's badges
CREATE POLICY "Parents view child badges"
  ON child_badges FOR SELECT
  USING (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- System can insert badges (via RPC)
CREATE POLICY "System inserts badges"
  ON child_badges FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT id FROM children WHERE parent_id = auth.uid()
    )
  );

-- =====================================================
-- RPC: Award badge to child
-- =====================================================
CREATE OR REPLACE FUNCTION award_badge(
  p_child_id UUID,
  p_badge_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Check if already has badge
  IF EXISTS (
    SELECT 1 FROM child_badges 
    WHERE child_id = p_child_id AND badge_id = p_badge_id
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'already_earned');
  END IF;
  
  -- Award badge
  INSERT INTO child_badges (child_id, badge_id)
  VALUES (p_child_id, p_badge_id);
  
  RETURN json_build_object(
    'success', true,
    'badge_id', p_badge_id,
    'earned_at', NOW()
  );
END;
$$;

-- =====================================================
-- RPC: Get child's earned badges
-- =====================================================
CREATE OR REPLACE FUNCTION get_child_badges(p_child_id UUID)
RETURNS TABLE (badge_id TEXT, earned_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT badge_id, earned_at
  FROM child_badges
  WHERE child_id = p_child_id
  ORDER BY earned_at DESC;
$$;
