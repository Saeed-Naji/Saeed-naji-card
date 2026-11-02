import { useEffect, useState } from 'react';
import type { BrandSettings, Product } from './types';
import { defaultSettings, validateProduct } from './logic';
import { cloudClient, fromBusinessRow, fromProductRow, productColumns, businessColumns, toBusinessRow, toProductRow } from './cloud';
import type { BusinessRow, ProductRow } from './cloud';
import './cloud-admin.css';

const emptyProduct = (): Product => ({
  id:crypto.randomUUID(), sku:'', name:'', nameEn:'', category:'', installation:'', watt:0,
  cct:3000, lumens:0, cri:80, ip:'IP20', beam:36, image:'', description:'',
  status:'available', visible:false
});
type Stage = 'checking' | 'login' | 'denied' | 'ready';
const genericError = 'تعذرت العملية. تحقق من اتصال قاعدة البيانات وصلاحيات حسابك.';
export default function CloudAdmin() {
  const [stage,setStage] = useState<Stage>('checking');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [products,setProducts] = useState<Product[]>([]);
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
    const [p,b] = await Promise.all([
      cloudClient.from('corp_products').select(productColumns).order('sku').limit(1000),
      cloudClient.from('corp_business_info').select(businessColumns).eq('singleton',true).maybeSingle()
    ]);
    if (p.error || b.error) { setStage('denied'); setError(genericError); return; }
    setProducts(((p.data ?? []) as ProductRow[]).map(fromProductRow));
    setSettings(b.data ? fromBusinessRow(b.data as BusinessRow) : defaultSettings);
    setPublished(Boolean(b.data?.is_published));
    setStage('ready');
  }
  useEffect(()=>{
    let active=true;
    void checkIdentity().catch(()=>{if(active){setStage('login');setError(genericError);}});
    const {data:{subscription}}=cloudClient?.auth.onAuthStateChange((event)=>{
      if (!active) return;
      if (event === 'SIGNED_OUT') {setProducts([]);setDraft(null);setStage('login');}
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
    setProducts([]);setDraft(null);setStage('login');setError('');
  }
  async function saveProduct() {
    if (!cloudClient || !draft || busy) return;
    const issues=validateProduct(draft,products);
    if (issues.length) {setError(issues.join('، '));return;}
    setBusy(true);setError('');
    try {
      const {error:saveError} = await cloudClient.from('corp_products').upsert(toProductRow(draft),{onConflict:'id'});
      if(saveError) throw saveError;
      setDraft(null);await reload();
    }catch {setError(genericError);} finally {setBusy(false);}
  }
  async function deleteProduct(p:Product) {
    if (!cloudClient || busy || !confirm('حذف المنتج '+p.name+' نهائيًا؟')) return;
    setBusy(true);setError('');
    try {
      const {error:deleteError} = await cloudClient.from('corp_products').delete().eq('id',p.id);
      if(deleteError) throw deleteError;
      await reload();
    }catch{setError(genericError);}finally{setBusy(false);}
  }
  async function saveSettings() {
    if (!cloudClient || busy) return;
    if(!confirm(published ? 'نشر بيانات الشركة الحالية للزوار؟' : 'حفظ البيانات مع إبقائها غير منشورة؟')) return;
    setBusy(true);setError('');
    try {
      const {error:saveError} = await cloudClient.from('corp_business_info').upsert(toBusinessRow(settings,published),{onConflict:'singleton'});
      if(saveError) throw saveError;
      await reload();
    }catch{setError(genericError);}finally{setBusy(false);}
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
      <div className="cloud-panel"><div className="cloud-section-head"><h2>إدارة المنتجات <small>({products.length})</small></h2><button className="cloud-btn" onClick={()=>{setDraft(emptyProduct());setError('');}}>+ إضافة منتج</button></div>
      <div className="cloud-table-wrap"><table><thead><tr><th>الكود</th><th>الاسم</th><th>القسم</th><th>النشر</th><th>الإجراءات</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td dir="ltr">{p.sku}</td><td>{p.name}</td><td>{p.category}</td><td>{p.visible?'ظاهر':'مخفي'}</td><td><button className="cloud-link" onClick={()=>{setDraft({...p});setError('');}}>تعديل</button><button className="cloud-link cloud-danger" disabled={busy} onClick={()=>void deleteProduct(p)}>حذف</button></td></tr>)}</tbody></table>
      {products.length===0&&<p>لا توجد منتجات في القاعدة الجديدة. لا تُنقل منتجات المشروع القديم تلقائيًا.</p>}</div></div>
      <section className="cloud-panel"><h2>الهوية ومعلومات الشركة</h2><div className="cloud-fields">
        {([['name','الاسم التجاري'],['commercialRegistration','السجل التجاري'],['taxNumber','الرقم الضريبي'],['phone','الهاتف'],['whatsapp','رقم واتساب الدولي'],['heroTitle','عنوان الواجهة'],['heroDescription','وصف الواجهة']] as const).map(([key,label])=><label key={key}>{label}<input value={String(settings[key])} onChange={e=>settingsUpdate(key,e.target.value)}/></label>)}
      </div><label className="cloud-check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> نشر معلومات الشركة للزوار</label>
      <button disabled={busy} className="cloud-btn" onClick={()=>void saveSettings()}>حفظ إعدادات الشركة</button></section>
      {draft&&<div className="cloud-overlay"><section className="cloud-panel cloud-editor" role="dialog" aria-modal="true" aria-label="تحرير المنتج"><div className="cloud-section-head"><h2>{products.some(x=>x.id===draft.id)?'تعديل منتج':'إضافة منتج'}</h2><button className="cloud-btn cloud-muted" onClick={()=>setDraft(null)}>إغلاق</button></div>
        <div className="cloud-fields">{([['sku','كود المنتج'],['name','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['category','القسم'],['installation','نوع التركيب'],['ip','IP'],['image','رابط الصورة'],['description','الوصف']] as const).map(([key,label])=><label key={key}>{label}<input maxLength={key==='description'?600:180} value={draft[key]} onChange={e=>update(key,e.target.value)}/></label>)}
        {([['watt','القدرة W'],['cct','حرارة اللون K'],['lumens','لومن'],['cri','CRI'],['beam','زاوية الشعاع']] as const).map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={draft[key]} onChange={e=>update(key,Number(e.target.value))}/></label>)}
        <label>التوفر<select value={draft.status} onChange={e=>update('status',e.target.value as Product['status'])}><option value="available">متوفر</option><option value="soon">قريبًا</option><option value="unavailable">غير متوفر</option></select></label></div>
        <label className="cloud-check"><input type="checkbox" checked={draft.visible} onChange={e=>update('visible',e.target.checked)}/> إظهار المنتج للعامة</label>
        <div className="cloud-actions"><button className="cloud-btn" disabled={busy} onClick={()=>void saveProduct()}>حفظ المنتج في Supabase</button><button className="cloud-btn cloud-muted" onClick={()=>setDraft(null)}>إلغاء</button></div>
      </section></div>}
    </>}
    {error&&<div role="alert" className="cloud-error">{error}</div>}
    <p className="cloud-note">لا تدخل مفاتيح سرية أو service_role في موقع عام. لا يُفعّل هذا القسم إلا بعد ربط مشروع منفصل واختبار RLS.</p>
  </main>;
}
