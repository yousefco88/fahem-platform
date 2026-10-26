# تدقيق ما قبل الإطلاق: لوحة الإدارة، مساحة المعلم، مشغّل الدرس، والامتحانات

- **SHA:** `0daa12a` (تم التحقق بـ `git log -1 --oneline`، ولا توجد تعديلات على الكود. الملفات غير المتتبَّعة موجودة في `docs/audit/` فقط)
- **النطاق:** `AdminDashboard.jsx`، `admin/**`، `TeacherStudio.jsx`، `teacher/**`، `myspace/**`، `Modals.jsx`، `ExamGate.jsx`، `EmbassyExamSimulator.jsx`
- **المنهج:** قرأت الكود فقط وقارنته بـ `supabase/schema.sql` و`supabase/migrations/*`. لم أستدعِ الإنتاج ولم أقرأ `.env` أو `.local`، ولم أعدّل الكود.
- **ملاحظة على الثيم:** يضبط `src/index.css:88` الخاصية `color-scheme: dark`، فتتلوّن الحقول الأصلية غير المنسّقة تلقائياً في الوضع الليلي. لذلك لا يذكر التقرير الحقول التي ليس لها `background` صريح. يذكر فقط **الألوان الفاتحة المكتوبة يدوياً**.
- **ملاحظة على المخطط:** المقارنة كانت مع ملفات المخطط المحلية. يجب أن يتأكد Yousef من تطابقها مع قاعدة الإنتاج قبل اعتماد البندين P0-2 وP1-1.

---

## P0: يجب إصلاحها قبل الإطلاق

### P0-1: بنك الأسئلة يحفظ الإجابة الصحيحة على خيار خاطئ
- **المكان:** `src/components/admin/curriculum/LessonEditor.jsx:578-579` و`:614-615` (نسخ السؤال القديم)، وتُقرأ في `src/context/AppContext.jsx:257`
- **المشكلة:** الكود يحذف الخيارات الفارغة بـ `filter(Boolean)` لكنه يُبقي `answer` على رقم الخيار القديم. التحقق في `:563` يفحص المصفوفة قبل الحذف. مثال: الخيارات `['أ','','ج','د']` والإجابة الصحيحة رقم 2 تُحفظ هكذا: `choices=['أ','ج','د']` و`answer=2`. عندها يعتبر المشغّل «د» هي الصحيحة، لأنه يحسب `correct: i === q.answer`.
- **الأثر:** يُعاقَب الطفل على الإجابة الصحيحة، وتصل لولي الأمر نتيجة إتقان وتقرير مهارات غير صحيحَين.
- **الإصلاح:** أعِد حساب `answer` بعد الحذف (`newIndex = filledIndices.indexOf(draft.answer)`)، أو امنع الحفظ إذا وُجد خيار فارغ قبل الإجابة. ثم افحص أسئلة البنك الموجودة حالياً.

### P0-2: لا يمكن إضافة دروس لأي مادة جديدة تُنشأ من لوحة المواد
- **المكان:** `admin/curriculum/LessonsPanel.jsx:87` و`teacher/TeacherCurriculum.jsx:88` يرسلان `grade: subject.grade`. `admin/curriculum/SubjectsPanel.jsx:104-116` لا يضبط `grade` أبداً، بل يضبط `grade_id` فقط. و`supabase/schema.sql:49` يعرّف العمود هكذا: `curriculum_lessons.grade text not null`.
- **المشكلة:** قيمة `grade` في المادة الجديدة هي `NULL`، فيفشل إدراج أي درس بخطأ not-null، سواء أضافه المدير أو المعلم.
- **الأثر:** المسار الأساسي لبناء المنهج من الواجهة معطّل لكل مادة تُنشأ بعد الإطلاق.
- **الإصلاح:** املأ `grade` من الصف المختار عند إنشاء المادة أو تعديلها، أو خذه من `grades` حسب `grade_id` عند إدراج الدرس، أو أضف migration تجعل العمود يقبل `NULL` أو تعطيه قيمة افتراضية.

