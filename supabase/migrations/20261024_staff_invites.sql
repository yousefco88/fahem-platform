-- جدول دعوات فريق العمل
-- يسمح بإرسال دعوات لأشخاص جدد قبل تسجيلهم

CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher', 'staff')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهرس للبحث بالبريد
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(email);
CREATE INDEX IF NOT EXISTS idx_staff_invites_status ON staff_invites(status);

-- RLS
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

-- السياسات: Admin فقط يمكنه إدارة الدعوات
CREATE POLICY "Admin can manage invites" ON staff_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- السياسة: المدعو يمكنه رؤية دعوته
CREATE POLICY "Invitee can view own invite" ON staff_invites
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- دالة لربط الدعوة بالمستخدم عند التسجيل
CREATE OR REPLACE FUNCTION handle_staff_invite_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- البحث عن دعوة معلقة لهذا البريد
  UPDATE staff_invites 
  SET 
    status = 'accepted',
    accepted_by = NEW.id,
    updated_at = NOW()
  WHERE 
    email = NEW.email 
    AND status = 'pending'
    AND expires_at > NOW();
  
  -- إضافة الدور للمستخدم الجديد
  INSERT INTO user_roles (user_id, role)
  SELECT NEW.id, role
  FROM staff_invites
  WHERE email = NEW.email AND accepted_by = NEW.id
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger عند تسجيل مستخدم جديد
DROP TRIGGER IF EXISTS on_auth_user_created_staff ON auth.users;
CREATE TRIGGER on_auth_user_created_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_staff_invite_acceptance();

-- إضافة عمود metadata لـ user_roles إن لم يكن موجوداً
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

COMMENT ON TABLE staff_invites IS 'دعوات فريق العمل - تُقبل تلقائياً عند تسجيل المستخدم';
