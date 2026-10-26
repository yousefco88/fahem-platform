# تدقيق ما قبل الإطلاق — الواجهة (الثيم/التنقل/الادعاءات الثابتة)

- **HEAD:** `0daa12a` (`git rev-parse --short HEAD`) · شجرة العمل نظيفة (`git status --short` بلا مخرجات قبل كتابة هذا الملف).
- **النطاق:** قراءة كود فقط — بلا متصفح، بلا قاعدة بيانات. لذلك القيم المعروضة فعلياً قد تختلف إن وُجد صف `site_settings` يتجاوز `siteDefaults.js` (يجب فحصه قبل أي تعديل).
- **المرجع:** guardrails فاهم (سياسة صفر وهمي + فحص المحاور الأربعة) و`docs/جرد-الثوابت-في-الكود.md`.

## 🔴 أولوية 1 — ادعاءات غير مُثبتة / تعارض مع سياسة صفر وهمي

| # | المشكلة | الموقع | الدليل | الحل المقترح |
|---|---------|--------|--------|--------------|
| 1 | شريط «Social proof» مكتوب في JSX وليس في الإعدادات، ويدّعي ميزات غير مُفعّلة | `src/components/landing/HeroSection.jsx:111-125` | «📼 أرشفة ذكية لكل حصة» بينما `siteDefaults.js:60` نفسه يقول الأرشفة «قيد التطوير»؛ «مجموعات مصغرة (4 طلاب)» وعد تشغيلي لا يفرضه أي كود | نقله إلى `settings.hero` (مثلاً `hero.proofItems`) وتلطيف الصياغة أو حذف بند الأرشفة |
| 2 | نص الهيرو الافتراضي يحمل وعوداً مطلقة | `src/data/siteDefaults.js:19` | «نخبة المعلمين المتخصصين، أرشفة ذكية دائمة لكل حصة، وإتقان تام للمنهج الوزاري وامتحانات السفارة» — يناقض الشارة في السطر 16 «محتوى تجريبي قيد المراجعة» | صياغة صادقة متسقة مع الشارة |
| 3 | «المنصة المتخصصة الأولى» ادعاء تفوّق بلا مصدر | `src/data/siteDefaults.js:24` (footer.about) | «المنصة المتخصصة الأولى لأبنائنا بالخارج…» | حذف «الأولى» و«إتقان تام» |
| 4 | وصف SEO يكرر وعد الأرشفة | `src/data/siteDefaults.js:34` + `src/routes.js:32` | «أرشفة ذكية» / «بحصص مباشرة ومسجلة» | مواءمة مع حالة الميزة الفعلية |
| 5 | عنوان فرعي للمقارنة يدّعي اعتماداً | `src/data/siteDefaults.js:44` | «الاحتراف المؤسسي المعتمد» — والـ FAQ `:116` يقرّ بأن المحتوى غير معتمد | إزالة «المعتمد» |
| 6 | وعد «إتقان بنسبة 100%» داخل المحاكي | `src/components/EmbassyExamSimulator.jsx:206` | «فلسفة «فاهم» تضمن… الإتقان بنسبة 100%» | تلطيف («نهدف إلى الفهم») |
| 7 | المعاينة في الهيرو تصف التقارير بـ«حقيقية» و«بنمط الامتحان الرسمي» | `HeroSection.jsx:94,99` | نص ثابت في JSX خارج الإعدادات؛ والمحاكي موصوف في `routes.js:44` بأنه «غير رسمي» | توحيد الصياغة («غير رسمي») ونقلها للإعدادات |
| 8 | سجل نشاط الإدارة بصفوف مثال (من جرد الثوابت، غير مُعاد فحصه سطراً بسطر هنا) | `src/components/admin/AdminActivityLog.jsx:9` | الجرد يصنّفه «صفوف وهمية صريحة» | إخفاء أو بناء `activity_log` حقيقي |

## 🟠 أولوية 2 — أخطاء وظيفية/بيانات في الواجهة

