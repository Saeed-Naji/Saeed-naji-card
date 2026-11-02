# FLOWER LIGHT — الموقع المؤسسي المستقل

![Build status](https://github.com/Saeed-Naji/Saeed-naji-card/actions/workflows/pages.yml/badge.svg)

**الإصدار الحالي: v0.4 (تأسيس الإدارة السحابية غير المفعّلة بعد)**

**رابط المعاينة:** https://saeed-naji.github.io/Saeed-naji-card/

هذا مشروع جديد ومستقل تمامًا عن `Basair-Alkhalij/Flower-light` ومشروع Supabase القديم.

## ما تم نشره

أصبح الموقع منشورًا عبر **React 19 + TypeScript + Vite**، وليس نسخة HTML المؤقتة السابقة، مع الاحتفاظ بالصفحات المؤسسية المنفصلة:

- الرئيسية والكتالوج: https://saeed-naji.github.io/Saeed-naji-card/
- من نحن: https://saeed-naji.github.io/Saeed-naji-card/about.html
- الخدمات: https://saeed-naji.github.io/Saeed-naji-card/services.html
- المشاريع: https://saeed-naji.github.io/Saeed-naji-card/projects.html
- التواصل: https://saeed-naji.github.io/Saeed-naji-card/contact.html

وظائف المعاينة: بحث وفلاتر تابعة، قائمة طلبات بكميات تُكتب يدويًا، تصدير Excel أصلي XLSX، معاينة داتا شيت والطباعة أو حفظ PDF عبر المتصفح. دون إعداد اتصال سحابي، تبقى المنتجات التجريبية ضمن وضع المعاينة.

**البيانات والشهادات والمشاريع والصور هي للتوضيح وغير معتمدة.** بعض الصفحات لا تستقبل نماذج تواصل، والطلبات لا تصل إلى شركة تلقائيًا. بيانات الشركة الرسمية لم تُعتمد في المشروع الجديد.

## بنية المشروع

- `react-app/`: مصدر React/TypeScript وVite واختبارات منطق الكتالوج وتصدير XLSX.
- `about.html`, `services.html`, `projects.html`, `contact.html`: صفحات مؤسسية.
- `pages.css`: تنسيق الصفحات المستقلة.
- `database/SCHEMA_PROPOSAL_NOT_APPLIED.sql`: المرجع الأساسي للمخطط الجديد؛ **طُبقت الجداول الأربعة وRLS على مشروع Saeed** بالهجرة `saeed_corporate_initial_tables_and_rls`.
- `database/STATUS_AND_FINISH_SAEED_RESET_AR.md`: سجل التنفيذ الفعلي ومهام الإزالة النهائية والتحقق.
- `database/CLOUD_ADMIN_SETUP_AR.md`: خطوات إعداد قاعدة جديدة وصلاحيات المدير.
- `react-app/src/cloud.ts` و`cloud-admin.tsx`: طبقة قاعدة البيانات ولوحة المدير المحمية بالمصادقة وعضوية الإدارة، **مغلقة إلى حين توفير إعدادات المشروع الجديد**.
- `.github/workflows/pages.yml`: تثبيت التبعيات المغلقة واختبارات React ثم النشر.
- `tests/static-pages.mjs`: فحص روابط الصفحات وملفاتها.

## التشغيل المحلي

```bash
cd react-app
npm ci
npm run typecheck
npm run test:core
npm run build
npm run dev
```

تعمل واجهة `?admin=preview` **في بيئة التطوير Vite فقط**، ولا تُفعّل على GitHub Pages. هي محرر محتوى محلي غير مؤمّن، وليست لوحة إدارة إنتاجية.

## ربط Saeed Supabase — v0.5

- تم تجهيز النشر لقراءة البيانات من مشروع **`afrvoshsiqartsketiuv`** (Saeed Naji) باستخدام مفتاح `sb_publishable_` العام فقط، مع فحص آلي يرفض رابط أي مشروع آخر.
- بعد نجاح CI ونشر هذا التعديل، سيقرأ كتالوج React جداول `corp_products` و`corp_business_info` من قاعدة Saeed. عند فشل الاتصال لا يعود إلى منتجات محلية قديمة.
- **لوحة المدير ليست جاهزة للدخول بعد**: عدد أعضاء `corp_admin_members` صفر، ولا نمنح حسابًا قديمًا صلاحية إدارة تلقائيًا. يحتاج تحديد حساب المالك واعتماد عضويته بعد التحقق.
- بقيت 15 جدولًا قديمًا وموارد Auth/Storage/Edge Function في مشروع Saeed؛ تنظيفها مرهون بنسخة احتياطية خارج القاعدة وقابلة للاستعادة. لم يُنفّذ الحذف الشامل.
- **لا تستخدم أبدًا** مفاتيح `sb_secret_` أو `service_role` في الموقع. مفتاح `sb_publishable_` عام بطبيعته، والأمان الحقيقي في سياسات RLS.

## ما لم يُفعّل بعد

- تجهيز وتنظيف ما تبقى من جداول Saeed القديمة (ما زالت 15 جدولًا) بعد نسخة احتياطية؛ أُنشئت بالفعل الجداول الأربع الجديدة واختُبرت قراءة الزائر إليها.
- اعتماد مدير محدد في جدول `corp_admin_members` بعد التحقق من هويته. مسار `?admin=1` لا يمنح صلاحيات بمجرد فتحه.
- حفظ المنتجات والإعدادات في قاعدة جديدة حقيقية (الكود جاهز، التشغيل الفعلي غير مختبر حتى الآن).
- تخزين صور المنتجات في Storage مع سياسات وصول محكمة.
- استقبال الطلبات عن طريق Edge Function مؤمنة بالتحقق والحد من إساءة الاستخدام.
- اعتماد المنتجات والمواصفات الرسمية واختبارات المتصفح والجوال الكاملة.

**مهم:** لم تُمس قاعدة Flower Light في حساب Basair-Alkhalij. طُبق SQL غير مدمّر على **مشروع Saeed Naji** `afrvoshsiqartsketiuv`، ولا تزال جداول نظامه السابق موجودة بانتظار تنظيف يدوي بعد النسخ الاحتياطي. **لم تُنشر مفاتيح سرية، والربط السحابي بالموقع العام لم يُفعّل بعد**.
