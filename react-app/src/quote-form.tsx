import { useEffect, useRef, useState } from 'react';
import type { CartItem } from './types';
import { cloudClient } from './cloud';
import { prepareQuoteSubmission } from './quote-request';
import './quote-form.css';

type TurnstileAPI = {
  render: (element:HTMLElement, options:{
    sitekey:string; action:string; callback:(token:string)=>void;
    'expired-callback':()=>void; 'error-callback':()=>void;
  })=>string;
  reset:(id?:string)=>void;
  remove:(id:string)=>void;
};
declare global { interface Window {turnstile?:TurnstileAPI} }

const siteKey=(import.meta.env.VITE_CORP_TURNSTILE_SITE_KEY??'').trim();
export const secureQuoteFormConfigured=!!siteKey;

export function QuoteRequestDialog({cart,onClose,onSubmitted}:{
  cart:CartItem[];onClose:()=>void;onSubmitted:()=>void
}){
  const [name,setName]=useState('');
  const [contact,setContact]=useState('');
  const [company,setCompany]=useState('');
  const [message,setMessage]=useState('');
  const [accepted,setAccepted]=useState(false);
  const [token,setToken]=useState('');
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [intakeState,setIntakeState]=useState<'checking'|'configured'|'offline'>(siteKey?'checking':'offline');
  const slot=useRef<HTMLDivElement>(null);
  const widget=useRef<string|null>(null);
  useEffect(()=>{
    if(!siteKey||!cloudClient){setIntakeState('offline');return;}
    let active=true;
    void cloudClient.functions.invoke('corp-submit-quote',{method:'GET'})
      .then(({data,error})=>{
        if(active)setIntakeState(!error&&data?.configured===true?'configured':'offline');
      })
      .catch(()=>{if(active)setIntakeState('offline');});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!siteKey||!cloudClient||intakeState!=='configured')return;
    let active=true;
    const render=()=>{
      if(!active||!slot.current||!window.turnstile||widget.current)return;
      widget.current=window.turnstile.render(slot.current,{
        sitekey:siteKey,action:'quote_submit',callback:t=>{if(active)setToken(t);},
        'expired-callback':()=>{if(active)setToken('');},
        'error-callback':()=>{if(active){setToken('');setError('تعذر التحقق الأمني. أعد المحاولة.');}}
      });
    };
    const src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    let script=document.querySelector<HTMLScriptElement>('script[data-corp-turnstile]');
    if(!script){script=document.createElement('script');script.dataset.corpTurnstile='true';script.src=src;script.async=true;document.head.appendChild(script);}
    script.addEventListener('load',render);
    render();
    return()=>{
      active=false;
      script?.removeEventListener('load',render);
      if(widget.current){try{window.turnstile?.remove(widget.current);}catch{ /* already removed */ }widget.current=null;}
    };
  },[intakeState]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!secureQuoteFormConfigured||intakeState!=='configured'||!cloudClient||sending)return;
    setError('');
    let payload;
    try{payload=prepareQuoteSubmission(name,contact,company,message,cart,accepted,token);}
    catch(e){setError(e instanceof Error?e.message:'بيانات الطلب غير صحيحة.');return;}
    setSending(true);
    try{
      const {data,error:apiError}=await cloudClient.functions.invoke('corp-submit-quote',{body:payload});
      if(apiError||data?.ok!==true){
        const code=data?.code;
        if(code==='rate_limited')setError('تجاوزت الحد المؤقت للطلبات. حاول بعد ساعة.');
        else if(code==='not_configured')setError('لم تُفعّل خدمة الطلبات بعد في إعدادات الشركة.');
        else setError('تعذّر إرسال الطلب. تحقّق من البيانات والاتصال، ثم أعد المحاولة.');
        return;
      }
      onSubmitted();
    }catch{setError('تعذّر الاتصال بخادم الطلبات.');}
    finally{
      setSending(false);setToken('');
      if(widget.current)window.turnstile?.reset(widget.current);
    }
  }
  return <div className="quote-form-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!sending)onClose();}}>
    <section className="quote-form-dialog" role="dialog" aria-modal="true" aria-label="طلب عرض سعر من الشركة" dir="rtl">
      <div className="quote-form-head"><div><span>REQUEST FOR QUOTATION</span><h2>إرسال طلب عرض سعر</h2><p>{cart.length} من المنتجات المحددة</p></div>
        <button type="button" aria-label="إغلاق" disabled={sending} onClick={onClose}>×</button>
      </div>
      {!secureQuoteFormConfigured||!cloudClient||intakeState!=='configured'?
        <div className="quote-form-off" role="status">
          <strong>{intakeState==='checking'?'جارٍ فحص جاهزية استقبال الطلبات…':'استقبال الطلبات عبر الموقع لم يُفعّل بعد.'}</strong>
          <p>{intakeState==='checking'?'نتحقق من إعدادات خادم Saeed دون إرسال أي بيانات من قائمة الطلب.':
            'يلزم إعداد المفتاح العام لـ Cloudflare Turnstile في GitHub والمفتاح السري في Supabase، ثم اختبارهما. يمكنك الاحتفاظ بقائمة طلبك أو تصديرها إلى Excel.'}</p>
          <button className="button outline" type="button" onClick={onClose}>العودة لقائمة الطلب</button>
        </div>:
        <form onSubmit={e=>void submit(e)} className="quote-form-fields">
          <label>اسمك <span aria-hidden="true">*</span><input autoComplete="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم الكامل"/></label>
          <label>رقم الجوال أو البريد الإلكتروني <span aria-hidden="true">*</span><input autoComplete="email" required maxLength={160} value={contact} onChange={e=>setContact(e.target.value)} placeholder="وسيلة التواصل للرد على طلبك"/></label>
          <label>اسم الشركة (اختياري)<input maxLength={120} value={company} onChange={e=>setCompany(e.target.value)} placeholder="الجهة أو المؤسسة"/></label>
          <label>ملاحظات (اختياري)<textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="تفاصيل المشروع أو موعد التوريد المطلوب"/></label>
          <label className="quote-consent"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>أوافق على استخدام معلومات التواصل والمنتجات المطلوبة للرد على طلب عرض السعر، وأعلم أنها ستُرسل إلى إدارة الموقع. <a href="./?privacy=1" target="_blank" rel="noopener noreferrer">عرض بيان الخصوصية وحالة اعتماده</a>.</span></label>
          <div className="quote-security" ref={slot} aria-label="التحقق الأمني"></div>
          {error&&<p className="quote-form-error" role="alert">{error}</p>}
          <div className="quote-form-actions"><button type="submit" className="button primary" disabled={sending||!token||!accepted}>{sending?'جارٍ إرسال الطلب…':'تأكيد وإرسال الطلب'}</button>
          <button type="button" className="button outline" disabled={sending} onClick={onClose}>إلغاء</button></div>
          <small>لا يُرسل الطلب دون إتمام التحقق الأمني والموافقة. لا ترسل بيانات دفع أو مستندات سرية ضمن الملاحظات.</small>
        </form>}
    </section>
  </div>;
}
