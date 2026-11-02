import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { BrandSettings, CartItem, Filters, Product } from './types';
import { CART_KEY, demoProducts, defaultSettings, EMPTY_FILTERS, filterOptions, filterProducts, isProduct, makeWhatsAppMessage, PRODUCTS_KEY, parseQuantityInput, sanitizeCart, safelyParseJson, SETTINGS_KEY, updateCart, validateProduct, visibleProducts } from './logic';
import { exportProductsExcel, exportQuoteExcel, saveExcel } from './export';
import { downloadSnapshot, makeSnapshot, parseSnapshot } from './portable';
import './styles.css';
import './reference-corporate.css';
import CloudAdmin from './cloud-admin';
import { productImages } from './gallery';
import { QuoteRequestDialog } from './quote-form';
import PrivacyPage from './privacy-page';
import { cloudEnabled, readPublicCatalog } from './cloud';

const statusLabels: Record<Product['status'],string> = {available:'متوفر',soon:'قريبًا',unavailable:'غير متوفر'};
const statusClass: Record<Product['status'],string> = {available:'available',soon:'soon',unavailable:'unavailable'};
const adminMode = !cloudEnabled && import.meta.env.DEV && new URLSearchParams(location.search).get('admin') === 'preview';
const cloudAdminRequested = new URLSearchParams(location.search).get('admin') === '1';
const catalogPageRequested = new URLSearchParams(location.search).get('catalog') === '1';
const privacyRequested = new URLSearchParams(location.search).get('privacy') === '1';

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
  const photos=productImages(product);
  const [selected,setSelected]=useState(0);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{setSelected(0);setFailed(false);},[product.id,product.image,product.gallery?.join('|')]);
  const active=photos[selected]??photos[0];
  return <div className="product-gallery">
    <div className="photo-stage">{active && !failed ?
      <img loading="lazy" src={active} alt={product.name+' — صورة '+(selected+1)} onError={()=>setFailed(true)}/> :
      <LightIcon/>}</div>
    {photos.length>1&&<div className="photo-thumbs" aria-label={'صور المنتج '+product.name}>
      {photos.map((src,i)=><button key={src} type="button" className={'photo-thumb '+(selected===i?'active':'')}
        aria-label={'عرض الصورة '+(i+1)+' من '+photos.length} aria-pressed={selected===i}
        onClick={()=>{setSelected(i);setFailed(false);}}>
        <img loading="lazy" src={src} alt=""/>
      </button>)}
    </div>}
  </div>;
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
  const [mobileNavOpen,setMobileNavOpen]=useState(false);
  const [quoteOpen,setQuoteOpen]=useState(false);
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
  const categories=useMemo(()=>Array.from(new Set(available.map(p=>p.category).filter(Boolean))).slice(0,6),[available]);
  const featured=useMemo(()=>available.slice(0,4),[available]);
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
  return <div className="rc-app">
  <header className="rc-header">
    <div className="container rc-nav">
      <a className="rc-logo" href="./" aria-label="الصفحة الرئيسية">
        <span className="rc-logo-icon" aria-hidden="true">✦</span>
        <span className="rc-logo-caption"><b>{settings.name || 'FLOWER LIGHT'}</b><small>LIGHTING & ELECTRICAL SOLUTIONS</small></span>
      </a>
      <nav className="rc-desktop-nav" aria-label="القائمة الرئيسية">
        <a href="./" aria-current="page">الرئيسية</a>
        <a href="about.html">من نحن</a>
        <a href="./?catalog=1">المنتجات</a>
        <a href="services.html">الخدمات</a>
        <a href="projects.html">المشاريع</a>
        <a href="contact.html">التواصل</a>
      </nav>
      <div className="rc-nav-actions">
        <button type="button" className="rc-cta rc-quote-action" onClick={()=>setCartOpen(true)}>
          <span aria-hidden="true">▤</span> <span className="rc-quote-text">طلب عرض سعر</span>
          {cartItems.length>0&&<span className="rc-cart-count">{cartItems.length}</span>}
        </button>
        <button type="button" className="rc-menu-toggle" aria-label={mobileNavOpen?'إغلاق القائمة':'فتح القائمة'} aria-expanded={mobileNavOpen}
          aria-controls="rc-mobile-nav" onClick={()=>setMobileNavOpen(v=>!v)}><span aria-hidden="true">{mobileNavOpen?'×':'☰'}</span></button>
      </div>
    </div>
    {mobileNavOpen&&<nav id="rc-mobile-nav" className="rc-mobile-nav" aria-label="القائمة على الجوال">
      {[['./','الرئيسية'],['about.html','من نحن'],['./?catalog=1','المنتجات'],['services.html','الخدمات'],['projects.html','المشاريع'],['contact.html','التواصل']] .map(([href,label])=>
        <a href={href} key={href} onClick={()=>setMobileNavOpen(false)}>{label}</a>)}
    </nav>}
  </header>
  <main id="top">
  {!catalogPageRequested&&<>
    <section className="rc-hero" aria-label="حلول الإنارة المؤسسية">
      <div className="rc-hero-picture" role="img" aria-label="مشروع إنارة معمارية توضيحي"></div>
      <div className="rc-hero-overlay"></div>
      <div className="container rc-hero-content">
        <span className="rc-eyebrow">CORPORATE LIGHTING SOLUTIONS</span>
        <h1>{settings.heroTitle}</h1>
        <p>{settings.heroDescription}</p>
        <div className="rc-hero-buttons">
          <a className="rc-btn rc-btn-primary" href="./?catalog=1">استعرض المنتجات <span aria-hidden="true">←</span></a>
          <a className="rc-btn rc-btn-hero-outline" href="about.html">تعرف على الشركة</a>
        </div>
      </div>
      <div className="rc-hero-indicator"><span></span><b></b><b></b></div>
    </section>

    <section className="rc-section rc-about" id="about">
      <div className="container rc-about-grid">
        <div className="rc-about-visual" role="img" aria-label="مثال توضيحي لمشروع إنارة داخلية"></div>
        <div className="rc-about-copy">
          <span className="rc-kicker">ABOUT OUR COMPANY</span>
          <h2>حلول عملية للإنارة،<br/>مناسبة لاحتياجات المشاريع</h2>
          <span className="rc-accent-line" aria-hidden="true"></span>
          <p>يقدم هذا الموقع نموذجًا مؤسسيًا لعرض حلول الإنارة والمنتجات الفنية، ومساعدة العميل على المقارنة واختيار الأصناف المناسبة وإعداد طلب عرض سعر منظم.</p>
          <p className="rc-muted">المحتوى والصور المعروضة للتوضيح إلى حين اعتماد المعلومات الرسمية للشركة.</p>
          <a className="rc-btn rc-btn-outline" href="about.html">المزيد عن الشركة <span aria-hidden="true">←</span></a>
        </div>
      </div>
    </section>

    <section className="rc-section rc-section-soft rc-sectors">
      <div className="container">
        <div className="rc-title-row"><div><span className="rc-kicker">BUSINESS SECTORS</span><h2>القطاعات التي نخدمها</h2><span className="rc-accent-line" aria-hidden="true"></span></div></div>
        <div className="rc-tile-grid rc-four-col">
          {[
            ['⌂','المشاريع السكنية','إضاءة عامة وديكورية للمساحات الداخلية والخارجية.'],
            ['▤','المشاريع التجارية','حلول عرض وإنارة لواجهات ومتاجر ومساحات عمل.'],
            ['⚙','المرافق الصناعية','خيارات إنارة تقنية للمستودعات والمرافق.'],
            ['◇','الضيافة والمشاريع','خيارات تناسب مشاريع الفنادق والمرافق العامة.']
          ].map(([icon,title,description])=><a href="services.html" className="rc-icon-card" key={title}>
            <span className="rc-sector-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p>
          </a>)}
        </div>
      </div>
    </section>

    <section className="rc-section rc-categories">
      <div className="container">
        <div className="rc-title-row"><div><span className="rc-kicker">PRODUCT CATEGORIES</span><h2>فئات المنتجات</h2><span className="rc-accent-line" aria-hidden="true"></span></div><a className="rc-btn rc-btn-outline" href="#catalog">كل المنتجات</a></div>
        {categories.length ? <div className="rc-tile-grid rc-three-col">{categories.map(category=>{
          const sample=available.find(p=>p.category===category);
          const total=available.filter(p=>p.category===category).length;
          return <a key={category} href="#catalog" className="rc-category-card" onClick={()=>setFilters({...EMPTY_FILTERS,category})}>
            <div className="rc-category-image">{sample?.image?<img src={sample.image} alt={category} loading="lazy"/>:<span className="rc-product-placeholder" aria-hidden="true">✦</span>}</div>
            <div className="rc-category-caption"><span><strong>{category}</strong><small>{total} منتج</small></span><b aria-hidden="true">←</b></div>
          </a>;
        })}</div> : <p className="rc-muted">ستظهر فئات الكتالوج بعد نشر المنتجات من لوحة المدير.</p>}
      </div>
    </section>

    {featured.length>0&&<section className="rc-section rc-section-soft rc-featured">
      <div className="container"><div className="rc-title-row"><div><span className="rc-kicker">FEATURED COLLECTION</span><h2>منتجات مميزة</h2><span className="rc-accent-line" aria-hidden="true"></span></div><a className="rc-btn rc-btn-outline" href="#catalog">تصفح الكتالوج</a></div>
      <div className="product-grid rc-featured-grid">{featured.map(p=><ProductCard key={p.id} product={p} quantity={cart.find(c=>c.productId===p.id)?.quantity??0} onCart={onCart} onDatasheet={setPrintProduct}/>)}</div></div>
    </section>}

  </>}
  <section id="catalog" className="catalog-section"><div className="container">{catalogPageRequested&&<div className="rc-page-intro"><span className="rc-kicker">COMPLETE PRODUCT CATALOG</span><h1>كتالوج المنتجات</h1><p>تصفح الأصناف وابحث في المواصفات الفنية، وأضف ما تحتاجه إلى قائمة طلب السعر.</p></div>}<div className="section-heading"><div><span className="section-kicker">OUR COLLECTION</span><h2>مجموعة المنتجات</h2><p>ابحث عن حلول الإنارة المناسبة وقارن المواصفات الفنية.</p></div><span className="product-count">{filtered.length} منتج</span></div>
  <div className="filters"><label className="search-label">بحث في المنتجات<input placeholder="اسم المنتج أو الكود..." value={filters.search} onChange={e=>setFilters(p=>({...p,search:e.target.value}))}/></label>{filterSelect('category','القسم')}{filterSelect('cct','لون الإضاءة')}{filterSelect('installation','التركيب')}{filterSelect('status','التوفر')}<button type="button" className="clear-filters" onClick={()=>setFilters({...EMPTY_FILTERS})}>مسح الفلاتر</button></div>
  {!catalogReady && cloudEnabled ? <div className="empty-state" role="status"><h3>جاري تحميل الكتالوج</h3><p>تُجلب المنتجات من قاعدة Saeed المؤسسية.</p></div> : filtered.length?<div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p} quantity={cart.find(c=>c.productId===p.id)?.quantity??0} onCart={onCart} onDatasheet={setPrintProduct}/>)}</div>:<div className="empty-state"><h3>لم نجد منتجات مطابقة</h3><p>جرّب تغيير الفلاتر أو البحث بكود مختلف.</p><button type="button" className="button outline" onClick={()=>setFilters({...EMPTY_FILTERS})}>عرض جميع المنتجات</button></div>}
  <div className="catalog-bottom"><button type="button" className="button outline" onClick={()=>saveExcel(exportProductsExcel(available),'flower-light-products.xlsx')}>تصدير قائمة المنتجات Excel ↓</button><p>المنتجات المعروضة بيانات تجريبية لتطوير المشروع وليست كتالوجًا نهائيًا.</p></div></div></section>
  {!catalogPageRequested&&<>
  <section className="rc-section rc-services" id="services">
    <div className="container"><div className="rc-title-row"><div><span className="rc-kicker">OUR SERVICES</span><h2>خدمات وحلول متكاملة</h2><span className="rc-accent-line" aria-hidden="true"></span></div><a className="rc-btn rc-btn-outline" href="services.html">جميع الخدمات</a></div>
      <div className="rc-tile-grid rc-four-col">
        {[
          ['✦','اختيار حلول الإنارة','تنظيم البدائل وفق احتياجات المساحة والخصائص الفنية.'],
          ['▦','كتالوج ومواصفات','مراجعة مواصفات المنتجات والمقارنة بين الخيارات.'],
          ['◎','دعم المشاريع','إعداد قوائم الأصناف والكميات المطلوبة للمشروع.'],
          ['▤','طلبات أسعار منظمة','إرسال المنتجات المختارة مع الكميات إلى فريق الشركة.']
        ].map(([icon,title,description])=><a key={title} href="services.html" className="rc-icon-card">
          <span className="rc-sector-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{description}</p></a>)}
      </div>
    </div>
  </section>
  <section className="rc-section rc-why">
    <div className="container"><span className="rc-kicker">WHY CHOOSE US</span><h2>لماذا هذا النموذج المؤسسي؟</h2><span className="rc-accent-line" aria-hidden="true"></span>
      <div className="rc-tile-grid rc-four-col">{[
        ['✓','معلومات واضحة','المواصفات الفنية في متناول العميل.'],
        ['▦','تنظيم دقيق','فئات وفلاتر وقائمة طلب واحدة.'],
        ['⚑','تجربة عملية','بحث سريع مناسب للجوال والحاسوب.'],
        ['♧','حماية البيانات','إدارة محمية وطلبات عروض أسعار متحقَّق منها.']
      ].map(([icon,title,description])=><div key={title} className="rc-why-item"><span>{icon}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
    </div>
  </section>
  <section className="rc-section rc-projects" id="projects">
    <div className="container"><div className="rc-title-row"><div><span className="rc-kicker">PROJECT APPLICATIONS</span><h2>مجالات المشاريع</h2><span className="rc-accent-line" aria-hidden="true"></span><p className="rc-muted">نماذج توضيحية لأنواع المشاريع، وليست أعمالًا منفذة أو تعاقدات فعلية.</p></div><a className="rc-btn rc-btn-outline" href="projects.html">عرض المجالات</a></div><a className="rc-btn rc-btn-outline" href="projects.html">عرض المجالات</a></div>
      <div className="rc-tile-grid rc-project-grid">
        {[['المباني التجارية','إضاءة واجهات ومساحات العمل','commercial'],['المشاريع السكنية','حلول للمساحات الداخلية','residential'],['الضيافة والمرافق','إضاءة معمارية للمرافق','hospitality'],['المنشآت الصناعية','حلول للمستودعات والمرافق','industrial']].map(([title,desc,style])=>
        <a href="projects.html" className={'rc-project-card rc-project-'+style} key={title}>
          <span className="rc-project-meta">تطبيق توضيحي</span><span className="rc-project-copy"><strong>{title}</strong><small>{desc}</small></span>
        </a>)}
      </div>
    </div>
  </section>
  <section className="rc-section rc-cta-section">
    <div className="container"><div className="rc-cta-panel"><span className="rc-cta-orbit" aria-hidden="true"></span>
      <h2>هل تبحث عن حلول إنارة لمشروعك؟</h2><p>تصفح الكتالوج واختر المنتجات والكميات، ثم أرسل طلب عرض سعر مرتبًا إلى فريق الشركة.</p>
      <div className="rc-hero-buttons"><button type="button" className="rc-btn rc-btn-light" onClick={()=>setCartOpen(true)}>ابدأ طلب عرض سعر</button>
      <a className="rc-btn rc-btn-white-outline" href="contact.html">تواصل معنا</a></div>
    </div></div>
  </section>
  <section className="rc-section rc-contact" id="contact">
    <div className="container rc-contact-grid"><div><span className="rc-kicker">GET IN TOUCH</span><h2>لنبدأ بمشروعك القادم</h2><span className="rc-accent-line" aria-hidden="true"></span><p>نساعدك على تنظيم متطلباتك ومراجعة الخيارات المتاحة في الكتالوج. بيانات التواصل والمعلومات التجارية تُعرض بعد اعتمادها من الإدارة.</p><a className="rc-btn rc-btn-outline" href="contact.html">صفحة التواصل</a></div>
      <div className="rc-contact-panel"><h3>معلومات الشركة</h3><div><span>الاسم التجاري</span><strong>{settings.name || 'بانتظار الاعتماد'}</strong></div>
        {settings.phone&&<div><span>الهاتف</span><a dir="ltr" href={`tel:${settings.phone.replace(/[^\d+]/g,'')}`}>{settings.phone}</a></div>}
        {settings.commercialRegistration&&<div><span>السجل التجاري</span><strong dir="ltr">{settings.commercialRegistration}</strong></div>}
        <button type="button" className="rc-btn rc-btn-primary" onClick={()=>setCartOpen(true)}>إعداد قائمة طلب السعر</button>
      </div>
    </div>
  </section>
  </>}
  </main>
  <footer className="rc-footer">
    <div className="container rc-footer-grid">
      <div><a href="./" className="rc-logo rc-footer-logo"><span className="rc-logo-icon">✦</span><span className="rc-logo-caption"><b>{settings.name || 'FLOWER LIGHT'}</b><small>LIGHTING SOLUTIONS</small></span></a>
        <p>موقع مؤسسي لعرض حلول الإنارة والمواصفات الفنية وإعداد طلبات الأسعار. معلومات المشاريع والصور للمعاينة حتى اعتمادها.</p></div>
      <div><h3>روابط سريعة</h3><a href="./">الرئيسية</a><a href="about.html">من نحن</a><a href="./?catalog=1">المنتجات</a><a href="services.html">الخدمات</a><a href="projects.html">المشاريع</a></div>
      <div><h3>الطلبات والخدمات</h3><a href="./?catalog=1">كتالوج المنتجات</a><button type="button" onClick={()=>setCartOpen(true)}>طلب عرض سعر</button><a href="contact.html">التواصل</a></div>
      <div><h3>معلومات وسياسات</h3>{settings.phone&&<a dir="ltr" href={`tel:${settings.phone.replace(/[^\d+]/g,'')}`}>{settings.phone}</a>}<a href="./?privacy=1">بيان الخصوصية</a><span>جميع البيانات التجارية تتطلب اعتماد الشركة</span></div>
    </div>
    <div className="rc-footer-bottom"><div className="container"><span>© {new Date().getFullYear()} {settings.name || 'FLOWER LIGHT'} · جميع الحقوق محفوظة</span><span>موقع مؤسسي مستقل — محتوى توضيحي</span></div></div>
  </footer>
  {cartOpen&&<div className="drawer-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="quote-drawer" role="dialog" aria-modal="true" aria-labelledby="cartHeading"><div className="drawer-header"><div><h2 id="cartHeading">قائمة طلب السعر</h2><p>{cartItems.length} من 30 صنفًا</p></div><button type="button" className="icon-button" aria-label="إغلاق القائمة" onClick={()=>setCartOpen(false)}>×</button></div>
  {cartItems.length?<div className="drawer-items">{cartItems.map(({p,quantity})=><div className="drawer-item" key={p.id}><div><strong>{p.name}</strong><small dir="ltr">{p.sku}</small></div><QuantityControl product={p} quantity={quantity} onCart={onCart}/><button className="remove-item" type="button" onClick={()=>onCart(p,0)}>حذف</button></div>)}</div>:<div className="drawer-empty">اختر منتجات من الكتالوج لإضافتها إلى طلبك.</div>}
  <div className="drawer-footer"><button className="button outline" type="button" disabled={!cartItems.length} onClick={()=>saveExcel(exportQuoteExcel(cart,products),'flower-light-quote.xlsx')}>تصدير الطلب Excel</button><button className="button gold" type="button" disabled={!cartItems.length} onClick={checkout}>إرسال عبر واتساب</button>
    {cloudEnabled && <button className="button primary" type="button" disabled={!cartItems.length} onClick={()=>{setCartOpen(false);setQuoteOpen(true);}}>طلب عرض سعر من الموقع</button>}
    <small>لا تُرسل معلومات التواصل أو قائمة المنتجات إلى الشركة إلا عند تأكيد الإرسال في نموذج الطلب.</small></div></aside></div>}
  {quoteOpen && <QuoteRequestDialog cart={cart} onClose={()=>setQuoteOpen(false)} onSubmitted={()=>{setCart([]);setQuoteOpen(false);setNotice('تم استلام طلب عرض السعر. ستتواصل معك الشركة عبر وسيلة التواصل التي أدخلتها.');}}/>}
  {printProduct&&<div className="print-preview-overlay" role="dialog" aria-modal="true" aria-label="معاينة ورقة المواصفات الفنية"><div className="print-preview-top"><strong>معاينة الداتا شيت — {printProduct.sku}</strong><span>اختر «حفظ كملف PDF» من وجهة الطباعة</span><button type="button" className="button primary" onClick={()=>window.print()}>طباعة / حفظ PDF</button><button type="button" className="button outline" onClick={()=>setPrintProduct(null)}>إغلاق المعاينة</button></div><div className="print-preview-paper"><Datasheet product={printProduct} settings={settings}/></div></div>}
  {notice&&<div role="status" className="toast" onClick={()=>setNotice('')}>{notice}</div>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode>{privacyRequested ? <PrivacyPage/> : cloudAdminRequested ? (cloudEnabled ? <CloudAdmin/> : <div style={{padding:32,margin:'auto',maxWidth:700}}><h1>لوحة الإدارة غير مفعّلة</h1><p>يتطلب تشغيلها ربط مشروع Supabase مستقل وإضافة مفتاح النشر العام ضمن إعدادات البناء.</p><a href="./">العودة للموقع</a></div>) : <App/>}</React.StrictMode>);