### P0-3: زر «منشور» عند المدير يتجاوز مسار المراجعة، ولا يظهر الدرس للأهل
- **المكان:** `admin/curriculum/LessonsPanel.jsx:105-116`، `admin/curriculum/LessonEditor.jsx:133` و`:202-207`، والسياسات في `supabase/migrations/20261028090000_teacher_curriculum_workflow.sql:67` و`:153` و`:169`
- **المشكلة:** التبديل يغيّر `published` فقط. درس المعلم يبقى `review_status = 'draft'` أو `'submitted'`، وسياسة RLS لا تعرض للأهل إلا ما يحقق `published AND review_status = 'approved'`.
- **الأثر:** يرى المدير الشارة «✓ منشور» بينما الدرس مخفي عن الأهل، أي نجاح وهمي في الواجهة. والفشل نفسه صامت، لأن `LessonsPanel:111` لا يعرض أي رسالة عند حدوث خطأ.
- **الإصلاح:** إذا كانت حالة الدرس غير `approved` فاستعمل `review_lesson` (يضبط `review_status='approved', published=true`، السطر `:128`)، أو اعرض الشارة «بانتظار المراجعة» واعرض الخطأ.

### P0-4: إعدادات الموقع قد تكتب القيم الافتراضية فوق قيم قاعدة البيانات
- **المكان:** `admin/SiteSettingsPanel.jsx:48`، ومعها `src/context/SiteSettingsContext.jsx:19-35`
- **المشكلة:** `draft` لقطة تُؤخذ مرة واحدة من `settings` عند فتح التبويب، ولا يوجد `useEffect` لمزامنتها ولا حارس للتحميل. إذا فُتح التبويب قبل اكتمال `load()`، أو فشل التحميل بخطأ شبكة دون أن يُضبط `tableMissing`، تبقى المسودة على `SITE_DEFAULTS`. وعند «حفظ» أي قسم تُكتب القيم الافتراضية فوق قيم الإنتاج.
- **الأثر:** فقدان صامت لبيانات الصفحة الرئيسية والتواصل والأسعار.
- **الإصلاح:** لا تعرض النموذج حتى يصبح `loading=false`، وزامن المسودة عند تغيّر `settings` إن لم تكن «متّسخة»، واعرض خطأ التحميل بدل القيم الافتراضية.

### P0-5: لا يمكن الإجابة على أسئلة الطفل والامتحان بلوحة المفاتيح أو قارئ الشاشة
- **المكان:** `Modals.jsx:414-418` (خيارات الاختبار)، `EmbassyExamSimulator.jsx:340-350` (خيارات الامتحان)
- **المشكلة:** الخيارات عناصر `<div onClick>` بلا `role` ولا `tabIndex` ولا معالجة لـ Enter/Space.
- **الأثر:** الوظيفة الأساسية، أي الإجابة، غير متاحة للوحة المفاتيح ولا لقارئ الشاشة.
- **الإصلاح:** استعمل `<button type="button">`، أو `role="radio"` مع `aria-checked` و`tabIndex=0` و`onKeyDown`، ولفّ الخيارات بـ `role="radiogroup"`.

### P0-6: خيارات محاكي الامتحان بيضاء ثابتة في الوضع الليلي
- **المكان:** `EmbassyExamSimulator.jsx:344` (`background: isSelected ? 'var(--blue-light)' : '#ffffff'`)
- **المشكلة:** نص الخيار يرث `var(--navy)`، وقيمته في الوضع الليلي `#f1f5f9`، فيظهر نص فاتح على خلفية بيضاء.
- **الأثر:** الخيارات غير المختارة شبه غير مقروءة داخل الامتحان.
- **الإصلاح:** استعمل `var(--card-bg)`.

### P0-7: المحاكي يدّعي تطابقاً رسمياً لا يمكن إثباته
- **المكان:** `EmbassyExamSimulator.jsx:153` («النموذج الإلكتروني المتطابق مع المنصة الوزارية…»). وكذلك `:174-176` («يحاكي زمن المنصة الوزارية») و`:240` (عنوان رسمي الطابع)
- **المشكلة:** هذه الادعاءات تناقض إخلاء المسؤولية في الملف نفسه (`:165` و`:423`)، وتخالف قاعدة المشروع «لا ادعاءات غير موثقة».
- **الإصلاح:** اكتب «تدريب مستوحى من نمط تقييمات السفارات، وليس نموذجاً رسمياً».

