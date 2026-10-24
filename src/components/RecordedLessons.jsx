/**
 * RecordedLessons.jsx
 * صفحة الحصص المسجلة (هيكل أساسي)
 * 
 * ملاحظة: التنفيذ الكامل يحتاج:
 * - خدمة استضافة فيديو (Vimeo/Mux/Cloudflare Stream)
 * - Storage للرفع (Supabase Storage / S3)
 * - Transcoding pipeline
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ==============================
// Video Player Component
// ==============================
function VideoPlayer({ src, poster, title }) {
  const [playing, setPlaying] = useState(false);
  
  // Placeholder for video - would integrate with actual video service
  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
      {!playing ? (
        <>
          {poster ? (
            <img 
              src={poster} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
              <span className="text-6xl">🎬</span>
            </div>
          )}
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-all group"
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <span className="text-3xl mr-[-4px]">▶️</span>
            </div>
          </button>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {src ? (
            <video 
              src={src} 
              controls 
              autoPlay 
              className="w-full h-full"
            >
              المتصفح لا يدعم تشغيل الفيديو
            </video>
          ) : (
            <div className="text-center text-white">
              <span className="text-6xl block mb-4">🎬</span>
              <p className="text-lg">الفيديو غير متاح حالياً</p>
              <p className="text-sm text-gray-400 mt-2">سيتم رفع الحصص قريباً</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==============================
// Lesson Card Component
// ==============================
function LessonCard({ lesson, onSelect }) {
  return (
    <button
      onClick={() => onSelect(lesson)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all text-right w-full"
    >
      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-indigo-600">
        {lesson.thumbnail ? (
          <img 
            src={lesson.thumbnail} 
            alt={lesson.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">📹</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {lesson.duration || '00:00'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 mb-1 line-clamp-1">{lesson.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2">{lesson.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {lesson.subject_name || 'مادة'}
          </span>
          <span className="text-xs text-gray-400">
            الصف {lesson.grade}
          </span>
        </div>
      </div>
    </button>
  );
}

// ==============================
// Main Component
// ==============================
export default function RecordedLessons() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ subject: 'all', grade: 'all' });

  useEffect(() => {
    loadLessons();
  }, [filter]);

  async function loadLessons() {
    setLoading(true);
    
    try {
      // Query recorded_lessons table (to be created)
      let query = supabase
        .from('recorded_lessons')
        .select('*, curriculum_subjects(name_ar)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (filter.subject !== 'all') {
        query = query.eq('subject_id', filter.subject);
      }
      if (filter.grade !== 'all') {
        query = query.eq('grade', filter.grade);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      console.error('Load lessons error:', err);
      // لا بيانات وهمية: عند فشل التحميل نعرض حالة فارغة صادقة
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-600 text-white p-6">
        <h1 className="text-2xl font-bold mb-2">📹 الحصص المسجلة</h1>
        <p className="text-white/80">شاهد الدروس في أي وقت</p>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border-b sticky top-0 z-10">
        <div className="flex gap-3 overflow-x-auto pb-2">
          <select
            value={filter.grade}
            onChange={(e) => setFilter(f => ({ ...f, grade: e.target.value }))}
            className="px-4 py-2 bg-gray-100 rounded-xl text-sm border-0 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">كل الصفوف</option>
            {[1,2,3,4,5,6].map(g => (
              <option key={g} value={g}>الصف {g}</option>
            ))}
          </select>
          
          <select
            value={filter.subject}
            onChange={(e) => setFilter(f => ({ ...f, subject: e.target.value }))}
            className="px-4 py-2 bg-gray-100 rounded-xl text-sm border-0 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">كل المواد</option>
            <option value="arabic">اللغة العربية</option>
            <option value="math">الرياضيات</option>
            <option value="science">العلوم</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">📭</span>
            <p className="text-gray-500">لا توجد حصص مسجلة حالياً</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map(lesson => (
              <LessonCard 
                key={lesson.id} 
                lesson={lesson}
                onSelect={setSelectedLesson}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{selectedLesson.title}</h2>
              <button 
                onClick={() => setSelectedLesson(null)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <VideoPlayer 
                src={selectedLesson.video_url}
                poster={selectedLesson.thumbnail}
                title={selectedLesson.title}
              />
              <div className="mt-4">
                <p className="text-gray-600">{selectedLesson.description}</p>
                <div className="flex items-center gap-3 mt-4">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {selectedLesson.subject_name}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                    الصف {selectedLesson.grade}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                    ⏱️ {selectedLesson.duration}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
