import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import AuthCard from './account/AuthCard';
import FamilyPanel from './account/FamilyPanel';
import './account/account.css';

/**
 * صفحة حساب الأسرة — غلاف نحيف:
 * - الجلسة من AuthContext (بدل إدارة مكررة)
 * - بيانات ولي الأمر والأبناء تُجلب هنا وتُمرر للوحة العائلة
 * - embedded: بلا إطار/خلفية (تُستخدم داخل «مساحتي»)
 */
export default function ParentAccount({ embedded = false }) {
  const { user, signOut } = useAuth();
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    let active = true;
    if (!user || !supabase) {
      setParent(null);
      setChildren([]);
      return undefined;
    }
    Promise.all([
      supabase.from('parent_profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('children').select('*').eq('parent_id', user.id).order('created_at')
    ]).then(([{ data: profile }, { data: kids }]) => {
      if (!active) return;
      setParent({ id: user.id, name: profile?.full_name || user.email, email: user.email });
      setChildren(kids || []);
    });
    return () => { active = false; };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setParent(null);
    setChildren([]);
  };

  return (
    <main dir="rtl" className={`acct-wrap${embedded ? ' embedded' : ''}`}>
      <section className="acct-card">
        {!embedded && (
          <header className="acct-head">
            <div className="acct-logo" aria-hidden="true">🎓</div>
            <h1>حساب الأسرة في فاهم</h1>
            <p>حساب واحد لولي الأمر يجمع ملفات كل أبنائك — بأمان وخصوصية كاملة.</p>
          </header>
        )}

        {user && parent ? (
          <FamilyPanel
            parent={parent}
            kids={children}
            setKids={setChildren}
            onSignOut={handleSignOut}
          />
        ) : (
          <AuthCard />
        )}
      </section>
    </main>
  );
}