---

## P1: عالية، والأفضل إصلاحها قبل الإطلاق

1. **حقل «بناء الكلمة» لا يقبل الفاصلة أثناء الكتابة**
   - **المكان:** `LessonEditor.jsx:919-920` و`:930-931`
   - **المشكلة:** الحقل المتحكَّم به يُعاد تحليله مع كل ضغطة (`split→trim→filter`)، فتُحذف الفاصلة فور كتابتها.
   - **الأثر:** لا يمكن إدخال أكثر من مقطع واحد بالكتابة، فقط باللصق.
   - **الإصلاح:** احتفظ بالنص الخام في state مستقل، وحلّله عند `onBlur` أو عند الحفظ، وتحقّق أن `correctOrder` تبديل صحيح لفهارس المقاطع (لا يوجد تحقق في `:948`).
2. **لا يمكن إكمال كلمة فيها مقطع مكرر**
   - **المكان:** `Modals.jsx:149` و`:348-354`
   - **المشكلة:** `builtSyllables.includes(syl)` يمنع اختيار أي مقطع سبق اختياره، ويعطّل كل أزرار المقطع المكرر.
   - **الأثر:** كلمات مثل «بابا» لا يمكن إكمالها أبداً.
   - **الإصلاح:** تتبّع المقاطع المستعملة بالفهرس (`usedIdx`) بدل القيمة.
3. **تهنئة بجائزة غير مضمونة**
   - **المكان:** `Modals.jsx:437-440`
   - **المشكلة:** تظهر «تم منحك شارة الإتقان الذهبية وإضافة 30 نقطة» دائماً، مع أن النقاط تُمنح أول مرة فقط (`AppContext` في `recordQuizMastery`)، ودون انتظار نجاح الحفظ.
   - **الإصلاح:** اعرض الجائزة فقط إذا أعاد الحفظ أنها أول مرة.
4. **قائمة متابعة طلاب المعلم ثابتة دائماً**
   - **المكان:** `TeacherStudio.jsx:153-173`
   - **المشكلة:** القسم موصوف بأنه «من نتائج الإتقان الفعلية» و«مرصودون تلقائياً»، لكن لا شيء يحسبه، فيبقى نصاً ثابتاً.
   - **الإصلاح:** احسبه من `exam_attempts` و`lesson_question_attempts`، أو أزل القسم.
5. **تقريرا ولي الأمر يطابقان الأطفال بالاسم**
   - **المكان:** `myspace/WeeklySummaryCard.jsx:51` و`myspace/SkillsReport.jsx:68` و`:77`
   - **المشكلة:** المطابقة بـ `child_name` وليس بمعرّف الطفل. وفي الملخص الأسبوعي تُنسب كل محاولة قيمة `child_name` فيها `NULL` إلى الطفل النشط.
   - **الأثر:** عند وجود طفلين باسم واحد أو بعد تغيير الاسم تختلط النتائج أو تتفرّق.
   - **الإصلاح:** طابق بـ `child_key` أو `child_id` (العمود مُختار أصلاً في `SkillsReport:56` لكنه غير مستعمل).
6. **أرقام لوحة الإدارة تظهر صفراً لمحرر المحتوى مع وصفها بأنها «حقيقية»**
   - **المكان:** `AdminDashboard.jsx:41-55` و`:194-230`
   - **المشكلة:** محرر المحتوى يدخل `/admin` (`App.jsx:111`)، لكن RLS لجداول `parent_profiles` و`children` و`bookings` مخصصة للمدير فقط. النتيجة `count=null`، فيظهر `0` مع عبارة «البيانات أعلاه حقيقية من قاعدة البيانات». الأخطاء أيضاً لا تُقرأ.
   - **الإصلاح:** اعرض شريط الأرقام للمدير فقط، واعرض «تعذّر التحميل» عند الخطأ.
7. **إضافة معلم بالبريد قد تخفّض مديراً دون تأكيد**
   - **المكان:** `AdminDashboard.jsx:118-132`
   - **المشكلة:** إذا كان البريد لمدير أو محرر محتوى، يتحول إلى `teacher` مباشرة بلا تأكيد. ويتغير الدور كذلك بنقرة واحدة من القائمة المنسدلة في `:478-481`، بما في ذلك الترقية إلى `admin`.
   - **الإصلاح:** اطلب `confirm` عند الترقية إلى admin، وعند خفض دور admin أو content_editor.
