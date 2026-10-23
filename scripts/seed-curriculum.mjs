import { createClient } from '@supabase/supabase-js';
import { CURRICULUM_DATA } from '../src/data/curriculumData.js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.');

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const lessons = Object.values(CURRICULUM_DATA)
  .filter(subject => subject && Array.isArray(subject.lessons))
  .flatMap(subject => subject.lessons.map(lesson => ({
    id: lesson.id,
    subject_key: subject.id,
    title: lesson.title,
    grade: subject.grade || 'الصف الأول الابتدائي (المنهج المصري)',
    description: lesson.objective || '',
    published: false
  })));

const { error } = await supabase.from('curriculum_lessons').upsert(lessons, { onConflict: 'id' });
if (error) throw error;
console.log(`Seeded ${lessons.length} curriculum lessons as unpublished drafts.`);