| # | المشكلة | الموقع | الدليل | الحل |
|---|---------|--------|--------|------|
| 9 | القيمة الافتراضية لا تطابق أي `<option>` (select مُتحكَّم) ⇒ إن لم يغيّر المستخدم القائمة يُحفظ «السعودية» و«الصف الأول الابتدائي» بينما الواجهة تعرض خياراً آخر | `src/components/landing/BookingSection.jsx:15-16` مقابل `:129-134` و`:163-166` | `useState('السعودية')` بينما الخيارات «🇸🇦 المملكة العربية السعودية»…؛ `useState('الصف الأول الابتدائي')` بينما الخيارات «الصف الأول الابتدائي (المنهج العام)»… | إضافة `value` صريح لكل option ومطابقة الافتراضي |
| 10 | عمود `country_code` يستقبل نصاً عربياً بعلم emoji لا رمز دولة | `BookingSection.jsx:35` | `country_code: selectedCountry` | `value="SA"` … مع العرض بالعربي |
| 11 | حقلا الرقم/الدولة في شبكة `1fr 1fr` ثابتة بلا كسر للجوال | `BookingSection.jsx:105,139` | `gridTemplateColumns: '1fr 1fr'` inline — لا media query تلغيه | `repeat(auto-fit,minmax(220px,1fr))` أو class بـ @media |
| 12 | `<select>` بلا `color` ⇒ نص داكن افتراضي على `--card-bg` الداكن في الوضع الليلي | `BookingSection.jsx:125,159` | يُحدَّد `background: var(--card-bg)` فقط | إضافة `color: 'var(--navy)'` |
| 13 | خيارات الصف في نموذج الحجز ثابتة (G1/KG/G2) بينما CMS يحوي g1–g6 | `BookingSection.jsx:163-166` | قائمة صلبة | مقبولة حسب الجرد (#9 حقول الحجز) لكن تتناقض مع المراحل المنشورة — قرار يوسف |
| 14 | توست «تم تحميل التقرير بنجاح» — يجب التحقق أنه يأتي بعد إنشاء ملف فعلي؛ و`hoursStudied: 0` ثابت | `src/components/ParentDashboard.jsx:97,102` | `hoursStudied: 0 // Future` يُطبع في التقرير كأنه قياس | عرض «—» بدل 0 أو حذف الحقل |
| 15 | `/lessons` له SCREEN_META لكنه Navigate إلى `/child`؛ و`onboarding` في SCREEN_PATHS يحوّل إلى `/account` | `src/routes.js:9,52` · `src/App.jsx:90,118` | مدخلات ميتة في مصدر الحقيقة | تنظيف أو توثيق كـ alias |
| 16 | `OnboardingFlow.jsx` ما زال موجوداً ويصدر توست «نموذج محلي» لكن المسار محوّل | `src/components/OnboardingFlow.jsx:90` · `App.jsx:118` | لا Route يعرضه | حذفه أو إعادة ربطه (كود ميت) |
| 17 | قائمة «المزيد» في الجوال غير متاحة للوحة المفاتيح/القارئ: لا `role="dialog"`/`aria-modal`، لا Escape، لا إعادة تركيز؛ زر الإغلاق «✕» بلا `aria-label`؛ زر «المزيد» بلا `aria-expanded` | `src/components/BottomNav.jsx:31-46,86-95` | — | إضافة السمات ومعالج Escape |
| 18 | `role="menu"` في SideNav بلا تنقل بالأسهم (ARIA menu يعد بسلوك غير منفّذ) | `src/components/SideNav.jsx:87-89` | — | إزالة role=menu/menuitem واستخدام قائمة أزرار عادية |
| 19 | CTA العائم بنص ثابت خارج الإعدادات، و`<style>` يُحقن مع كل render، ويتداخل موضعه `bottom:16px` مع BottomNav (64px+safe-area) | `src/components/landing/StickyMobileCta.jsx:28,40,43-47` · `index.css:875-888` | — | ربط النص بـ `hero.ctaPrimary`، نقل CSS إلى index.css، حساب bottom فوق الشريط |
| 20 | `FaqSection`/`Subjects`/`Comparison` تستخدم `key={i}` على قوائم يحررها الإدمن | `FaqSection.jsx:22` · `SubjectsSection.jsx:24` · `ComparisonSection.jsx:32` | — | مفاتيح ثابتة (q/title) |
| 21 | زر FAQ بلا `aria-expanded`/`aria-controls` | `FaqSection.jsx:28-35` | — | إضافة السمتين |
| 22 | جدول المقارنة بعرض 100% بلا حاوية تمرير أفقي ⇒ ضغط النص على 360px | `ComparisonSection.jsx:21-22` | `overflow: hidden` على الحاوية | `overflowX: auto` |

## 🟡 أولوية 3 — الثيم والتناسق

| # | المشكلة | الموقع |
|---|---------|--------|
| 23 | ألوان حرفية خارج متغيرات الوضعين: `#0f172a`/`#f8fafc`/`#1e293b` (Footer)، `#1e3a8a→#2563eb` و`#dbeafe` (Booking)، `#ea580c` (SubjectLessons)، نقاط النافذة `#f87171…` (Hero) | `FooterSection.jsx:11,27,37,46` · `BookingSection.jsx:50,64` · `child/SubjectLessons.jsx:115` · `HeroSection.jsx:80-82` — ألوان الهبوط مقبولة بقرار (#10 في الجرد) لكن `SubjectLessons:115` ليس صفحة هبوط ⇒ يُنقل لمتغير |
| 24 | لون شريط `theme-color` في ThemeContext (`#0f172a`/`#2563eb`) حرفي ومكرر مع index.css | `src/context/ThemeContext.jsx:22` |
| 25 | ThemeContext يكتب `fahem-theme` دائماً في useEffect الأول ⇒ مستمع تغيّر تفضيل النظام (`:31`) لا يعمل أبداً | `ThemeContext.jsx:21,31` |
| 26 | `.side-nav-brand-text small` fallback `#64748b` بينما `--muted` معرف أصلاً — لا ضرر، تنظيف | `src/index.css:933` |
| 27 | شعار SideNav ونصه ثابتان («منصة فاهم»، «التعليم الحي…») بينما Footer يقرأ `header.brandName` | `SideNav.jsx:63-64` · `FooterSection.jsx:19` |
| 28 | تسمية «اشتراكي» في التنقل لـ`/pricing` للزائر توحي باشتراك موجود (لا نظام اشتراك؛ المدفوعات مجمّدة) | `src/navigation/navConfig.js:7,22` → «الباقات» |
| 29 | روابط الفوتر ثابتة في JSX وتعرض «لوحة ولي الأمر» للزائر (ستقوده للبوابة — سلوك مقبول) | `FooterSection.jsx:29-32` |
| 30 | لهجة: «الكريم»، «البطل»، «أستاذ» في النطق الصوتي — مقبولة؛ مثال الرقم سعودي `+966` مقبول (السوق خليجي) | `BookingSection.jsx:44,93,112` |

## ✅ ثابت سليم / صادق (لا يُعد مخالفة)

- `routes.js` (11 شاشة + `screenFromPath` بالبادئة) و`navConfig.js` (أدوار guest/parent/teacher/content_editor/admin، كل id مسجل في routes) — إعدادات تنقل لا بيانات.
- `ADMIN_SECTIONS` بأدوار؛ الإنفاذ الفعلي في RLS كما يذكر التعليق `navConfig.js:62`.
- متغيرات الثيم في `index.css:7-43` و`:71-97` معرّفة للوضعين؛ safe-area مطبق `index.css:542,561,877,1043`؛ `theme-fab:focus-visible` `:1037`.
- `SubjectsSection.jsx:14` العدد مشتق من `items.length` ✓.
- `TestimonialsSection` بلا شهادات وبإفصاح صريح `siteDefaults.js:102` ✓.
- FAQ `siteDefaults.js:115-116` يقر بأن المحتوى غير معتمد ✓؛ الأسعار «قيد الدراسة»/«—» `:145,161` ✓.
- نموذج الحجز يكتب فعلاً في `bookings` ويُظهر النجاح فقط عند غياب الخطأ، ويقول «لا يُعد تأكيداً نهائياً» `BookingSection.jsx:30-45,79` ✓.
- توستات الإدارة (`BookingsPanel.jsx:51`، `AdminDashboard.jsx:126,159`) تتبع عمليات حقيقية ✓؛ `TeacherStudio.jsx:75` توجيه صادق ✓؛ بوابة ولي الأمر `Modals.jsx:110` بعد تحقق فعلي ✓.
- SiteSettingsContext fail-safe إلى SITE_DEFAULTS ✓؛ لا `href="#"` ولا `javascript:void` في `src` ✓.
- AITutor ودرس الباء التجريبي مُفصَح عنهما (الجرد #6–7).

## جرد الشاشات (App.jsx:74-121)

`/` هبوط · `/parent` (AuthGate parent/admin) · `/child/*` (مفتوح، درس تجريبي) · `/teacher` و`/teacher/curriculum/*` · `/admin/*` (admin/content_editor) · `/analytics` (teacher/admin) · `/ai-tutor` · `/exam` (ExamGate) · `/pricing` · `/account` · تحويلات: `/lessons→/child`, `/onboarding→/account`, `*→/`.

## الملفات المفحوصة

`src/routes.js`, `src/App.jsx`, `src/navigation/navConfig.js`, `src/components/BottomNav.jsx`, `src/components/SideNav.jsx`, `src/context/ThemeContext.jsx`, `src/context/SiteSettingsContext.jsx`, `src/data/siteDefaults.js`, `src/index.css`, `src/components/landing/{HeroSection,SubjectsSection,ComparisonSection,FooterSection,FaqSection,TestimonialsSection,StickyMobileCta,BookingSection}.jsx`, `src/components/PricingPlans.jsx`, `src/components/account/account.css`, `src/components/child/ChildHome.css`, `src/components/admin/curriculum/CurriculumAdmin.css`، ومقاطع grep من `ParentDashboard.jsx`, `Modals.jsx`, `EmbassyExamSimulator.jsx`, `OnboardingFlow.jsx`, `AppContext.jsx`, `TeacherStudio.jsx`, `AdminDashboard.jsx`, `BookingsPanel.jsx`, `child/SubjectLessons.jsx`؛ الوثائق: `docs/جرد-الثوابت-في-الكود.md`, `.hermes/plans/2026-10-23_fahem-platform-overhaul.md`.

## حدود التدقيق

- لم يُفتح متصفح ولا قاعدة بيانات: عرض الجوال الفعلي وتجاوزات `site_settings` غير مُتحقق منها.
- لم تُقرأ كل لوحات الإدارة/المعلم سطراً بسطر؛ البند 8 منقول من الجرد.