8. **تقديم الامتحان بلا تأكيد واحتفال حتى مع صفر إجابات**
   - **المكان:** `EmbassyExamSimulator.jsx:68-72` و`:393`
   - **المشكلة:** الزر «مراجعة وتسليم» يسلّم فوراً، دون شاشة مراجعة ودون تحذير من الأسئلة غير المُجابة. ويُطلق confetti و«أحسنت» حتى لو كانت النتيجة 0.
   - **الإصلاح:** أضف خطوة تأكيد تعرض عدد الأسئلة غير المجابة، واربط الاحتفال بنسبة النجاح.
9. **فشل حفظ محاولة الامتحان صامت**
   - **المكان:** `EmbassyExamSimulator.jsx:101`
   - **المشكلة:** `.then` بلا `.catch`، ولا تظهر رسالة عند `ok:false`.
   - **الأثر:** يظن ولي الأمر أن النتيجة وُثّقت وهي لم تُحفظ.
10. **حذف مادة لا يحذف دروسها كما تعد رسالة التأكيد**
    - **المكان:** `SubjectsPanel.jsx:155`
    - **المشكلة:** رسالة التأكيد تقول «سيحذف جميع الدروس المرتبطة»، لكن `curriculum_lessons.subject_key` بلا مفتاح أجنبي (`schema.sql:48`)، فتبقى الدروس يتيمة. فقط `teacher_subjects` تُحذف تتابعياً (`workflow.sql:23`).
    - **الإصلاح:** احذف الدروس صراحةً، أو أضف مفتاحاً أجنبياً بـ `on delete cascade`، أو صحّح نص الرسالة.
11. **رابط المرجع يُعرض للطفل وولي الأمر دون تعقيم**
    - **المكان:** `Modals.jsx:547`
    - **المشكلة:** `ref.url` يُعرض كما هو، ولا يمر عبر `safeFileUrl` كما يحدث مع PDF.
    - **المصدر:** يُدخَل في `LessonEditor.jsx:1063-1069`، وأي معلم يستطيع كتابته.
    - **الأثر:** رابط `javascript:` أو رابط غير آمن.
    - **الإصلاح:** اقبل `https://` فقط، في الحفظ وفي العرض معاً.
12. **«إرسال للمراجعة» يكمل رغم فشل الحفظ**
    - **المكان:** `LessonEditor.jsx:157`
    - **المشكلة:** `if (hasChanges) await saveLesson()` لا يعرف إن فشل الحفظ، لأن `saveLesson` لا تُرجع نتيجة. فيُرسَل المحتوى القديم ويُقفل الدرس.
    - **الإصلاح:** اجعل `saveLesson` تُرجع `ok`، وأوقف الإرسال عند الفشل.

---

## P2: متوسطة

### رسائل «لا توجد بيانات» تظهر بينما الطلب فشل
| الملف:السطر | السلوك |
|---|---|
| `admin/LessonReview.jsx:34-37` | أخطاء الاستعلامات الأربعة تُتجاهل، فيظهر «لا توجد دروس مُرسلة» |
| `admin/LessonReview.jsx:25`، `teacher/TeacherCurriculum.jsx:45` | عند `!supabase` تبقى حالة التحميل للأبد |
| `TeacherStudio.jsx:43` | الخطأ يتحول إلى `[]`، فيظهر «لم يُسند لك طلاب» |
| `myspace/MySpace.jsx:83-85` | خطأ `exam_attempts` يظهر «لا توجد نتائج موثقة» |
| `myspace/TeacherRoster.jsx:59` و`:67` | الخطأ يظهر «0 دروس مكتملة» و«لا توجد حصص مسندة» |
| `myspace/SkillsReport.jsx:76` | خطأ بنك الأسئلة يُتجاهل |
| `admin/curriculum/GradesPanel.jsx:47`، `SubjectsPanel.jsx:36`، `LessonsPanel.jsx:36` | أخطاء الجلب تُتجاهل، ورسالة الخطأ لا تُمسح عند إعادة الجلب (`LP:51`، `SP:57`) |
| `GradesPanel.jsx:132-143`، `SubjectsPanel.jsx:141-152`، `LessonsPanel.jsx:111` | فشل تبديل النشر صامت |
| `admin/RecordingsReview.jsx:20` | إذا لم يُنشأ رابط موقّع لا تظهر أي رسالة |
| `admin/curriculum/GradesPanel.jsx:33` | لا يوجد حارس لـ `!supabase`، فيحدث كراش |

