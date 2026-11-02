import { useEffect, useState } from 'react';
import type { BrandSettings, Product } from './types';
import { productImages } from './gallery';
import './reference-details.css';

export default function ReferenceProductDetails({product,settings,related,quantity,onCart,onDatasheet}:{
  product:Product;settings:BrandSettings;related:Product[];quantity:number;
  onCart:(p:Product,q:number)=>void;onDatasheet:(p:Product)=>void;
}){
  const photos=productImages(product),[current,setCurrent]=useState(0),[zoom,setZoom]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{setCurrent(0);setZoom(false);},[product.id]);
  const share=async()=>{
    const url=window.location.href;
    try{
      if(navigator.share){await navigator.share({title:product.name,url});return;}
      await navigator.clipboard.writeText(url);
      setNotice('تم نسخ رابط المنتج.');
    }catch {setNotice('يمكنك نسخ الرابط من شريط العنوان.');}
  };
  const whats=()=>{
    const number=settings.whatsapp.replace(/\D/g,'');
    if(!/^\d{9,15}$/.test(number)){setNotice('لم يتم اعتماد رقم واتساب بعد.');return;}
    const msg='استفسار عن المنتج: '+product.name+' ('+product.sku+')\n'+window.location.href;
    window.open('https://wa.me/'+number+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
  };
  const stateLabel={available:'متوفر',soon:'قريبًا',unavailable:'غير متوفر'}[product.status];
  const src=photos[current]??photos[0];
  return <div className="rc-details-page container" dir="rtl">
    <nav className="rc-breadcrumb" aria-label="مسار التصفح"><a href="./">الرئيسية</a><span>/</span><a href="./?catalog=1">المنتجات</a><span>/</span><span>{product.name}</span></nav>
    <div className="rc-details-grid">
      <div className="rc-detail-gallery">
        <button type="button" className="rc-detail-main-photo" aria-label="تكبير صورة المنتج" onClick={()=>src&&setZoom(true)}>
          {src?<img src={src} alt={product.name}/>:<div className="rc-no-photo">لا توجد صورة معتمدة</div>}
          {src&&<span className="rc-zoom-cue">تكبير الصورة ⤢</span>}
        </button>
        {photos.length>1&&<div className="rc-detail-thumbs">{photos.map((photo,index)=><button type="button" key={photo}
          aria-label={'عرض الصورة '+(index+1)} aria-pressed={current===index}
          className={current===index?'selected':''} onClick={()=>setCurrent(index)}><img src={photo} alt=""/></button>)}</div>}
      </div>
      <div className="rc-details-content">
        <span className="rc-detail-stock">{stateLabel}</span>
        <h1>{product.name}</h1>
        <p className="rc-detail-en">{product.nameEn}</p>
        <p className="rc-detail-code">الكود: <b dir="ltr">{product.sku}</b></p>
        <p className="rc-detail-desc">{product.description}</p>
        <div className="rc-detail-price">السعر عند الطلب</div>
        <div className="rc-detail-actions">
          <button type="button" className="rc-btn rc-btn-primary" onClick={()=>onCart(product,Math.max(1,quantity+1))}>
            {quantity>0?'إضافة وحدة أخرى للطلب':'إضافة إلى طلب عرض السعر'} {quantity>0?'('+quantity+')':''}
          </button>
          <button type="button" className="rc-btn rc-btn-outline" onClick={whats}>استفسار واتساب</button>
          <button type="button" className="rc-btn rc-btn-outline" onClick={()=>void share()}>مشاركة ↗</button>
          <button type="button" className="rc-btn rc-btn-outline" onClick={()=>onDatasheet(product)}>تحميل المواصفات / PDF</button>
        </div>
        <div className="rc-detail-specs">
          <h2>المواصفات الفنية</h2>
          <dl>{[
            ['التصنيف',product.category],['التركيب',product.installation],
            ['القدرة',product.watt+' W'],['لون الإضاءة',product.cct+' K'],
            ['التدفق الضوئي',product.lumens+' lm'],['CRI',String(product.cri)],
            ['درجة الحماية',product.ip],['زاوية الشعاع',product.beam+'°']
          ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
        {notice&&<p className="rc-detail-alert" role="status">{notice}</p>}
      </div>
    </div>
    {related.length>0&&<section className="rc-related">
      <h2>منتجات ذات صلة</h2><div className="rc-related-grid">{related.slice(0,4).map(p=><a key={p.id} href={'./?product='+encodeURIComponent(p.id)}
        className="rc-related-product"><div>{p.image?<img src={p.image} loading="lazy" alt={p.name}/>:<span>✦</span>}</div>
        <small dir="ltr">{p.sku}</small><strong>{p.name}</strong></a>)}</div>
    </section>}
    {zoom&&src&&<div className="rc-zoom-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setZoom(false)}}>
      <div role="dialog" aria-modal="true" aria-label="معاينة صورة المنتج" className="rc-zoom-dialog">
        <button type="button" onClick={()=>setZoom(false)} aria-label="إغلاق تكبير الصورة">×</button>
        <img src={src} alt={product.name}/>
      </div>
    </div>}
  </div>;
}
