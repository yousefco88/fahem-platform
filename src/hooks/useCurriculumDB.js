/**
 * useCurriculumDB — سحب بيانات المنهج من Supabase
 * يحوّل البيانات لنفس تنسيق CURRICULUM_DATA للتوافق
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// خريطة المواد (subject_key → metadata)
const SUBJECT_META = {
  arabic: { id: 'arabic', title: 'اللغة العربية', icon: '📖', badge: 'لغتي وهويتي', color: '#2563eb' },
  math: { id: 'math', title: 'الرياضيات', icon: '🔢', badge: 'أرقامي القوية', color: '#16a34a' },
  english: { id: 'english', title: 'English', icon: '🔤', badge: 'ABC Fun', color: '#7c3aed' },
  discover: { id: 'discover', title: 'اكتشف', icon: '🔬', badge: 'العالم من حولي', color: '#ea580c' },
  ethics: { id: 'ethics', title: 'القيم والأخلاق', icon: '💝', badge: 'قلبي الكبير', color: '#dc2626' },
};

// تحويل درس من قاعدة البيانات لتنسيق التطبيق
function transformLesson(dbLesson) {
  const content = dbLesson.content || {};
  
  return {
    id: dbLesson.id,
    title: content.title || dbLesson.title,
    objective: content.objective || '',
    duration: content.duration || '00:00',
    order: dbLesson.sort_order,
    published: dbLesson.published,
    
    // Video
    videoUrl: dbLesson.video_url,
    videoType: dbLesson.video_type,
    videoChapters: content.videoChapters || [],
    
    // PDF
    pdfUrl: dbLesson.pdf_url,
    pdfType: dbLesson.pdf_type,
    pdfTitle: content.pdfTitle || '',
    
    // Quiz
    quizType: content.quizType || 'choice',
    question: content.question || '',
    options: (content.choices || []).map((text, i) => ({
      text,
      correct: i === content.answer,
      icon: ''
    })),
    arrangeItems: content.arrangeItems || [],
    
    // Parent Guide
    parentGuide: content.parentGuide || null,
    
    // Word Builder
    interactiveBuilder: content.wordBuilder || null,
    
    // Celebration
    celebration: content.celebration || '',
  };
}

// تحويل بيانات Supabase لتنسيق CURRICULUM_DATA
function transformToCurriculumFormat(subjects, lessons, gradeId) {
  const result = {};
  
  // تجميع الدروس حسب المادة
  const lessonsBySubject = {};
  lessons.forEach(lesson => {
    const key = lesson.subject_key;
    if (!lessonsBySubject[key]) lessonsBySubject[key] = [];
    lessonsBySubject[key].push(transformLesson(lesson));
  });
  
  // بناء كائن المنهج
  subjects.forEach(subject => {
    const meta = SUBJECT_META[subject.key] || {
      id: subject.key,
      title: subject.name,
      icon: '📚',
      badge: '',
      color: '#6b7280'
    };
    
    const subjectLessons = lessonsBySubject[subject.key] || [];
    // ترتيب حسب sort_order
    subjectLessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    result[subject.key] = {
      ...meta,
      title: subject.name,
      grade: gradeId,
      lessons: subjectLessons,
    };
  });
  
  return result;
}

export function useCurriculumDB(gradeId = 'grade_1') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // جلب المواد للصف المحدد
      const { data: subjects, error: subjectsError } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('grade_id', gradeId)
        .eq('published', true)
        .order('sort_order');

      if (subjectsError) throw subjectsError;

      if (!subjects?.length) {
        setData({});
        setLoading(false);
        return;
      }

      const subjectKeys = subjects.map(s => s.key);

      // جلب الدروس المنشورة
      const { data: lessons, error: lessonsError } = await supabase
        .from('curriculum_lessons')
        .select('*')
        .in('subject_key', subjectKeys)
        .eq('published', true)
        .order('sort_order');

      if (lessonsError) throw lessonsError;

      // تحويل للتنسيق المطلوب
      const curriculum = transformToCurriculumFormat(subjects, lessons || [], gradeId);
      setData(curriculum);

    } catch (err) {
      console.error('Error fetching curriculum:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useEffect(() => {
    fetchCurriculum();
  }, [fetchCurriculum]);

  return { data, loading, error, refetch: fetchCurriculum };
}

// جلب درس واحد بالتفاصيل الكاملة
export async function fetchLessonById(lessonId) {
  const { data, error } = await supabase
    .from('curriculum_lessons')
    .select('*')
    .eq('id', lessonId)
    .single();

  if (error) throw error;
  return transformLesson(data);
}

export default useCurriculumDB;