### منطق ومزامنة
- **`ExamGate.jsx:40`:** `learningRecords?.[activeChild.id]` يُرجع دائماً `{}`، لأن السياق يحصر `learningRecords` في الطفل النشط مسبقاً (`AppContext.jsx:731`). البوابة تعتمد على `masteredLessons` فقط. الخطر يخفّ بسبب الدمج في `AppContext:423`، لكنه خطأ كامن. ونفس النمط موجود خارج النطاق في `ChildHome:53` و`ParentDashboard:68`.
- **`TeacherStudio.jsx:65`:** `subjectsCount` يشمل `expatExamCalendar`، بينما `AdminDashboard.jsx:60` يستثنيه، فيظهر العدد +1. والسطر `:87` يكتب «الصف الأول الابتدائي» ثابتاً.
- **`TeacherStudio.jsx:47-56`:** «نسبة الإتقان» تساوي الدروس المكتملة ÷ كل السجلات، وهذا ليس إتقاناً. أعد التسمية إلى «نسبة الإكمال».
- **`myspace/MySpace.jsx:37`:** اسم اليوم يُحسب بتوقيت الجهاز، بينما `slotsForToday` يستعمل `effectiveTimezone`، فقد لا يتطابقان قرب منتصف الليل.
- **`myspace/TeacherRoster.jsx:95-100` و`AssignStudents.jsx:46-50`:** تبديل «فتح الامتحان» بلا حالة انشغال، فالنقر المزدوج يقلبه مرتين. و`AssignStudents.jsx:65` زر الإسناد غير معطّل عند غياب المعلم أو الطفل.
- **`admin/BookingsPanel.jsx:46`:** تغيير الحالة بلا قفل. الطلبات المتسارعة تتسابق، والتراجع يعيد `prev` قديماً. و`:30` فيه `limit 200` مع عرض العدد كأنه «إجمالي».
- **`admin/FamiliesPanel.jsx:15-16` و`AssignStudents.jsx:63`:** بلا `limit` أو ترقيم صفحات، فتُقصّ النتائج صامتةً عند 1000 صف.
- **`admin/curriculum/LessonsPanel.jsx:46`:** يعرض الدروس المؤرشفة دون تمييز. `LessonEditor.jsx:164` يعد بأن «الإدارة تستطيع استرجاعه»، ولا توجد واجهة للاسترجاع.
- **`admin/curriculum/FileUploader.jsx:85`:** `getPublicUrl('curriculum-media')`، ولا توجد migration تنشئ هذا الـ bucket أو تجعله عاماً (توجد السياسات فقط في `workflow.sql:192-195`). يجب التحقق من لوحة Supabase. وفي `:108-113` حذف الملف للمعلم يفشل دائماً، لأن الحذف مسموح لـ `is_content_editor` فقط. كما أن الحذف يتم من التخزين قبل حفظ الدرس، فيبقى رابط ميت.
- **`admin/curriculum/SubjectsPanel.jsx:116`:** المادة الجديدة `published: true` فوراً، فتظهر مادة فارغة للأهل. و`:36-40` يجلب الصفوف المنشورة فقط، فتظهر مواد الصفوف غير المنشورة بعلامة «—».
- **`admin/curriculum/LessonEditor.jsx:296-304`:** المعلم يرى كل المواد في القائمة، واختيار مادة غير مُسندة يعطي خطأ RLS خاماً.
- **`admin/curriculum/LessonEditor.jsx:683`:** في سؤال الترتيب تُؤخذ `answer` لقطةً عند تغيير النوع، ولا تتحدث مع تعديل العناصر.
- **`admin/curriculum/LessonEditor.jsx:41-44`:** لا يوجد تحذير عند مغادرة الصفحة مع تغييرات غير محفوظة. ونفس الشيء في `SiteSettingsPanel`.
- **`teacher/TeacherCurriculum.jsx:110`:** النص يقول إن الإسناد يتم من «المستخدمون والصلاحيات»، بينما واجهة الإسناد فعلياً في تبويب «مراجعة الدروس» (`admin/LessonReview.jsx:64-65`).
- **`Modals.jsx:53-54`:** بوابة ولي الأمر ثابتة دائماً (5+4=9)، ويسهل حفظها.

