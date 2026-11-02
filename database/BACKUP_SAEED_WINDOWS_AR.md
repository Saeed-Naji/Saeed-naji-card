# نسخة احتياطية قبل حذف نظام Saeed القديم — Windows

> **مهم:** المشروع المقصود فقط هو **Saeed Naji**، معرّف Supabase: `afrvoshsiqartsketiuv`.
> لا تستخدم مشروع `quwqffoomwujqhcxhjnx` الخاص بـFlower Light القديم ولا أي اتصال آخر.
> **الحذف لم يُنفّذ.** ملف التنظيف منفصل ولا يجب تشغيله قبل التحقق من النسخة الاحتياطية.

## لماذا يجب أخذ نسخة أولًا؟

فحص قاعدة Saeed أعطى: 15 جدولًا قديمًا و23 دالة عامة، و3 حسابات Auth، و3 Buckets تحوي 65 سجل ملف، ووظيفة Edge Function واحدة، ومهمة Cron قديمة.
القاعدة تحتوي أيضًا **4 جداول للموقع الجديد** و4 منتجات توضيحية. المطلوب الاحتفاظ بالجديد عند تنظيف القديم.

## الخطوات على Windows بالترتيب

1. افتح [Supabase — Saeed](https://supabase.com/dashboard/project/afrvoshsiqartsketiuv) وتأكد من الاسم ومعرّف المشروع أعلى الصفحة.
2. ثبّت [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) و[Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (إذا لم يكونا موجودين).
3. افتح PowerShell أو Windows Terminal. افحص `supabase --version` و`supabase db dump --help` للتأكد من عمل الأوامر.
4. أنشئ مجلدًا خاصًا غير مشترك على الكمبيوتر، مثل `C:\Saeed-DB-Backup`. لا ترفعه إلى GitHub ولا إلى محادثة عامة.
5. من لوحة Saeed اضغط **Connect** واحصل على Database Connection String الخاص **بنفس المشروع**. استخدم اتصال Session Pooler عند الحاجة. احتفظ بكلمة المرور محليًا فقط، ولا ترسلها إلى ChatGPT ولا تضعها في GitHub.
6. داخل المجلد نفذ أوامر النسخ الثلاثة، بعد استبدال `<CONNECTION_STRING>` بسلسلة اتصالك **السرية**:

   ```powershell
   supabase db dump --db-url "<CONNECTION_STRING>" -f roles.sql --role-only
   supabase db dump --db-url "<CONNECTION_STRING>" -f schema.sql
   supabase db dump --db-url "<CONNECTION_STRING>" -f data.sql --use-copy --data-only
   ```

7. افحص نجاح الأوامر (Exit Code صفر)، وافتح الملفات للتأكد من أنها ليست فارغة أو مقطوعة:

   ```powershell
   Get-Item roles.sql, schema.sql, data.sql | Select-Object Name, Length
   ```

   **وجود الملفات لا يثبت قابلية استعادتها**؛ جرّب استعادتها في بيئة اختبار إذا أمكن.

8. **الصور والملفات:** تصدير قاعدة PostgreSQL لا ينسخ المحتوى الفعلي لملفات Supabase Storage. افتح [Storage لمشروع Saeed](https://supabase.com/dashboard/project/afrvoshsiqartsketiuv/storage/buckets)، واحتفظ بنسخة من محتويات Buckets الثلاثة. قارِن ملفاتك مع عدد السجلات الأصلي 65. نزّل الملفات باستخدام واجهة Storage أو واجهة Storage API المعتمدة، وليس حذفًا مباشرًا من جدول `storage.objects`.
9. احتفظ أيضًا بإعدادات Auth/SMTP ونسخة مصدر وظيفة `manage-admin-account` من [Edge Functions](https://supabase.com/dashboard/project/afrvoshsiqartsketiuv/functions) إذا كنت تريد إمكانية استعادة المشروع القديم. وراجع إعدادات Cron في قاعدة البيانات.
10. نفذ ملف القراءة فقط [SAEED_PRE_CLEANUP_READ_ONLY.sql](SAEED_PRE_CLEANUP_READ_ONLY.sql) للتأكد من أن عدد الجداول والملفات لم يتغير منذ النسخة. إذا تغيّر شيء، افحص الفرق.
11. بعد **اكتمال النسخة الاحتياطية واختبار الاستعادة**، راجع ملف [FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql](FINAL_REMOVE_LEGACY_SAEED_REVIEW_FIRST.sql) ثم شغّله يدويًا فقط عبر [SQL Editor لمشروع Saeed](https://supabase.com/dashboard/project/afrvoshsiqartsketiuv/sql/new). سيزيل كائنات النظام السابق المسمّاة صراحة ويحافظ على `corp_*`.
12. افحص `public` وRLS والمنتجات والتخزين بعد التنظيف. لا تنس تنظيف الملفات والخدمات القديمة عبر الأدوات المخصصة عند اكتمال انتقال جميع العملاء.

## ما لا يمسه ملف تنظيف SQL

- حسابات Supabase Auth (يُعاد اختيار مدير جديد لاحقًا).
- محتويات Buckets وملفات Storage. حذف الملفات يجب أن يستخدم Storage API أو لوحة Storage، وليس `DELETE FROM storage.objects`.
- Edge Functions والتكوين والـAPI keys.
- جداول `corp_*` الجديدة الخاصة بالموقع المؤسسي.

## لماذا لم يحذف المساعد الجداول مباشرة؟

أداة التنفيذ منعت مسح البيانات القديم الشامل. لا ينبغي تجاوز هذا الحظر بعمليات حذف صغيرة متتابعة؛ لذا أعددنا فحصًا وملف تنظيف صريحًا ومحدودًا مع نسخ احتياطي مسبق، بدل ادعاء تنفيذ الحذف.

المصدر الرسمي: [Supabase Backup & Restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
