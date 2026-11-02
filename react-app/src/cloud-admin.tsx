import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { BrandSettings, Product } from './types';
import { defaultSettings, validateProduct } from './logic';
import { cloudClient, fromBusinessRow, fromProductRow, productColumns, businessColumns, toBusinessRow, toProductRow } from './cloud';
import type { BusinessRow, ProductRow } from './cloud';
import { uploadCorporateProductImage } from './cloud-images';
import './cloud-admin.css';

const emptyProduct = (): Product => ({
  id:crypto.randomUUID(), sku:'', name:'', nameEn:'', category:'', installation:'', watt:0,
  cct:3000, lumens:0, cri:80, ip:'IP20', beam:36, image:'', description:'',
  status:'available', visible:false
});
type Stage = 'checking' | 'login' | 'denied' | 'ready';
type QuoteStatus = 'new' | 'in_review' | 'responded' | 'closed';
type QuoteRow = { id:string;customer_name:string;customer_contact:string;company_name:string;message:string;items:unknown;status:QuoteStatus;created_at:string };
const quoteLabels:Record<QuoteStatus,string> = {new:'جديد',in_review:'قيد المراجعة',responded:'تم الرد',closed:'مغلق'};
const quoteStatuses:QuoteStatus[] = ['new','in_review','responded','closed'];
const genericError = 'تعذرت العملية. تحقق من اتصال قاعدة البيانات وصلاحيات حسابك.';
export default function CloudAdmin() {
  const [stage,setStage] = useState<Stage>('checking');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [uploading,setUploading] = useState(false);
  const [imageInfo,setImageInfo] = useState('');
  const [error,setError] = useState('');
  const [products,setProducts] = useState<Product[]>([]);
  const [quotes,setQuotes] = useState<QuoteRow[]>([]);
  const [settings,setSettings] = useState<BrandSettings>(defaultSettings);
  const [published,setPublished] = useState(false);
  const [draft,setDraft] = useState<Product|null>(null);

  async function checkIdentity() {
    if (!cloudClient) { setStage('denied'); return; }
    const {data:{user},error:authError} = await cloudClient.auth.getUser();
    if (authError || !user) { setStage('login'); return; }
    const {data:membership,error:roleError} = await cloudClient.from('corp_admin_members')
      .select('user_id').eq('user_id',user.id).maybeSingle();
    if (roleError || !membership) { setStage('denied'); return; }
    await reload();
  }
  async function reload() {
    if (!cloudClient) return;
    const [p,b,q] = await Promise.all([
      cloudClient.from('corp_products').select(productColumns).order('sku').limit(1000),
      cloudClient.from('corp_business_info').select(businessColumns).eq('singleton',true).maybeSingle(),
      cloudClient.from('corp_quote_requests').select('id,customer_name,customer_contact,company_name,message,items,status,created_at').order('created_at',{ascending:false}).limit(100)
    ]);
    if (p.error || b.error || q.error) { setStage('denied'); setError(genericError); return; }
    setProducts(((p.data ?? []) as ProductRow[]).map(fromProductRow));
    setQuotes((q.data ?? []) as QuoteRow[]);
    setSettings(b.data ? fromBusinessRow(b.data as BusinessRow) : defaultSettings);
    setPublished(Boolean(b.data?.is_published));
    setStage('ready');
  }
  useEffect(()=>{
    let active=true;
    void checkIdentity().catch(()=>{if(active){setStage('login');setError(genericError);}});
    const {data:{subscription}}=cloudClient?.auth.onAuthStateChange((event)=>{
      if (!active) return;
      if (event === 'SIGNED_OUT') {setProducts([]);setQuotes([]);setDraft(null);setStage('login');}
      // Token refresh and membership checks are enforced by RLS on every query.
    }) ?? {data:{subscription:{unsubscribe(){}}}};
    return ()=>{active=false;subscription.unsubscribe();};
  },[]);

  async function signIn(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cloudClient || busy) return;
    setBusy(true);setError('');
    try {
      const {error:signInError} = await cloudClient.auth.signInWithPassword({email:email.trim(),password});
      setPassword('');
      if (signInError) {setError('تعذر تسجيل الدخول. تحقق من بيانات الحساب.');return;}
      await checkIdentity();
    } catch {setError(genericError);} finally {setBusy(false);}
  }
  async function signOut() {
    await cloudClient?.auth.signOut();
    setProducts([]);setQuotes([]);setDraft(null);setStage('login');setError('');
  }
  async function saveProduct() {
    if (!cloudClient || !draft || busy || uploading) return;
    const issues=validateProduct(draft,products);
    if (issues.length) {setError(issues.join('، '));return;}
    setBusy(true);setError('');
    try {
      const {data:saved,error:saveError} = await cloudClient.from('corp_products').upsert(toProductRow(draft),{onConflict:'id'}).select('id').single();
      if(saveError || !saved || saved.id!==draft.id) throw saveError ?? new Error('Product was not saved');
      setDraft(null);setImageInfo('');await reload();
    }catch {setError(genericError);} finally {setBusy(false);}
  }
  async function deleteProduct(p:Product) {
    if (!cloudClient || busy || !confirm('حذف المنتج '+p.name+' نهائيًا؟')) return;
    setBusy(true);setError('');
    try {
      const {data:deleted,error:deleteError} = await cloudClient.from('corp_products').delete().eq('id',p.id).select('id').single();
      if(deleteError || !deleted || deleted.id!==p.id) throw deleteError ?? new Error('Product was not deleted');
      await reload();
    }catch{setError(genericError);}finally{setBusy(false);}
  }
  async function saveSettings() {
    if (!cloudClient || busy) return;
    if(!confirm(published ? 'نشر بيانات الشركة الحالية للزوار؟' : 'حفظ البيانات مع إبقائها غير منشورة؟')) return;
    setBusy(true);setError('');
    try {
      const {data:saved,error:saveError} = await cloudClient.from('corp_business_info').upsert(toBusinessRow(settings,published),{onConflict:'singleton'}).select('singleton').single();
      if(saveError || !saved || saved.singleton!==true) throw saveError ?? new Error('Settings were not saved');
      await reload();
    }catch{setError(genericError);}finally{setBusy(false);}
  }
  async function updateQuoteStatus(id:string,status:QuoteStatus) {
    if (!cloudClient || busy || !quoteStatuses.includes(status)) return;
    setBusy(true);setError('');
    try {
      const {data:updated,error:updateError}=await cloudClient.from('corp_quote_requests')
        .update({status}).eq('id',id).select('id,status').single();
      if(updateError || !updated || updated.id!==id || updated.status!==status)
        throw updateError ?? new Error('Quote status was not updated');
      await reload();
    } catch {setError(genericError);} finally {setBusy(false);}
  }
  async function onImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !draft || busy || uploading) return;
    setUploading(true);setError('');setImageInfo('');
    try {
      const imageUrl = await uploadCorporateProductImage(file);
      setDraft(current=>current?{...current,image:imageUrl}:current);
      setImageInfo('رُفعت الصورة إلى مساحة Saeed الجديدة. اضغط «حفظ المنتج» لربطها بالمنتج.');
    } catch(err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصورة.');
    } finally {setUploading(false);}
  }
  const update = <K extends keyof Product>(key:K,value:Product[K]) => setDraft(p=>p?{...p,[key]:value}:p);
  const settingsUpdate = <K extends keyof BrandSettings>(key:K,value:BrandSettings[K]) => setSettings(p=>({...p,[key]:value}));
  return <main className="cloud-admin" dir="rtl" lang="ar">
    <header className="cloud-head"><div><small>FLOWER LIGHT — CORPORATE</small><h1>لوحة إدارة الموقع الجديد</h1><p>Supabase مستقل · صلاحيات على الخادم · لا تسجيل عام للمديرين</p></div>
      <a className="cloud-btn cloud-muted" href="./">زيارة الموقع</a></header>
    {stage==='checking'&&<p role="status">جارٍ التحقق من صلاحية الدخول…</p>}
    {stage==='login'&&<form className="cloud-panel cloud-login" onSubmit={signIn}>
      <h2>تسجيل دخول المدير</h2>
      <label>البريد الإلكتروني<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
      <label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
      <button type="submit" disabled={busy} className="cloud-btn">دخول آمن</button>
      <p className="cloud-note">لا توجد إمكانية لإنشاء حساب من هذه الصفحة. يجب إنشاء الحساب واعتماد عضويته في مشروع Supabase الجديد.</p>
    </form>}
    {stage==='denied'&&<div className="cloud-panel"><h2>لا تملك صلاحية الإدارة</h2><p>يتطلب الوصول حسابًا معتمدًا في جدول عضويات الإدارة بالمشروع الجديد.</p><button className="cloud-btn" onClick={()=>void signOut()}>تسجيل الخروج</button></div>}
    {stage==='ready'&&<><div className="cloud-toolbar"><span>تم التحقق من عضوية المدير</span><button className="cloud-btn cloud-muted" onClick={()=>void signOut()}>تسجيل الخروج</button></div>
      <div className="cloud-panel"><div className="cloud-section-head"><h2>إدارة المنتجات <small>({products.length})</small></h2><button className="cloud-btn" onClick={()=>{setDraft(emptyProduct());setError('');setImageInfo('');}}>+ إضافة منتج</button></div>
      <div className="cloud-table-wrap"><table><thead><tr><th>الكود</th><th>الاسم</th><th>القسم</th><th>النشر</th><th>الإجراءات</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td dir="ltr">{p.sku}</td><td>{p.name}</td><td>{p.category}</td><td>{p.visible?'ظاهر':'مخفي'}</td><td><button className="cloud-link" onClick={()=>{setDraft({...p});setError('');setImageInfo('');}}>تعديل</button><button className="cloud-link cloud-danger" disabled={busy} onClick={()=>void deleteProduct(p)}>حذف</button></td></tr>)}</tbody></table>
      {products.length===0&&<p>لا توجد منتجات في القاعدة الجديدة. لا تُنقل منتجات المشروع القديم تلقائيًا.</p>}</div></div>
      <section className="cloud-panel"><div className="cloud-section-head"><h2>طلبات عروض الأسعار <small>({quotes.length})</small></h2><button type="button" className="cloud-btn cloud-muted" disabled={busy} onClick={()=>void reload()}>تحديث الطلبات</button></div>
        <p className="cloud-note">تظهر آخر 100 طلب فقط، وهي بيانات خاصة بالمدير المعتمد. استقبال الطلبات من العملاء غير مفعل حتى إنشاء نقطة إرسال آمنة والتحقق من إساءة الاستخدام.</p>
        {quotes.length===0 ? <p>لا توجد طلبات مسجلة في قاعدة الموقع الجديدة.</p> : <div className="cloud-table-wrap"><table><thead><tr><th>العميل</th><th>التواصل</th><th>تاريخ الطلب</th><th>الأصناف</th><th>الحالة</th></tr></thead><tbody>{quotes.map(q=><tr key={q.id}><td><strong>{q.customer_name}</strong><div>{q.company_name}</div>{q.message && <details><summary>رسالة العميل</summary><p className="cloud-message">{q.message}</p></details>}</td><td dir="ltr">{q.customer_contact}</td><td>{new Date(q.created_at).toLocaleDateString('ar-SA')}</td><td>{Array.isArray(q.items) ? q.items.length : '—'}</td><td><select aria-label={'حالة طلب '+q.customer_name} value={q.status} disabled={busy} onChange={e=>void updateQuoteStatus(q.id,e.target.value as QuoteStatus)}>{quoteStatuses.map(status=><option key={status} value={status}>{quoteLabels[status]}</option>)}</select></td></tr>)}</tbody></table></div>}
      </section>
      <section className="cloud-panel"><h2>الهوية ومعلومات الشركة</h2><div className="cloud-fields">
        {([['name','الاسم التجاري'],['commercialRegistration','السجل التجاري'],['taxNumber','الرقم الضريبي'],['phone','الهاتف'],['whatsapp','رقم واتساب الدولي'],['heroTitle','عنوان الواجهة'],['heroDescription','وصف الواجهة']] as const).map(([key,label])=><label key={key}>{label}<input value={String(settings[key])} onChange={e=>settingsUpdate(key,e.target.value)}/></label>)}
      </div><label className="cloud-check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> نشر معلومات الشركة للزوار</label>
      <button disabled={busy} className="cloud-btn" onClick={()=>void saveSettings()}>حفظ إعدادات الشركة</button></section>
      {draft&&<div className="cloud-overlay"><section className="cloud-panel cloud-editor" role="dialog" aria-modal="true" aria-label="تحرير المنتج"><div className="cloud-section-head"><h2>{products.some(x=>x.id===draft.id)?'تعديل منتج':'إضافة منتج'}</h2><button className="cloud-btn cloud-muted" disabled={uploading||busy} onClick={()=>{setDraft(null);setImageInfo("");}}>إغلاق</button></div>
        <div className="cloud-fields">{([['sku','كود المنتج'],['name','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['category','القسم'],['installation','نوع التركيب'],['ip','IP'],['image','رابط الصورة'],['description','الوصف']] as const).map(([key,label])=><label key={key}>{label}<input maxLength={key==='description'?600:180} value={draft[key]} onChange={e=>update(key,e.target.value)}/></label>)}
        {([['watt','القدرة W'],['cct','حرارة اللون K'],['lumens','لومن'],['cri','CRI'],['beam','زاوية الشعاع']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={draft[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
        <label>التوفر<select value={draft.status} onChange={e=>update('status',e.target.value as Product['status'])}><option value="available">متوفر</option><option value="soon">قريبًا</option><option value="unavailable">غير متوفر</option></select></label></div>
        <div className="cloud-upload">
          <label htmlFor="corp-product-image-file">رفع صورة المنتج من جهازك (JPG / PNG / WebP، بحد أقصى 3 ميغابايت)</label>
          <input id="corp-product-image-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||uploading} onChange={e=>void onImageChange(e)}/>
          {uploading && <p role="status">جارٍ رفع الصورة إلى مساحة الشركة الجديدة…</p>}
          {imageInfo && <p role="status" className="cloud-upload-success">{imageInfo}</p>}
          {draft.image && <img className="cloud-image-preview" src={draft.image} alt={'معاينة صورة '+draft.name}/>}
          <p className="cloud-note">هذه الصور ستكون عامة للزوار بعد نشر المنتج. لا ترفع مستندات سرية أو صور عملاء. يُنشأ لكل صورة اسم فريد ولا يُستبدل الملف القديم تلقائيًا.</p>
        </div>
        <label className="cloud-check"><input type="checkbox" checked={draft.visible} onChange={e=>update('visible',e.target.checked)}/> إظهار المنتج للعامة</label>
        <div className="cloud-actions"><button className="cloud-btn" disabled={busy||uploading} onClick={()=>void saveProduct()}>حفظ المنتج في Supabase</button><button className="cloud-btn cloud-muted" disabled={busy||uploading} onClick={()=>{setDraft(null);setImageInfo("");}}>إلغاء</button></div>
      </section></div>}
    </>}
    {error&&<div role="alert" className="cloud-error">{error}</div>}
    <p className="cloud-note">لا تدخل مفاتيح سرية أو service_role في موقع عام. لا يُفعّل هذا القسم إلا بعد ربط مشروع منفصل واختبار RLS.</p>
  </main>;
}