### ألوان فاتحة ثابتة تنكسر في الوضع الليلي
- `Modals.jsx:592`: الخلفية `#e2e8f0` مع النص `var(--navy)`، فيكاد زر الإلغاء في بوابة ولي الأمر لا يُرى.
- `Modals.jsx:396-397` (`#fef08a` و`#713f12`)، و`Modals.jsx:449-450` و`SkillsReport.jsx:138` (النص `#9a3412` على `--orange-light`).
- `TeacherStudio.jsx:118`، `:140`، `:146-149` (`#ecfdf5` و`#fefce8` و`#f0f9ff` و`#0284c7`).
- `EmbassyExamSimulator.jsx:122-124` (`#f0fdf4` و`#fefce8` و`#fef2f2`)، و`ExamGate.jsx:62` (المسار `#e2e8f0`).
- `AdminDashboard.jsx:302` (`#c7d2fe`)، و`admin/BookingsPanel.jsx:84` (خلفية `var(--yellow)` مع نص أبيض، تباين ضعيف).

### الجوال
- `EmbassyExamSimulator.jsx:366`: أزرار التنقل الثلاثة بلا `flexWrap`، فتفيض على الشاشات الضيقة.
- `CurriculumAdmin.css:337`: `.editor-actions` بلا `flex-wrap`. المعلم يرى 4 عناصر فتفيض. و`.chapter-row` (`:444`) مع `.input-md` بعرض 200px ثابت لا يغطيه الإصلاح في `:840`، لأنه مقصور على `.curriculum-panel`.
- `admin/FamiliesPanel.jsx:54`: حقل البحث `minWidth: 240` داخل صف لا يلتف.
- `admin/SiteSettingsPanel.jsx:333` و`:592` و`:604`: شبكات أعمدة ثابتة (`70px 1fr 1fr` و`2fr 1fr 1fr`) تضيق على الجوال.
- `Modals.jsx:412` و`LessonEditor.jsx:730`: `1fr 1fr` ثابتة دون نقطة كسر.

### الوصولية
- `CurriculumAdmin.css:476-478` و`:782-784`: أزرار الراديو مخفية بـ `display:none` في محرر السؤال القديم وصح/خطأ، فلا تصلها لوحة المفاتيح.
- `Modals.jsx:178-185`: الحوار بلا حصر للتركيز ولا إعادة له عند الإغلاق. `Modals.jsx:199` و`LessonEditor.jsx:235`: التبويبات بلا `role="tablist"` أو `aria-selected`.
- `Modals.jsx:563`: بوابة ولي الأمر بلا `role="dialog"` أو `aria-modal`، ولا تُغلق بـ Escape، والحقل بلا label، والضغط على Enter لا يُرسل لأنه لا يوجد `<form>`.
- أزرار أيقونات بلا `aria-label`: `LessonEditor.jsx:437` و`:669`، `GradesPanel.jsx:309` و`:312`، وأزرار ✏️/🗑 في `SubjectsPanel` و`LessonsPanel`.
- `LessonEditor.jsx:701`: الراديو بلا label، فلا يعرف قارئ الشاشة أي خيار هو الصحيح. والـ labels في `SiteSettingsPanel` و`LessonEditor` غير مربوطة بـ `htmlFor`.

---

