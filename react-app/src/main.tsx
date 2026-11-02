import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BrandSettings, CartItem, Filters, Product } from './types';
import { CART_KEY, demoProducts, defaultSettings, EMPTY_FILTERS, filterOptions, filterProducts, isProduct, makeWhatsAppMessage, PRODUCTS_KEY, parseQuantityInput, sanitizeCart, safelyParseJson, SETTINGS_KEY, updateCart, validateProduct, visibleProducts } from './logic';
import { exportProductsExcel, exportQuoteExcel, saveExcel } from './export';
import { downloadSnapshot, makeSnapshot, parseSnapshot } from './portable';
import './styles.css';
import CloudAdmin from './cloud-admin';
import { cloudEnabled, readPublicCatalog } from './cloud';

const statusLabels: Record<Product['status'],string> = {available:'متوفر',soon:'قريبًا',unavailable:'غير متوفر'};
const statusClass: Record<Product['status'],string> = {available:'available',soon:'soon',unavailable:'unavailable'};
const adminMode = !cloudEnabled && import.meta.env.DEV && new URLSearchParams(location.search).get('admin') === 'preview';
const cloudAdminRequested = new URLSearchParams(location.search).get('admin') === '1';

function readProducts(): Product[] {
  try { const parsed=safelyParseJson(localStorage.getItem(PRODUCTS_KEY)); return Array.isArray(parsed) && parsed.every(isProduct) ? parsed : demoProducts; } catch { return demoProducts; }
}
function readSettings(): BrandSettings {
  try { const value=safelyParseJson(localStorage.getItem(SETTINGS_KEY)); if(value && typeof value==='object' && !Array.isArray(value)) {
    const obj=value as Record<string,unknown>;const out={...defaultSettings};
    for(const k of Object.keys(out) as (keyof BrandSettings)[]){ if(typeof obj[k]===typeof out[k]) { (out as unknown as Record<string,unknown>)[k]=obj[k]; } }
    return out;
  }} catch { /* localStorage can be unavailable */ }
  return defaultSettings;
}
function readCart(products: Product[]): CartItem[] { try {return sanitizeCart(safelyParseJson(localStorage.getItem(CART_KEY)), products);} catch {return [];} }
function saveState(key: string, value: unknown): boolean { try {localStorage.setItem(key,JSON.stringify(value)); return true;} catch {return false;} }
function emptyProduct():Product{return {id:globalThis.crypto?.randomUUID?.()??`product-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,sku:'',name:'',nameEn:'',category:'',installation:'سقفي غاطس',watt:0,cct:3000,lumens:0,cri:80,ip:'IP20',beam:36,image:'',description:'',status:'available',visible:true};}

function LightIcon({small=false}:{small?:boolean}){
  return <svg className={small?'light-icon small':'light-icon'} viewBox="0 0 240 220" aria-hidden="true"><defs><linearGradient id="metal" x1="0" x2="1"><stop stopColor="#334c5d"/><stop offset=".52" stopColor="#091b27"/><stop offset="1" stopColor="#466175"/></linearGradient><radialGradient id="led"><stop stopColor="#fff9e1"/><stop offset=".65" stopColor="#f4d78e"/><stop offset="1" stopColor="#cf9747"/></radialGradient></defs><ellipse cx="120" cy="166" rx="91" ry="27" fill="#102b39" opacity=".1"/><path d="M56 80Q60 51 120 51T184 80L174 139Q166 160 120 161T66 139Z" fill="url(#metal)"/><ellipse cx="120" cy="80" rx="66" ry="26" fill="#6c8190"/><ellipse cx="120" cy="82" rx="55" ry="21" fill="#0c1c29"/><ellipse cx="120" cy="82" rx="40" ry="15" fill="url(#led)"/><ellipse cx="120" cy="82" rx="26" ry="9" fill="#fff4d1" opacity=".8"/></svg>;
}
function Logo(){return <span className="brand"><span className="brand-symbol">✦</span><span className="brand-text"><b>FLOWER LIGHT</b><small>ARCHITECTURAL LIGHTING</small></span></span>}
function QuantityControl({product, quantity, onCart}:{product:Product;quantity:number;onCart:(p:Product,q:number)=>void}){
  const [draft,setDraft]=useState(String(quantity));
  useEffect(()=>setDraft(String(quantity)),[quantity]);
  const commit=()=>{
    const next=parseQuantityInput(draft);
    setDraft(String(next ?? quantity));
    if(next !== null && next !== quantity) onCart(product,next);
  };
  return <div className="qty-control"><button type="button" aria-label={`تقليل ${product.name}`} onClick={()=>onCart(product,Math.max(0,(parseQuantityInput(draft)??quantity)-1))}>−</button>
    <input type="text" inputMode="numeric" pattern="[0-9٠-٩۰-۹]*" maxLength={8} aria-label={`كمية ${product.name}`} value={draft}
      onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.key==='Enter') e.currentTarget.blur();if(e.key==='Escape') {setDraft(String(quantity));}}}/>
    <button type="button" aria-label={`زيادة ${product.name}`} onClick={()=>onCart(product,(parseQuantityInput(draft)??quantity)+1)}>+</button></div>;
}
function ProductPhoto({product}:{product:Product}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[product.image]);
  return product.image && !failed ? <img loading="lazy" src={product.image} alt={product.name} onError={()=>setFailed(true)}/> : <LightIcon/>;
}
function ProductCard({product, quantity, onCart, onDatasheet}:{product:Product;quantity:number;onCart:(p:Product,q:number)=>void;onDatasheet:(p:Product)=>void}){
  return <article className="product-card"><div className="product-media">
    <ProductPhoto product={product}/>
    <span className={`status-tag ${statusClass[product.status]}`}>{statusLabels[product.status]}</span>
    </div><div className="product-body"><div className="product-title"><div><h3>{product.name}</h3><span>{product.nameEn}</span></div><span className="product-code" dir="ltr">{product.sku}</span></div>
    <p className="product-description">{product.description}</p>
    <div className="specs"><span><b>{product.watt}W</b> القدرة</span><span><b>{product.cct}K</b> اللون</span><span><b>{product.lumens}</b> لومن</span></div>
    <div className="product-actions"><button type="button" className="button outline" onClick={()=>onDatasheet(product)}>الداتا شيت <span aria-hidden="true">↗</span></button>
    {quantity>0?<QuantityControl product={product} quantity={quantity} onCart={onCart}/>:<button type="button" className="button primary" onClick={()=>onCart(product,1)}>أضف للطلب <span aria-hidden="true">+</span></button>}
    </div></div></article>;
}
function Datasheet({product,settings}:{product:Product;settings:BrandSettings}){
  return <div className="print-document" id="datasheet-print" lang="ar" dir="rtl"><header className="sheet-header"><Logo/><div><strong>ورقة المواصفات الفنية</strong><span>PRODUCT DATA SHEET</span></div></header><div className="sheet-brandline"/>
    <div className="sheet-heading"><div><small>الإنارة المعمارية / ARCHITECTURAL LIGHTING</small><h1>{product.name}</h1><p>{product.nameEn}</p><b>{product.sku}</b></div><div className="sheet-image">{product.image?<img src={product.image} alt={product.name}/>:<LightIcon/>}</div></div>
    <p className="sheet-description">{product.description}</p>
    <h2>المواصفات الفنية <span>TECHNICAL SPECIFICATIONS</span></h2>
    <table><tbody>{[
      ['كود المنتج / Model',product.sku],['الفئة / Category',product.category],['طريقة التركيب / Installation',product.installation],
      ['القدرة / Power',`${product.watt} W`],['درجة حرارة اللون / CCT',`${product.cct} K`],['التدفق الضوئي / Lumens',`${product.lumens} lm`],
      ['مؤشر تجسيد اللون / CRI',`${product.cri}`],['تصنيف الحماية / IP',product.ip],['زاوية الإضاءة / Beam angle',`${product.beam}°`]
      ].map(([key,value])=><tr key={key}><th>{key}</th><td>{value}</td></tr>)}</tbody></table>
    <footer><span>{settings.name} · {settings.phone}</span><span>FLOWER LIGHT — {product.sku}</span></footer>
  </div>;
}
function Admin({products,settings,onSaveProduct,onDeleteProduct,onSettings,onImport,onExport,onClose}:{products:Product[];settings:BrandSettings;onSaveProduct:(p:Product)=>string[];onDeleteProduct:(id:string)=>void;onSettings:(s:BrandSettings)=>void;onImport:(text:string)=>void;onExport:()=>void;onClose:()=>void}){
  const [draft,setDraft]=useState<Product|null>(null);const [errors,setErrors]=useState<string[]>([]);
  const [settingsDraft,setSettingsDraft]=useState<BrandSettings>(settings);
  const [importMessage,setImportMessage]=useState('');
  useEffect(()=>setSettingsDraft(settings),[settings]);
  const importFile=async(file:File | undefined)=>{
    if(!file)return;
    if(file.size>5_000_000){setImportMessage('حجم الملف أكبر من 5 ميغابايت');return;}
    try {onImport(await file.text());setImportMessage('تم استيراد البيانات محليًا');setDraft(null);}
    catch(error){setImportMessage(error instanceof Error?error.message:'فشل الاستيراد');}
  };
  const edit=<K extends keyof Product>(key:K,value:Product[K])=>setDraft(p=>p?{...p,[key]:value}:p);
  const save=()=>{if(!draft)return;const errs=onSaveProduct(draft);setErrors(errs);if(!errs.length)setDraft(null)};
  return <section className="admin-wrap" aria-label="إدارة محتوى المعاينة"><div className="admin-header"><div><h1>محرر المحتوى</h1><p>معاينة محلية مستقلة — التغييرات تحفظ في متصفح هذا الجهاز فقط ولا تتصل بـ Supabase.</p></div><button type="button" className="button outline" onClick={onClose}>العودة للموقع</button></div>
  <div className="notice">تنبيه: هذه واجهة تجربة وتطوير، وليست لوحة إدارة مؤمنة. لا تستخدمها لإدارة بيانات حقيقية أو للنشر العام قبل تفعيل المصادقة والصلاحيات.</div>
  <div className="admin-panels"><section className="panel"><div className="section-heading compact"><h2>المنتجات</h2><button type="button" className="button primary" onClick={()=>{setDraft(emptyProduct());setErrors([])}}>+ إضافة منتج</button></div>
    <div className="admin-products">{products.map(p=><div className="admin-product" key={p.id}><div><strong>{p.name||'منتج بلا اسم'}</strong><small dir="ltr">{p.sku} · {p.category} · {p.visible?'ظاهر':'مخفي'}</small></div><div><button type="button" className="text-button" onClick={()=>{setDraft({...p});setErrors([])}}>تعديل</button><button type="button" className="text-button danger" onClick={()=>{if(confirm(`حذف ${p.name}؟`))onDeleteProduct(p.id)}}>حذف</button></div></div>)}</div>
    </section><section className="panel"><div className="section-heading compact"><h2>بيانات المنشأة</h2></div>
    <div className="form-grid">{([['name','الاسم التجاري'],['phone','رقم التواصل'],['whatsapp','واتساب بصيغة دولية'],['commercialRegistration','السجل التجاري'],['taxNumber','الرقم الضريبي'],['heroTitle','عنوان الواجهة'],['heroDescription','وصف الواجهة']] as Array<[keyof BrandSettings,string]>).map(([key,label])=><label key={key}>{label}<input value={String(settingsDraft[key])} onChange={e=>setSettingsDraft(p=>({...p,[key]:e.target.value}))}/></label>)}
    </div><button type="button" className="button primary" onClick={()=>onSettings(settingsDraft)}>حفظ بيانات الشركة محليًا</button>
    <div className="import-export"><h3>نقل بيانات المعاينة بين الأجهزة</h3><p>احفظ المنتجات والإعدادات في ملف JSON على جهازك. الاستيراد يستبدل بيانات هذه المعاينة بعد تأكيدك.</p>
      <button type="button" className="button outline" onClick={onExport}>تنزيل بيانات المعاينة JSON</button>
      <label className="import-field">استيراد ملف محفوظ<input aria-label="استيراد بيانات المعاينة" type="file" accept=".json,application/json" onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label>
      {importMessage&&<p role="status">{importMessage}</p>}
    </div></section></div>
    {draft&&<div className="modal-backdrop" role="presentation"><section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="editTitle"><div className="modal-header"><h2 id="editTitle">{products.some(p=>p.id===draft.id)?'تعديل المنتج':'إضافة منتج جديد'}</h2><button type="button" aria-label="إغلاق" className="icon-button" onClick={()=>setDraft(null)}>×</button></div>
      <div className="form-grid">{([['sku','الكود'],['name','الاسم العربي'],['nameEn','الاسم الإنجليزي'],['category','القسم'],['installation','نوع التركيب'],['ip','تصنيف IP'],['image','رابط الصورة'],['description','الوصف']] as Array<[keyof Product,string]>).map(([key,label])=><label key={key}>{label}<input value={String(draft[key])} onChange={e=>edit(key,e.target.value as never)} maxLength={key==='description'?600:180}/></label>)}
      {([['watt','القدرة W'],['cct','درجة اللون K'],['lumens','اللومن'],['cri','CRI'],['beam','زاوية الإضاءة']] as Array<[keyof Product,string]>).map(([key,label])=><label key={key}>{label}<input type="number" min="0" value={Number(draft[key])} onChange={e=>edit(key,Number(e.target.value) as never)}/></label>)}
      <label>الحالة<select value={draft.status} onChange={e=>edit('status',e.target.value as Product['status'])}><option value="available">متوفر</option><option value="soon">قريبًا</option><option value="unavailable">غير متوفر</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={draft.visible} onChange={e=>edit('visible',e.target.checked)}/> إظهار المنتج للزوار</label></div>
      {errors.length>0&&<div role="alert" className="form-error">{errors.join(' · ')}</div>}
      <div className="modal-actions"><button type="button" className="button outline" onClick={()=>setDraft(null)}>إلغاء</button><button type="button" className="button primary" onClick={save}>حفظ المنتج</button></div></section></div>}
    </section>;
}
function App(){
  const [products,setProducts]=useState<Product[]>(()=>cloudEnabled?[]:readProducts());
  const [settings,setSettings]=useState<BrandSettings>(()=>cloudEnabled?defaultSettings:readSettings());
  const [filters,setFilters]=useState<Filters>({...EMPTY_FILTERS});
  const [cart,setCart]=useState<CartItem[]>(()=>cloudEnabled?[]:readCart(readProducts()));
  const [cartOpen,setCartOpen]=useState(false);
  const [catalogReady,setCatalogReady]=useState(!cloudEnabled);
  const [admin,setAdmin]=useState(adminMode);
  const [printProduct,setPrintProduct]=useState<Product|null>(null);
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(!cloudEnabled && !saveState(PRODUCTS_KEY,products))setNotice('تعذر الحفظ على هذا المتصفح')},[products]);
  useEffect(()=>{if(!cloudEnabled && !saveState(SETTINGS_KEY,settings))setNotice('تعذر حفظ إعدادات الشركة')},[settings]);
  useEffect(()=>{if(catalogReady && !saveState(CART_KEY,cart))setNotice('تعذر حفظ قائمة الطلب')},[cart,catalogReady]);
  useEffect(()=>{if(!cloudEnabled)return;let active=true;
    readPublicCatalog().then(data=>{if(active){setProducts(data.products);setSettings(data.settings);setCart(readCart(data.products));setCatalogReady(true);}})
      .catch(()=>{if(active){setProducts([]);setCart([]);setCatalogReady(false);setNotice('تعذر تحميل بيانات الكتالوج من القاعدة الجديدة. لم يتم عرض بيانات محلية بديلة.');}});
    return ()=>{active=false;};},[]);
  const filtered=useMemo(()=>filterProducts(products,filters),[products,filters]);
  const available=useMemo(()=>visibleProducts(products),[products]);
  const cartItems=useMemo(()=>cart.map(c=>({p:products.find(p=>p.id===c.productId && p.visible),quantity:c.quantity})).filter((i):i is {p:Product;quantity:number}=>!!i.p),[cart,products]);
  const onCart=(p:Product,quantity:number)=>{
    if(quantity>0 && !cart.some(c=>c.productId===p.id) && cart.length>=30){setNotice('الحد الأقصى لقائمة الطلب هو 30 صنفًا. احذف صنفًا أولًا.');return;}
    setCart(old=>updateCart(old,p.id,quantity));
  };
  const importLocal=(text:string)=>{
    const restored=parseSnapshot(text);
    if(!window.confirm(`استبدال ${products.length} منتجًا وإعدادات الشركة بالبيانات المستوردة (${restored.products.length} منتجًا)؟`)) throw new Error('أُلغِي الاستيراد ولم تتغير البيانات');
    setProducts(restored.products);setSettings(restored.settings);setCart([]);
    setNotice('تم الاستيراد محليًا. تم تفريغ قائمة الطلب لتجنب المنتجات غير الموجودة.');
  };
  const onSaveProduct=(p:Product):string[]=>{const issues=validateProduct(p,products);if(!issues.length){setProducts(old=>old.some(x=>x.id===p.id)?old.map(x=>x.id===p.id?p:x):[...old,p]);setNotice('تم حفظ المنتج محليًا');}return issues};
  const onDeleteProduct=(id:string)=>{setProducts(old=>old.filter(p=>p.id!==id));setCart(old=>old.filter(c=>c.productId!==id));};
  const filterSelect=(key:'category'|'installation'|'cct'|'status',label:string)=>{const options=filterOptions(products,filters,key);return <label className="filter-label">{label}<select aria-label={label} value={filters[key]} onChange={e=>setFilters(p=>({...p,[key]:e.target.value}))}><option value="">الكل</option>{options.map(v=><option key={v} value={v}>{key==='status'?statusLabels[v as Product['status']]:key==='cct'?`${v}K`:v}</option>)}</select></label>};
  const checkout=()=>{if(!cartItems.length)return;const digits=settings.whatsapp.replace(/\D/g,'');if(!/^\d{9,15}$/.test(digits)){setNotice('رقم واتساب غير صالح في إعدادات الشركة');return;}const message=makeWhatsAppMessage(cart,products,settings);window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer')};
  if(admin) return <><Admin products={products} settings={settings} onSaveProduct={onSaveProduct} onDeleteProduct={onDeleteProduct} onSettings={next=>{setSettings(next);setNotice('تم حفظ إعدادات الشركة محليًا')}} onImport={importLocal} onExport={()=>downloadSnapshot(makeSnapshot(products,settings))} onClose={()=>{setAdmin(false);history.replaceState({},'',location.pathname)}}/>{notice&&<div role="status" className="toast" onClick={()=>setNotice('')}>{notice}</div>}</>;
  return <><header className="navbar"><div className="container nav-inner"><a href="#top" aria-label="الصفحة الرئيسية"><Logo/></a><nav className="nav-links" aria-label="التنقل الرئيسي"><a href="./">الرئيسية</a><a href="about.html">من نحن</a><a href="services.html">الخدمات</a><a href="projects.html">المشاريع</a><a href="#catalog">المنتجات</a><a href="contact.html">تواصل معنا</a></nav><button type="button" className="nav-quote" onClick={()=>setCartOpen(true)}>قائمة الطلب <span>{cartItems.length}</span></button></div></header>
  <main id="top"><section className="hero"><div className="hero-image"/><div className="hero-shade"/><div className="container hero-content"><div className="eyebrow"><span className="eyebrow-line"/> ARCHITECTURAL LIGHTING SOLUTIONS</div><h1>{settings.heroTitle.split(' ').slice(0,3).join(' ')}<br/><em>{settings.heroTitle.split(' ').slice(3).join(' ')}</em></h1><p>{settings.heroDescription}</p><div className="hero-buttons"><a href="#catalog" className="button gold">اكتشف منتجاتنا <span>←</span></a><a href="#about" className="button ghost">اكتشف FLOWER LIGHT</a></div></div><div className="hero-bottom"><span>01 / 03</span><span>Designed for what matters.</span></div></section>
  <section className="values-strip"><div className="container strip-grid"><div><strong>تصاميم متقنة</strong><span>جودة تجتمع مع البساطة</span></div><div><strong>أداء ضوئي عالٍ</strong><span>حلول لكل مساحة</span></div><div><strong>خيارات متنوعة</strong><span>لمشاريعك المختلفة</span></div><div><strong>دعم متخصص</strong><span>من الفكرة إلى التنفيذ</span></div></div></section>
  <section id="about" className="container about-section"><div><span className="section-kicker">ABOUT FLOWER LIGHT</span><h2>نضيء التفاصيل،<br/><em>ونصنع الفرق.</em></h2></div><div><p>في فلاور لايت نؤمن بأن الإنارة عنصر معماري أساسي يمنح المكان شخصيته. نقدم حلولًا مدروسة تلائم المشاريع السكنية والتجارية، مع اهتمام بأداء المنتج وتفاصيله الفنية.</p><a className="underlined-link" href="#contact">تعرف على شركتنا <span>↗</span></a></div></section>
  <section id="catalog" className="catalog-section"><div className="container"><div className="section-heading"><div><span className="section-kicker">OUR COLLECTION</span><h2>مجموعة المنتجات</h2><p>ابحث عن حلول الإنارة المناسبة وقارن المواصفات الفنية.</p></div><span className="product-count">{filtered.length} منتج</span></div>
  <div className="filters"><label className="search-label">بحث في المنتجات<input placeholder="اسم المنتج أو الكود..." value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}/></label>{filterSelect('category','القسم')}{filterSelect('cct','لون الإضاءة')}{filterSelect('installation','التركيب')}{filterSelect('status','التوفر')}<button type="button" className="clear-filters" onClick={()=>setFilters({...EMPTY_FILTERS})}>مسح الفلاتر</button></div>
  {!catalogReady && cloudEnabled ? <div className="empty-state" role="status"><h3>جاري تحميل الكتالوج</h3><p>تُجلب المنتجات من قاعدة Saeed المؤسسية.</p></div> : filtered.length?<div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p} quantity={cart.find(c=>c.productId===p.id)?.quantity??0} onCart={onCart} onDatasheet={setPrintProduct}/>)}</div>:<div className="empty-state"><h3>لم نجد منتجات مطابقة</h3><p>جرّب تغيير الفلاتر أو البحث بكود مختلف.</p><button type="button" className="button outline" onClick={()=>setFilters({...EMPTY_FILTERS})}>عرض جميع المنتجات</button></div>}
  <div className="catalog-bottom"><button type="button" className="button outline" onClick={()=>saveExcel(exportProductsExcel(available),'flower-light-products.xlsx')}>تصدير قائمة المنتجات Excel ↓</button><p>المنتجات المعروضة بيانات تجريبية لتطوير المشروع وليست كتالوجًا نهائيًا.</p></div></div></section>
  <section className="banner-section"><div className="container banner-inner"><span className="section-kicker">YOUR LIGHTING PARTNER</span><h2>مشروعك القادم،<br/>يستحق إنارة مختلفة.</h2><a href="#contact" className="button gold">تواصل معنا <span>←</span></a></div></section>
  <section className="contact-section" id="contact"><div className="container contact-layout"><div><span className="section-kicker">LET'S CONNECT</span><h2>لنعمل على<br/><em>شيءٍ مضيء.</em></h2><p>يسعدنا مساعدتك في اختيار الإنارة المناسبة لمشروعك.</p></div><div className="contact-card"><h3>تواصل مع فريقنا</h3>{settings.phone ? <a href={`tel:${settings.phone.replace(/[^\d+]/g,'')}`}>الهاتف <strong dir="ltr">{settings.phone}</strong></a> : <div>الهاتف <strong>بانتظار الاعتماد</strong></div>}<div>الاسم التجاري <strong>{settings.name}</strong></div><div>السجل التجاري <strong dir="ltr">{settings.commercialRegistration || "بانتظار الاعتماد"}</strong></div><div>الرقم الضريبي <strong dir="ltr">{settings.taxNumber || "بانتظار الاعتماد"}</strong></div><button type="button" className="button gold" onClick={()=>setCartOpen(true)}>إنشاء طلب عرض سعر</button></div></div></section></main>
  <footer className="site-footer"><div className="container"><Logo/><span>© {new Date().getFullYear()} FLOWER LIGHT · جميع الحقوق محفوظة</span><span>نسخة تطوير مستقلة — محتوى تجريبي</span></div></footer>
  {cartOpen&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="quote-drawer" role="dialog" aria-modal="true" aria-labelledby="cartHeading"><div className="drawer-header"><div><h2 id="cartHeading">قائمة طلب السعر</h2><p>{cartItems.length} من 30 صنفًا</p></div><button type="button" className="icon-button" aria-label="إغلاق القائمة" onClick={()=>setCartOpen(false)}>×</button></div>
  {cartItems.length?<div className="drawer-items">{cartItems.map(({p,quantity})=><div className="drawer-item" key={p.id}><div><strong>{p.name}</strong><small dir="ltr">{p.sku}</small></div><QuantityControl product={p} quantity={quantity} onCart={onCart}/><button className="remove-item" type="button" onClick={()=>onCart(p,0)}>حذف</button></div>)}</div>:<div className="drawer-empty">اختر منتجات من الكتالوج لإضافتها إلى طلبك.</div>}
  <div className="drawer-footer"><button className="button outline" type="button" disabled={!cartItems.length} onClick={()=>saveExcel(exportQuoteExcel(cart,products),'flower-light-quote.xlsx')}>تصدير الطلب Excel</button><button className="button gold" type="button" disabled={!cartItems.length} onClick={checkout}>إرسال عبر واتساب</button><small>لا يتم إرسال أي شيء إلا عند الضغط على زر واتساب.</small></div></aside></div>}
  {printProduct&&<div className="print-preview-overlay" role="dialog" aria-modal="true" aria-label="معاينة ورقة المواصفات الفنية"><div className="print-preview-top"><strong>معاينة الداتا شيت — {printProduct.sku}</strong><span>اختر «حفظ كملف PDF» من وجهة الطباعة</span><button type="button" className="button primary" onClick={()=>window.print()}>طباعة / حفظ PDF</button><button type="button" className="button outline" onClick={()=>setPrintProduct(null)}>إغلاق المعاينة</button></div><div className="print-preview-paper"><Datasheet product={printProduct} settings={settings}/></div></div>}
  {notice&&<div role="status" className="toast" onClick={()=>setNotice('')}>{notice}</div>}
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode>{cloudAdminRequested ? (cloudEnabled ? <CloudAdmin/> : <div style={{padding:32,margin:'auto',maxWidth:700}}><h1>لوحة الإدارة غير مفعّلة</h1><p>يتطلب تشغيلها ربط مشروع Supabase مستقل وإضافة مفتاح النشر العام ضمن إعدادات البناء.</p><a href="./">العودة للموقع</a></div>) : <App/>}</React.StrictMode>);
