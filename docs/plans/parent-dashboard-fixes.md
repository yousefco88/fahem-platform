# خطة إصلاح صفحات ولي الأمر — منصة فاهم

**تاريخ الإنشاء**: 2026-10-24  
**الحالة**: مقترحة — تنتظر موافقة يوسف  
**المرجع**: تقرير الفحص الشامل

---

## 📊 ملخص المشاكل المكتشفة

| الرقم | المشكلة | الخطورة | الجهد |
|-------|---------|---------|-------|
| 1 | لا توجد فيديوهات (videoUrl مفقود) | 🔴 حرج | متوسط |
| 2 | مكتبة الحصص المسجلة hardcoded | 🟠 عالي | متوسط |
| 3 | باقة الاشتراك وهمية | 🟠 عالي | عالي |
| 4 | واتساب معطل | 🟡 متوسط | عالي |
| 5 | أزرار Sidebar تعرض toast فقط | 🟡 متوسط | منخفض |
| 6 | مصفوفة الإتقان ثابتة جزئياً | 🟡 متوسط | متوسط |

---

## 🎯 المرحلة 1: إصلاحات فورية (P0)

### 1.1 إضافة videoUrl للدروس

**الملف**: `src/data/curriculumData.js`

**الخيارات**:

#### الخيار أ: فيديوهات YouTube مؤقتة (سريع)
```javascript
// كل درس يحتاج:
{
  id: 'eng_hello',
  title: 'Unit 1: Hello...',
  videoUrl: 'https://www.youtube.com/embed/VIDEO_ID',
  // أو للخصوصية:
  videoUrl: null,  // يُظهر "الفيديو قيد التحضير" بدلاً من خطأ
  videoStatus: 'preparing'  // 'ready' | 'preparing' | 'live'
}
```

#### الخيار ب: حالة فارغة صادقة (الأفضل للمرحلة الحالية)
```javascript
// src/context/AppContext.jsx — تعديل StudioModal
if (!lesson.videoUrl) {
  return (
    <div className="video-placeholder">
      <span>🎬</span>
      <h4>الفيديو قيد التحضير</h4>
      <p>سيتوفر قريباً — تابع الإشعارات</p>
    </div>
  );
}
```

**الملفات المتأثرة**:
- `src/data/curriculumData.js` — إضافة `videoUrl` أو `videoStatus`
- `src/components/StudioModal.jsx` — معالجة الحالة الفارغة

---

### 1.2 إصلاح مكتبة الحصص المسجلة

**المشكلة**: 3 حصص مكتوبة يدوياً في JSX

**الحل**: نقلها لمصفوفة في curriculumData أو localStorage

```javascript
// src/data/curriculumData.js — إضافة:
export const recordedSessions = [
  {
    id: 'rec_connect1_u1',
    subjectKey: 'english',
    lessonId: 'eng_hello',
    title: 'Connect 1: Unit 1 Phonics & Busy Bee',
    teacher: 'أ/ دينا مصطفى',
    duration: '27:30',
    videoUrl: null,  // أو YouTube URL
    recordedAt: '2026-10-20'
  },
  {
    id: 'rec_discover_senses',
    subjectKey: 'discover',
    lessonId: 'disc_senses',
    title: 'اكتشف: الحواس الخمس واستكشاف العالم',
    teacher: 'أ/ أحمد سالم',
    duration: '29:30',
    videoUrl: null,
    recordedAt: '2026-10-18'
  },
  {
    id: 'rec_values_honesty',
    subjectKey: 'values',
    lessonId: 'val_honesty',
    title: 'التربية والأخلاق: الصدق والأمانة',
    teacher: null,
    duration: '25:20',
    videoUrl: null,
    recordedAt: '2026-10-15'
  }
];
```

**ParentDashboard.jsx — التعديل**:
```jsx
// استبدال الـ JSX الثابت بـ:
import { recordedSessions } from '../data/curriculumData';

{recordedSessions.map(session => (
  <RecordedSessionCard 
    key={session.id}
    session={session}
    onPlay={() => openLesson(session.subjectKey, session.lessonId, 'video')}
  />
))}
```

---

## 🎯 المرحلة 2: تحسينات متوسطة (P1)

### 2.1 إزالة أو تصحيح "باقة التأسيس النشطة"

**الخيارات**:

#### الخيار أ: إزالة حتى تجهيز نظام الاشتراكات
```jsx
// إزالة السطر 199 من ParentDashboard.jsx
// أو استبداله بـ:
<span className="tag-badge">📚 الوصول التجريبي المجاني</span>
```

