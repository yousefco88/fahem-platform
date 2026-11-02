# تقوية سلامة الاشتراكات — المرحلة 1 (محلي فقط، 2026-11-03)

**الحالة:** review. لا اتصال بالإنتاج، لا commit/push، لا نشر. المرحلتان 2 و3 لم تبدآ.

## العيوب الثلاثة — الدليل قبل/بعد
تشغيل `bash tests/sql/run_subscription_safety.sh --baseline` (بدون الترحيل الجديد) → **EXIT=1**:
1. **منحتان متزامنتان لنفس الطفل:** `granted` + `granted` ← `GRANT RACE FAILED: 2 active overlapping contracts (expected 1)`. السبب: فحص التداخل في `admin_grant_child_contract` بلا قفل.
2. **خصم مباشر قبل قفل 48 ساعة:** `[direct debit before the 48h lock is refused] expected failure but statement succeeded`. `post_live_attendance_debit` لا يفحص `live_attendance_lock_at`.
3. **سبب التصحيح غير محفوظ:** `teacher_live_attendance_audit` ليس فيها عمود سبب أصلاً (20261030224921)، و`admin_correct_live_attendance` تعيد `reason` في الاستجابة فقط. (في baseline توقف السكربت عند العيب 2 قبل هذا التأكيد.)

تشغيل `bash tests/sql/run_subscription_safety.sh` (fixed) → **EXIT=0**:
```
 granted
ERROR:  child already has an active contract (...) overlapping this period and coverage
ok  grant race: one contract granted, concurrent overlap refused
ok  direct debit before the 48h lock is refused
ok  pre-lock admin correction does not post
ok  correction reason persisted (trimmed) in audit
ok  locked correction still reposts
ok  locked correction reason persisted
ok  600-20 = 580 after second correction
Isolated subscription safety acceptance passed (fixed).
```

## الإصلاح — `supabase/migrations/20261106100000_subscription_safety_hardening.sql` (جديد)
- المنح: `select … from children where id = p_child_id for update` قبل فحص التداخل → تسلسل كل المنح للطفل نفسه (READ COMMITTED مفروض أصلاً عبر `assert_ledger_admin`). باقي المنطق كما هو.
- الخصم: قفل صف الحضور `for update` + رفض `55000 'not locked yet'` قبل `live_attendance_lock_at`. المسح الآلي يختار المقفل فقط فلا يتأثر.
- تصحيح المدير: عمود `reason` جديد (nullable) يُكتب بعد trim؛ قبل القفل يُدقَّق ويُحدَّث دون ترحيل (`ledger.status = 'pending_lock'`)، بعد القفل يعيد الترحيل كما كان.
- لم تُعدَّل أي migration تاريخية؛ المنح/GRANT كما هي؛ قواعد الرصيد/العكس دون تغيير.

## اختبارات أخرى
- `bash tests/sql/run_subscription_hour_ledger.sh` → EXIT=0 (`Isolated hour-ledger acceptance passed.`؛ يعمل على المخطط قبل الترحيل الجديد).
- `node --test src/lib/*.test.js` → 101 pass / 0 fail. `npm run api:test` → 4/4. `npm run build` → 0. `git diff --check` نظيف.

## قيود ومتبقٍّ
- اختبارات الدفتر القديمة (`subscription_hour_ledger.sql` وسباقها) تستدعي الخصم على حضور غير مقفل؛ ستفشل لو طُبِّق الترحيل الجديد قبلها — هذا تغيير سلوك مقصود؛ تحتاج تحديثاً لاحقاً لاستخدام تواريخ مقفلة.
- مسارات تعديل `teacher_live_attendance` بالكتابة المباشرة غير ممنوحة (select فقط)، فلا مسار شقيق آخر.
- لم يُختبر على Supabase مستضاف ولا PostgREST؛ تحتاج مراجعة أمنية مستقلة وتفويض إصدار منفصل.
