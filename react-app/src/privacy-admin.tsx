import { useEffect, useState } from 'react';
import { cloudClient } from './cloud';
import { privacyColumns, publicationIssues } from './privacy';
import type { CorporatePrivacyPolicy } from './privacy';
import './privacy.css';

const newDraft:CorporatePrivacyPolicy={
  singleton:true,controller_name:'',privacy_contact:'',purpose:'',recipients:'',
  rights_instructions:'',retention_days:null,is_published:false,
  approved_at:null,updated_at:''
};

export function PrivacyAdmin(){
  const [draft,setDraft]=useState<CorporatePrivacyPolicy|null>(null);
  const [wasPublished,setWasPublished]=useState(false);
  const [approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    if(!cloudClient)return;
    void cloudClient.from('corp_privacy_policy').select(privacyColumns)
      .eq('singleton',true).maybeSingle().then(({data,error:loadError})=>{
        if(!active)return;
        if(loadError){setError('تعذّر قراءة إعدادات الخصوصية.');return;}
        const row=(data??newDraft) as CorporatePrivacyPolicy;
        setDraft(row);setWasPublished(row.is_published);
      });
    return()=>{active=false;};
  },[]);
  function setField<K extends keyof CorporatePrivacyPolicy>(field:K,value:CorporatePrivacyPolicy[K]){
    setDraft(p=>p?{...p,[field]:value}:p);
    setApproved(false);setNotice('');
  }
  async function save(publish:boolean){
    if(!cloudClient||!draft||busy)return;
    if(publish){
      const issues=publicationIssues(draft);
      if(issues.length){setError(issues.join(' '));return;}
      if(!approved){setError('يجب تأكيد المراجعة والاعتماد قبل النشر.');return;}
      if(!confirm('هل راجعت جميع بيانات سياسة الخصوصية وتوافق على نشرها للزوار؟'))return;
    }else if(wasPublished&&!confirm('سيتم إخفاء بيان الخصوصية المنشور عن الزوار. هل تريد حفظه كمسودة غير منشورة؟'))return;
    setBusy(true);setError('');setNotice('');
    const payload:CorporatePrivacyPolicy={
      ...draft, singleton:true,is_published:publish,
      approved_at:publish?new Date().toISOString():null,
      updated_at:new Date().toISOString()
    };
    try{
      const {data:saved,error:saveError}=await cloudClient.from('corp_privacy_policy')
        .upsert(payload,{onConflict:'singleton'})
        .select(privacyColumns).single();
      if(saveError||!saved||saved.is_published!==publish)throw saveError??new Error('No row changed');
      setDraft(saved as CorporatePrivacyPolicy);setWasPublished(publish);setApproved(false);
      setNotice(publish?'نُشر بيان الخصوصية بعد اعتمادك.':'حُفظت المسودة دون نشر.');
    }catch{setError('تعذّر حفظ بيان الخصوصية. تحقق من صلاحيات المالك واتصال Supabase.');}
    finally{setBusy(false);}
  }
  return <section className="cloud-panel privacy-admin" aria-label="إعدادات الخصوصية" dir="rtl">
    <h2>بيان الخصوصية ومدة الاحتفاظ</h2>
    <p className="cloud-note">أنشئ نصًا معتمدًا لهذا المشروع فقط. لا توجد مدة احتفاظ مفروضة تلقائيًا، ولا تُحذف طلبات العملاء بتغيير هذه القيمة. النشر يحتاج مراجعة صريحة منك.</p>
    {!draft?<p role="status">{error||'جارٍ تحميل مسودة الخصوصية…'}</p>:<>
      <div className="privacy-state"><strong>{wasPublished?'منشور للزوار':'مسودة غير منشورة'}</strong>
        <a href="./?privacy=1" target="_blank" rel="noopener noreferrer">معاينة صفحة الخصوصية العامة</a>
      </div>
      <div className="privacy-form-fields">
        <label>الجهة المسؤولة عن البيانات
          <input maxLength={180} value={draft.controller_name} onChange={e=>setField('controller_name',e.target.value)}/></label>
        <label>وسيلة التواصل بشأن الخصوصية
          <input maxLength={180} value={draft.privacy_contact} onChange={e=>setField('privacy_contact',e.target.value)}
            placeholder="بريد إلكتروني أو رقم تواصل معتمد"/></label>
        <label>الغرض من جمع معلومات طلبات الأسعار
          <textarea rows={3} maxLength={2500} value={draft.purpose} onChange={e=>setField('purpose',e.target.value)}/></label>
        <label>من يستطيع الاطلاع على المعلومات أو تلقيها
          <textarea rows={3} maxLength={2500} value={draft.recipients} onChange={e=>setField('recipients',e.target.value)}/></label>
        <label>كيفية طلب الاطلاع أو التصحيح أو الحذف
          <textarea rows={3} maxLength={2500} value={draft.rights_instructions} onChange={e=>setField('rights_instructions',e.target.value)}/></label>
        <label>مدة الاحتفاظ بالطلبات (بالأيام)
          <input type="number" min="1" max="3650" placeholder="أدخل المدة المعتمدة" value={draft.retention_days??''}
            onChange={e=>setField('retention_days',e.target.value===''?null:Number(e.target.value))}/></label>
      </div>
      <div className="privacy-approval">
        <label className="cloud-check"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>
          راجعت النص والمدة ووسيلة التواصل، وأعتمد نشرها باسم الشركة.</label>
        <p className="cloud-note">نشر هذا النص لا يضمن تلقائيًا الامتثال القانوني؛ تحقق من متطلبات نشاطك وأنظمتك قبل اعتماده.</p>
      </div>
      <div className="cloud-actions">
        <button className="cloud-btn cloud-muted" disabled={busy} onClick={()=>void save(false)}>حفظ مسودة غير منشورة</button>
        <button className="cloud-btn" disabled={busy||!approved||publicationIssues(draft).length>0}
          onClick={()=>void save(true)}>اعتماد ونشر بيان الخصوصية</button>
      </div>
    </>}
    {notice&&<p className="privacy-success" role="status">{notice}</p>}
    {error&&draft&&<p className="privacy-error" role="alert">{error}</p>}
  </section>;
}
