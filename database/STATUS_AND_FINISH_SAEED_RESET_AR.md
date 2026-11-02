# حالة إعادة بناء قاعدة Saeed Naji — 2 نوفمبر 2026

المشروع الوحيد المعني هنا: **`afrvoshsiqartsketiuv`**، وليس قاعدة Flower Light في حساب Basair-Alkhalij.

## ما نُفذ فعلاً على Supabase

- تم تنفيذ Migration باسم `saeed_corporate_initial_tables_and_rls` بنجاح.
- الجداول الجديدة: `corp_admin_members`, `corp_products`, `corp_business_info`, `corp_quote_requests`.
- فُعّل RLS على الجداول الأربعة، مع منع `anon` من إدراج المنتجات، إضافة مدير، أو قراءة طلبات التسعير.
- أُدخلت **أربعة منتجات تجريبية مصنّفة بوضوح**؛ لا تمثل منتجًا تجاريًا معتمدًا.
- بيانات المنشأة محفوظة بوضع **غير منشور** `is_published=false`.
- لا يوجد مدير مصرح له في `corp_admin_members` حتى الآن.

## ما لم يُحذف بعد

الحذف الآلي الشامل لم تنفذه أدوات المساعد بعد رفض الأمان للعملية؛ **لا تدّعِ أن القاعدة قد مُسحت**. بقيت 15 جدولًا من النظام القديم، و23 دالة `public` مرتبطة به، ومهمة Cron قديمة. خارج الجداول هناك 3 حسابات Auth و3 Storage buckets تحوي 65 ملفًا، وEdge Function باسم `manage-admin-account`.

**لا تنفّذ ملف `RESET_SAEED_PUBLIC_FOR_CORPORATE.sql` القديم**. أصبح غير صالح بعدما أُنشئت الجداول الجديدة؛ سيُعرض تنبيه إيقاف فقط. استخدم الملف المستحدث `FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql` بعد أخذ النسخة الاحتياطية ومراجعته. هذا الملف يمسح الجداول والدوال القديمة المسمّاة صراحة، ويبقي جداول `corp_*` الجديدة.

## ترتيب إكمال المسح (يدوي بعد النسخ الاحتياطي)

1. احفظ نسخة احتياطية يمكن استعادتها من **Saeed Naji فقط**، لا من مشروع Flower Light الآخر. يوصي Supabase CLI بأخذ `roles.sql` و`schema.sql` و`data.sql` بوساطة `supabase db dump`؛ راجع [تعليمات Supabase الرسمية](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). لا ترسل كلمة مرور قاعدة البيانات في المحادثة أو إلى GitHub.
2. احفظ ملفات Storage الأصلية في جهازك؛ نسخ SQL لا يحفظ محتويات الملفات. راجع حسابات Auth (3 حاليًا) والوظائف Edge Function والـCron قبل الحذف.
3. افتح [SQL Editor لمشروع Saeed](https://supabase.com/dashboard/project/afrvoshsiqartsketiuv/sql/new)، راجع ثم نفّذ **فقط** `FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql`. يحمل فحوصات أسماء الجداول والدوال، ويفشل إن تغيّر الشكل المتوقع.
4. تحقق من أن `public` يحوي جداول `corp_*` فقط، وأن السياسات الخاصة بها لا تزال موجودة. افحص Safety Advisors و`cron.job` وStorage policies.
5. بعد حفظ نسخ من الملفات، احذف ملفات Buckets القديمة بوساطة واجهة Storage أو API المخصص للتخزين (وليس `DELETE FROM storage.objects`؛ هذا قد يترك ملفات يتيمة)، ثم احذف Buckets القديمة إذا لم تعد مطلوبة.
6. احذف وظيفة Edge Function القديمة **بعد** التأكد من عدم استخدام أحد لها. حسابات Auth القديمة تُراجع من Authentication → Users، وتحذف/تعاد تهيئتها فقط إذا تقرر عدم استخدامها؛ لا تنفذ حذفًا شاملًا من SQL.
7. أنشئ مستخدم المدير المقصود أو اختر حسابه من قائمة Auth Users، وانسخ UUID الصحيح. ثم في SQL Editor لنفس المشروع:
   `insert into public.corp_admin_members(user_id) values ('PUT-VERIFIED-ADMIN-UUID-HERE');`
   لا تعتمد هوية المدير بالاسم أو البريد فقط، ولا تمنح أي مستخدم حق التسجيل في الجدول.
8. بعد نجاح مراجعة الصلاحيات وإزالة الخدمات القديمة، أضف في GitHub Actions Variables لمستودع `Saeed-Naji/Saeed-naji-card` المتغيرين `CORP_SUPABASE_URL` و`CORP_SUPABASE_PUBLISHABLE_KEY`، ثم أعد النشر. **استعمل publishable فقط**، ولا تستخدم secret أو service_role.
9. اختبر `?admin=1`: يجب منع غير المدير، والسماح للمدير المعتمد بإنشاء منتج مخفي وحفظه. لا تنشر طلبات العملاء قبل إضافة Edge Function محمية من إساءة الاستخدام.

## فحص الوصول الذي نجح

استعلام بدور `anon` أعاد **4 منتجات تجريبية ظاهرة**، و**0 صفوف من معلومات الشركة غير المنشورة**؛ ولم تكن لديه صلاحية إدراج منتج أو عضو إدارة أو قراءة الطلبات. هذه نتائج أولية، ولا تحل محل اختبار دخول مدير حقيقي بعد الإعداد.

## ملاحظة أمان

مراجعة Security Advisors ما زالت تكشف تحذيرات من **دوال النظام القديم**، لا من جداول `corp_*`. ينبغي إعادة الفحص بعد تنظيف الخدمات القديمة، لا تفعيل الموقع الجديد عليها مباشرة دون معالجة.