## P3: منخفضة / تنظيف
- `admin/AdminKPICards.jsx` و`admin/AdminActivityLog.jsx` **كود ميت**، لا يستوردهما أي ملف. `AdminKPICards.jsx:76` يعرض «الفريق 0» ثابتاً، أي رقم مختلق، وفيه ألوان فاتحة ثابتة. احذفهما أو أصلحهما قبل أي إعادة استعمال.
- `EmbassyExamSimulator.jsx:182`: «10 أسئلة» مكتوبة يدوياً بدل `EXAM_QUESTIONS.length` (العدد الحالي 10، لكنه سيتباعد عند التغيير). و`:25` فيه `selectedTrack` غير مستعمل. ولا يوجد تحذير عند مغادرة الامتحان أثناءه.
- `AdminDashboard.jsx:419`: `ar-SA` يعرض تاريخاً هجرياً، وبقية الصفحة `ar-EG`. و`:420` إلغاء الدعوة بلا تأكيد. و`:216` نص «شاملة Connect Plus والماث» ثابت.
- `myspace/AssignStudents.jsx:85`: `font:'inherit'` يأتي بعد `fontSize` و`fontWeight` فيلغيهما. و`:70` إلغاء الإسناد بلا تأكيد.
- `myspace/TeacherRoster.jsx:28`: بعد رفع التسجيل يبقى اسم الملف ظاهراً في `<input type=file>` غير المتحكَّم به.
- `myspace/WeeklySummaryCard.jsx:68`: فشل النسخ للحافظة بلا رسالة.
- `admin/LessonReview.jsx:48`: يستعمل `prompt()` لسبب الرفض، وقد يكون محجوباً في PWA أو webview. و`admin/RecordingsReview.jsx:44-45` الاعتماد والرفض بلا حالة انشغال وبلا سبب للرفض.
- `LessonEditor.jsx:372`: معاينة YouTube تعالج `watch?v=` فقط. و`Modals.jsx:235` المعامل `start=` يعمل مع YouTube فقط.
- `TeacherStudio.jsx:197` و`LessonEditor.jsx:493`: روابط `href` دون فحص البروتوكول. المصدر هو الطاقم، والخطر منخفض.

---

## الملفات المقروءة كاملة، سطراً بسطر @ `0daa12a`
| الملف | الأسطر |
|---|---|
| src/components/AdminDashboard.jsx | 500 |
| src/components/admin/AdminActivityLog.jsx | 109 |
| src/components/admin/AdminKPICards.jsx | 123 |
| src/components/admin/BookingsPanel.jsx | 152 |
| src/components/admin/FamiliesPanel.jsx | 114 |
| src/components/admin/LessonReview.jsx | 130 |
| src/components/admin/RecordingsReview.jsx | 51 |
| src/components/admin/SiteSettingsPanel.jsx | 628 |
| src/components/admin/curriculum/CurriculumAdmin.css | 886 |
| src/components/admin/curriculum/FileUploader.jsx | 196 |
| src/components/admin/curriculum/GradesPanel.jsx | 329 |
| src/components/admin/curriculum/LessonEditor.jsx | 1162 |
| src/components/admin/curriculum/LessonsPanel.jsx | 283 |
| src/components/admin/curriculum/SubjectsPanel.jsx | 314 |
| src/components/admin/curriculum/index.js | 7 |
| src/components/TeacherStudio.jsx | 210 |
| src/components/teacher/TeacherCurriculum.jsx | 188 |
| src/components/myspace/MySpace.jsx | 269 |
| src/components/myspace/AssignStudents.jsx | 94 |
| src/components/myspace/TeacherRoster.jsx | 204 |
| src/components/myspace/SkillsReport.jsx | 165 |
| src/components/myspace/WeeklySummaryCard.jsx | 117 |
| src/components/Modals.jsx | 604 |
| src/components/ExamGate.jsx | 91 |
| src/components/EmbassyExamSimulator.jsx | 503 |

**مراجع قرأتها جزئياً للتحقق:** `supabase/schema.sql`، `supabase/migrations/20261028090000_teacher_curriculum_workflow.sql`، `20261024120000_phase3_real_data.sql`، `src/context/AppContext.jsx` (`:178-260` و`:720-740`)، `src/context/SiteSettingsContext.jsx`، `src/hooks/useLessonRecordings.js`، `src/index.css` (الثيم)، `src/App.jsx` (الحراس).

> حسب قاعدة المشروع: هذا تقرير تدقيق فقط، ولن يبدأ أي إصلاح قبل أن يقول Yousef «ابدا».