#### الخيار ب: ربطها بـ Supabase (Phase 6 — مؤجل)
```sql
-- جدول subscriptions
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  family_id uuid REFERENCES families(id),
  plan_type text,  -- 'trial' | 'basic' | 'premium'
  status text,     -- 'active' | 'expired' | 'cancelled'
  expires_at timestamptz
);
```

---

### 2.2 تحسين مصفوفة الإتقان

**المشكلة**: 12 مادة مكتوبة بـ `<div>` منفصلة

**الحل**: استخدام `.map()` على `curriculumData`

```jsx
// استبدال JSX الثابت بـ:
{Object.entries(curriculumData)
  .filter(([key]) => key !== 'expatExamCalendar')
  .map(([subjectKey, subject]) => (
    <MasteryRow
      key={subjectKey}
      subject={subject}
      subjectKey={subjectKey}
      learningRecords={learningRecords}
      activeChild={activeChild}
      onOpenLesson={openLesson}
    />
  ))
}
```

---

### 2.3 إصلاح أزرار Sidebar

**المشكلة**: تعرض toast بدلاً من التمرير/الانتقال

**الحل**: Smooth scroll للقسم المطلوب

```jsx
// جدول الحصص الحية
onClick={() => {
  document.getElementById('live-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
}}

// مصفوفة الإتقان
onClick={() => {
  document.getElementById('mastery-matrix-section')?.scrollIntoView({ behavior: 'smooth' });
}}
```

---

## 🎯 المرحلة 3: تكاملات مستقبلية (P2)

### 3.1 واتساب API

**الخيارات**:
1. **Twilio WhatsApp API** — $0.005/رسالة
2. **WhatsApp Business Cloud API** — مجاني حتى 1000 محادثة/شهر
3. **wa.me deep link** — مجاني، محدود

```jsx
// الحل السريع (wa.me):
const shareLink = `https://wa.me/?text=${encodeURIComponent(
  `سجّل طفلك في منصة فاهم: ${window.location.origin}/register`
)}`;
window.open(shareLink, '_blank');
```

---

### 3.2 Supabase للحصص المسجلة

```sql
-- supabase/migrations/20261024000300_recorded_sessions.sql
CREATE TABLE recorded_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_key text NOT NULL,
  lesson_id text NOT NULL,
  title text NOT NULL,
  teacher_name text,
  duration text,
  video_url text,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE recorded_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read" ON recorded_sessions FOR SELECT USING (true);
```

---

## 📋 خطة التنفيذ

| المرحلة | المهمة | الجهد | المسؤول | الحالة |
|---------|--------|-------|---------|--------|
| **1.1** | حالة فارغة صادقة للفيديو | 30 دقيقة | — | ⏳ |
| **1.2** | نقل الحصص المسجلة لمصفوفة | 45 دقيقة | — | ⏳ |
| **2.1** | تصحيح badge الباقة | 15 دقيقة | — | ⏳ |
| **2.2** | مصفوفة الإتقان ديناميكية | 1 ساعة | — | ⏳ |
| **2.3** | Smooth scroll للأزرار | 20 دقيقة | — | ⏳ |
| **3.1** | wa.me deep link | 15 دقيقة | — | ⏳ |
| **3.2** | Supabase recorded_sessions | 1 ساعة | — | ⏳ |

---

## ✅ معايير القبول

- [ ] لا تظهر رسالة "لا يوجد فيديو مرفق" — تُستبدل بحالة "قيد التحضير"
- [ ] مكتبة الحصص تُحمّل من مصفوفة وليس JSX ثابت
- [ ] badge الباقة يعكس الحالة الحقيقية (تجريبي/مدفوع)
- [ ] أزرار Sidebar تُمرّر للقسم المطلوب
- [ ] زر واتساب يفتح wa.me أو يعرض "قريباً" بدلاً من خطأ
- [ ] `npm run build` ينجح بدون أخطاء

---

## 🔗 الملفات المتأثرة

```
src/
├── data/
│   └── curriculumData.js        ← إضافة videoUrl/videoStatus + recordedSessions
├── components/
│   ├── ParentDashboard.jsx      ← 6 تعديلات
│   ├── StudioModal.jsx          ← معالجة videoUrl=null
│   └── parent/
│       ├── RecordedSessionCard.jsx  ← مكوّن جديد
│       └── MasteryRow.jsx           ← مكوّن جديد
└── context/
    └── AppContext.jsx           ← (لا تغيير)

supabase/migrations/
└── 20261024000300_recorded_sessions.sql  ← جديد (P2)
```

---

**الخطوة التالية**: اختر الأولوية للبدء:
1. **سريع**: حالة فارغة صادقة للفيديو (30 دقيقة)
2. **شامل**: المرحلة 1 كاملة (1.5 ساعة)
3. **كامل**: المراحل 1 + 2 (3 ساعات)
