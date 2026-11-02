import { useEffect, useState } from 'react';
import { getPublicPrivacy } from './privacy';
import type { CorporatePrivacyPolicy } from './privacy';
import './privacy.css';

export default function PrivacyPage(){
  const [policy,setPolicy]=useState<CorporatePrivacyPolicy|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'unpublished'|'error'>('loading');
  useEffect(()=>{
    let active=true;
    void getPublicPrivacy()
      .then(p=>{if(active){setPolicy(p);setStatus(p?'ready':'unpublished');}})
      .catch(()=>{if(active)setStatus('error');});
    return()=>{active=false;};
  },[]);
  return <main className="privacy-public" dir="rtl" lang="ar">
    <header className="privacy-page-top"><a href="./" aria-label="العودة للموقع">← العودة للموقع</a>
      <span>SAEED — CORPORATE</span></header>
    <article className="privacy-document">
      <p className="privacy-eyebrow">DATA PRIVACY</p>
      <h1>بيان الخصوصية</h1>
      {status==='loading'&&<p role="status">جارٍ تحميل البيان المنشور…</p>}
      {status==='unpublished'&&<div className="privacy-unpublished" role="status">
        <h2>لم يُعتمد بيان الخصوصية للنشر بعد</h2>
        <p>لا يوجد نص خصوصية رسمي منشور من إدارة الموقع حاليًا. للتواصل بشأن بيانات طلبات الأسعار، استخدم صفحة التواصل مع الشركة.</p>
        <a href="./contact.html">صفحة التواصل</a>
      </div>}
      {status==='error'&&<p role="alert">تعذّر تحميل بيان الخصوصية. حاول مرة أخرى لاحقًا.</p>}
      {status==='ready'&&policy&&<>
        <section><h2>الجهة المسؤولة</h2><p>{policy.controller_name}</p></section>
        <section><h2>التواصل بشأن الخصوصية</h2><p dir="auto">{policy.privacy_contact}</p></section>
        <section><h2>الغرض من جمع المعلومات</h2><p>{policy.purpose}</p></section>
        <section><h2>مشاركة البيانات والوصول إليها</h2><p>{policy.recipients}</p></section>
        <section><h2>مدة الاحتفاظ</h2><p>المدة المعتمدة لطلبات عروض الأسعار: {policy.retention_days} يومًا.</p></section>
        <section><h2>الاستفسارات وطلبات الحقوق</h2><p>{policy.rights_instructions}</p></section>
        <p className="privacy-updated">تاريخ اعتماد البيان: {policy.approved_at?new Date(policy.approved_at).toLocaleDateString('ar-SA'):'غير محدد'}</p>
      </>}
    </article>
  </main>;
}
