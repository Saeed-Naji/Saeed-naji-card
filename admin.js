// Flower Light Supabase admin controller — STAGE84.
// ?admin=1 requires the Owner role; ?admin=2 requires the linked Sub-admin role.
// Permissions are enforced in both this interface and Supabase RLS/RPC policies.

window.FLOWER_LIGHT_SUPABASE = {
  url: 'https://afrvoshsiqartsketiuv.supabase.co',
  anonKey: 'sb_publishable_0fyTTziF-9PaGtp--sxn1w_qQtJe93i',
  storageBucket: 'product-images'
};

(() => {
  'use strict';
  const cfg = window.FLOWER_LIGHT_SUPABASE || {};
  const configured = /^https:\/\/.+\.supabase\.co$/i.test(String(cfg.url || '').trim()) && String(cfg.anonKey || '').trim() && !String(cfg.anonKey).includes('YOUR_');
  let db = null;
  if (configured && window.supabase?.createClient) {
    db = window.supabase.createClient(String(cfg.url).trim(), String(cfg.anonKey).trim(), { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  }
  window.flSupabase = db;

  const adminQuery = new URLSearchParams(location.search);
  const adminPanel = adminQuery.get('admin');
  const adminMode = adminPanel === '1' || adminPanel === '2';
  const isPrimaryAdmin = adminPanel === '1';
  const recoveryPortalRequested = adminMode && adminQuery.get('recovery') === '1';
  const baseAnalyticsTracker = typeof window.flTrack === 'function' ? window.flTrack : null;
  const analyticsId = (storage,key) => {
    try {
      let value=storage.getItem(key);
      if(!value){value=crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;storage.setItem(key,value);}
      return value;
    } catch (_) {
      return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };
  const analyticsVisitorId = analyticsId(localStorage,'fl_analytics_visitor_id');
  const analyticsSessionId = analyticsId(sessionStorage,'fl_analytics_session_id');
  const analyticsLabel = (eventName,params={}) => {
    if(eventName==='product_category_view') return String(params.category||'');
    if(eventName==='contact_location') return String(params.label||params.branch||'');
    if(eventName==='product_whatsapp_click' || eventName==='product_image_open') return String(params.product_name||'');
    if(eventName==='catalog_download') return String(params.label||'الكتالوج');
    if(eventName==='contact_phone' || eventName==='contact_whatsapp') return String(params.label||params.source||'');
    return String(params.label||'');
  };
  async function saveAnalyticsEvent(eventName,params={}){
    if(!db || adminMode || !eventName) return;
    try{
      const metadata={};
      ['source','category','panel_id','product_name','product_category','product_model','product_reference','direction','method','label','branch','products_count','failed_images'].forEach(key=>{
        if(params?.[key]!==undefined && params?.[key]!==null) metadata[key]=String(params[key]).slice(0,300);
      });
      const {error}=await db.rpc('log_site_event',{
        p_event_name:String(eventName).slice(0,64),
        p_event_label:analyticsLabel(eventName,params).slice(0,180),
        p_visitor_id:String(analyticsVisitorId).slice(0,80),
        p_session_id:String(analyticsSessionId).slice(0,80),
        p_page_path:String(location.pathname||'/').slice(0,300),
        p_metadata:metadata
      });
      if(error && String(error.code)!=='42883') console.warn('[Site analytics] save failed',error.message||error);
    }catch(error){console.warn('[Site analytics] save failed',error);}
  }
  window.flTrack = function(eventName,params={}){
    // GA4 already sends its automatic page_view; avoid counting it twice there.
    if(eventName!=='page_view'){try{baseAnalyticsTracker?.(eventName,params);}catch(_){}}
    void saveAnalyticsEvent(eventName,params);
  };
  if(db && !adminMode){
    window.setTimeout(()=>window.flTrack('page_view',{source:'public_site'}),0);

    // One delegated listener for every static/dynamic element that declares data-track.
    // Keeping this here makes Supabase analytics work even when GA4 is not configured.
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('[data-track]');
      if(!target)return;
      const params={};
      if(target.dataset.trackLocation)params.location=target.dataset.trackLocation;
      if(target.dataset.trackBranch)params.branch=target.dataset.trackBranch;
      params.label=target.dataset.trackLabel || target.getAttribute('aria-label') || target.textContent?.trim().replace(/\s+/g,' ').slice(0,180) || '';
      if(target.href)params.link_url=target.href;
      window.flTrack(target.dataset.track,params);
    },{capture:true});
  }


  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const leadPhoneDigits = value => String(value || '').replace(/\D/g,'');
  const normalizeLeadPhone = value => {
    let digits=leadPhoneDigits(value);
    if(digits.startsWith('00')) digits=digits.slice(2);
    if(/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
    if(/^5\d{8}$/.test(digits)) return `966${digits}`;
    if(/^96605\d{8}$/.test(digits)) return `966${digits.slice(4)}`;
    return digits;
  };
  const safeFileStem = value => String(value || '').trim().toLowerCase().replace(/[\s_]+/g,'-').replace(/[^a-z0-9\u0600-\u06ff-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'contact';
  const newCategorySlug = () => `section-${(crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/-/g,'').slice(0,20)}`;
  const bucket = String(cfg.storageBucket || 'product-images');
  const catalogBucket = 'catalog-files';
  const EMPTY_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f2f4f8"/><path d="M210 525l115-125 82 83 85-105 110 147H210z" fill="#c8d0dc"/><circle cx="310" cy="300" r="55" fill="#d8dee7"/><text x="400" y="650" text-anchor="middle" font-family="Arial" font-size="34" fill="#7b8598">No image</text></svg>')}`;
  const isExternalImage = value => /^(https?:|data:|blob:)/i.test(String(value || '').trim());
  const isStoragePath = value => Boolean(value) && !isExternalImage(value);

  const PRODUCT_SPEC_FIELDS = [
    {key:'sku', label:'SKU / كود المنتج', placeholder:'مثال: WL-205'},
    {key:'wattage', label:'القدرة', unit:'W', placeholder:'مثال: 12'},
    {key:'lumens', label:'اللومن', unit:'lm', placeholder:'مثال: 1200'},
    {key:'cct', label:'حرارة اللون', unit:'K', placeholder:'مثال: 3000 / 4000 / 6500'},
    {key:'cri', label:'CRI', placeholder:'مثال: ≥80 أو ≥90'},
    {key:'voltage', label:'الفولت', unit:'V', placeholder:'مثال: 220-240'},
    {key:'ip_rating', label:'درجة الحماية IP', placeholder:'مثال: IP44'},
    {key:'dimensions', label:'المقاس / الأبعاد', placeholder:'مثال: 30 × 12 × 8 سم'},
    {key:'color', label:'اللون', placeholder:'مثال: أسود / ذهبي'},
    {key:'material', label:'الخامة', placeholder:'مثال: ألمنيوم + أكريليك'},
    {key:'beam_angle', label:'زاوية الإضاءة', unit:'°', placeholder:'مثال: 120'},
    {key:'frequency', label:'التردد', unit:'Hz', placeholder:'مثال: 50/60'},
    {key:'warranty', label:'الضمان', placeholder:'مثال: 3 سنوات'},
    {key:'bulb_base', label:'قاعدة اللمبة', placeholder:'مثال: E27 / GU10'},
    {key:'bulb_count', label:'عدد اللمبات', placeholder:'مثال: 6'}
  ];
  const PRODUCT_SPEC_KEYS = new Set(PRODUCT_SPEC_FIELDS.map(field => field.key));
  const WHATSAPP_META_SHOW_DESCRIPTION='__whatsapp_show_description';
  const WHATSAPP_META_SHOW_SPECS='__whatsapp_show_specifications';
  const PRICING_META_KEY='__pricing_tiers_v2';
  const PRICE_TIER_TYPES=[
    {key:'retail',label:'مفرق',needsRange:false},
    {key:'wholesale',label:'جملة',needsRange:true},
    {key:'bulk',label:'جملة الجملة',needsRange:true}
  ];
  const PRICE_TIER_TYPE_MAP=new Map(PRICE_TIER_TYPES.map(item=>[item.key,item]));

  function normalizePriceTierNumber(value){
    if(value==null || value==='') return null;
    const n=Number(value);
    return Number.isFinite(n) && n>=0 ? n : null;
  }

  function normalizePriceTierQty(value){
    if(value==null || value==='') return null;
    const n=Math.trunc(Number(value));
    return Number.isFinite(n) && n>=1 ? n : null;
  }

  function legacyPricingTiers(product){
    const tiers=[];
    const retail=normalizePriceTierNumber(product?.price);
    const wholesale=normalizePriceTierNumber(product?.wholesale_price);
    const wholesaleMin=normalizePriceTierQty(product?.wholesale_min_qty);
    if(retail!=null) tiers.push({type:'retail',price:retail,min_qty:null,max_qty:null});
    if(wholesale!=null) tiers.push({type:'wholesale',price:wholesale,min_qty:wholesaleMin,max_qty:null});
    return tiers;
  }

  function productPricingTiers(rawSpecifications,legacyProduct=null){
    let parsed=[];
    if(Array.isArray(rawSpecifications)){
      const meta=rawSpecifications.find(item=>item && typeof item==='object' && String(item.key||'').trim()===PRICING_META_KEY);
      if(meta){
        try{
          const value=typeof meta.value==='string'?JSON.parse(meta.value):meta.value;
          if(Array.isArray(value)) parsed=value;
        }catch(_){}
      }
    }
    const tiers=parsed.map(row=>{
      if(!row || typeof row!=='object') return null;
      const type=String(row.type||'').trim();
      if(!PRICE_TIER_TYPE_MAP.has(type)) return null;
      const price=normalizePriceTierNumber(row.price);
      if(price==null) return null;
      const needsRange=PRICE_TIER_TYPE_MAP.get(type)?.needsRange===true;
      let min_qty=needsRange?normalizePriceTierQty(row.min_qty):null;
      let max_qty=needsRange?normalizePriceTierQty(row.max_qty):null;
      if(min_qty!=null && max_qty!=null && max_qty<min_qty)[min_qty,max_qty]=[max_qty,min_qty];
      return {type,price,min_qty,max_qty};
    }).filter(Boolean).slice(0,12);
    return tiers.length?tiers:legacyPricingTiers(legacyProduct);
  }

  function pricingMetaRow(tiers){
    return {key:PRICING_META_KEY,label:'',value:JSON.stringify(Array.isArray(tiers)?tiers:[]),unit:''};
  }

  function pricingTierEditorRowHtml(tier=null){
    const type=PRICE_TIER_TYPE_MAP.has(tier?.type)?tier.type:'retail';
    const options=PRICE_TIER_TYPES.map(item=>`<option value="${item.key}" ${item.key===type?'selected':''}>${item.label}</option>`).join('');
    return `<div class="fl-price-tier-row" data-price-tier-row>
      <div class="fl-cloud-field"><label>نوع السعر</label><select data-price-tier-type>${options}</select></div>
      <div class="fl-cloud-field"><label>السعر (ر.س)</label><input data-price-tier-price type="number" min="0" step="0.01" inputmode="decimal" value="${tier?.price==null?'':esc(tier.price)}" placeholder="مثال: 35"></div>
      <div class="fl-price-tier-range" data-price-tier-range>
        <div class="fl-cloud-field"><label>العدد الأدنى</label><input data-price-tier-min type="number" min="1" step="1" inputmode="numeric" value="${tier?.min_qty==null?'':esc(tier.min_qty)}" placeholder="مثال: 10"></div>
        <div class="fl-cloud-field"><label>العدد الأعلى</label><input data-price-tier-max type="number" min="1" step="1" inputmode="numeric" value="${tier?.max_qty==null?'':esc(tier.max_qty)}" placeholder="مثال: 49"></div>
      </div>
      <button class="fl-price-tier-remove" data-price-tier-remove type="button">حذف</button>
    </div>`;
  }

  function productPricingEditorHtml(prod){
    const tiers=productPricingTiers(prod?.specifications,prod);
    const rows=(tiers.length?tiers:[{type:'retail',price:null,min_qty:null,max_qty:null}]).map(pricingTierEditorRowHtml).join('');
    return `<section class="fl-pricing-editor full">
      <div class="fl-pricing-editor-head">
        <div><strong>الأسعار</strong><small>أضف مفرق أو جملة أو جملة الجملة. في الجملة وجملة الجملة يمكنك تحديد العدد الأدنى والأعلى.</small></div>
        <button class="fl-cloud-btn fl-add-price-tier-btn" id="flAddPriceTier" type="button">+ إضافة خانة سعر</button>
      </div>
      <div id="flPriceTierList" class="fl-price-tier-list">${rows}</div>
      <label class="fl-cloud-check fl-limited-offer-check"><input id="flProdLimitedOffer" type="checkbox" ${prod?.limited_offer===true?'checked':''}> <span><strong>عرض لفترة محدودة</strong><small>عند تفعيله تظهر شارة على زاوية صورة المنتج.</small></span></label>
    </section>`;
  }

  function syncPriceTierRow(row){
    if(!row) return;
    const type=String(row.querySelector('[data-price-tier-type]')?.value||'retail');
    const needsRange=PRICE_TIER_TYPE_MAP.get(type)?.needsRange===true;
    row.classList.toggle('is-retail',!needsRange);
    const range=row.querySelector('[data-price-tier-range]');
    if(range) range.hidden=!needsRange;
  }

  function collectProductPricingTiers(){
    const tiers=[];
    document.querySelectorAll('[data-price-tier-row]').forEach((row,index)=>{
      const type=String(row.querySelector('[data-price-tier-type]')?.value||'retail').trim();
      const def=PRICE_TIER_TYPE_MAP.get(type);
      if(!def) return;
      const rawPrice=String(row.querySelector('[data-price-tier-price]')?.value||'').trim();
      const rawMin=String(row.querySelector('[data-price-tier-min]')?.value||'').trim();
      const rawMax=String(row.querySelector('[data-price-tier-max]')?.value||'').trim();
      if(rawPrice==='' && rawMin==='' && rawMax==='') return;
      const price=normalizePriceTierNumber(rawPrice);
      if(price==null) throw new Error(`أدخل سعرًا صحيحًا في خانة السعر رقم ${index+1}`);
      let min_qty=def.needsRange?normalizePriceTierQty(rawMin):null;
      let max_qty=def.needsRange?normalizePriceTierQty(rawMax):null;
      if(def.needsRange && rawMin!=='' && min_qty==null) throw new Error(`العدد الأدنى في خانة السعر رقم ${index+1} غير صحيح`);
      if(def.needsRange && rawMax!=='' && max_qty==null) throw new Error(`العدد الأعلى في خانة السعر رقم ${index+1} غير صحيح`);
      if(min_qty!=null && max_qty!=null && max_qty<min_qty) throw new Error(`في خانة السعر رقم ${index+1}: العدد الأعلى يجب أن يكون أكبر من أو يساوي العدد الأدنى`);
      tiers.push({type,price,min_qty,max_qty});
    });
    return tiers.slice(0,12);
  }

  function productWhatsAppOption(raw,key){
    if(!Array.isArray(raw)) return false;
    const row=raw.find(item=>item && typeof item==='object' && String(item.key||'').trim()===key);
    if(!row) return false;
    return ['1','true','yes','on'].includes(String(row.value??'').trim().toLowerCase());
  }

  function productWhatsAppMetaRows(){
    return [
      {key:WHATSAPP_META_SHOW_DESCRIPTION,label:'',value:document.getElementById('flProdWhatsAppShowDescription')?.checked?'1':'0',unit:''},
      {key:WHATSAPP_META_SHOW_SPECS,label:'',value:document.getElementById('flProdWhatsAppShowSpecs')?.checked?'1':'0',unit:''}
    ];
  }

  function normalizeSpecifications(raw){
    let rows=[];
    if(Array.isArray(raw)) rows=raw;
    else if(raw && typeof raw==='object') rows=Object.entries(raw).map(([key,value])=>({key,value}));
    return rows.map((row,index)=>{
      if(!row || typeof row!=='object') return null;
      const key=String(row.key||`custom_${index+1}`).trim();
      if(key===WHATSAPP_META_SHOW_DESCRIPTION || key===WHATSAPP_META_SHOW_SPECS || key===PRICING_META_KEY) return null;
      const def=PRODUCT_SPEC_FIELDS.find(field=>field.key===key);
      const label=String(row.label||def?.label||key).trim();
      const value=String(row.value??'').trim();
      const unit=String(row.unit||def?.unit||'').trim();
      return label && value ? {key,label,value,unit} : null;
    }).filter(Boolean).slice(0,30);
  }

  function specificationMap(raw){
    const map=new Map();
    normalizeSpecifications(raw).forEach(spec=>map.set(spec.key,spec));
    return map;
  }

  function specificationEditorValue(spec){
    if(!spec) return '';
    return `${String(spec.value||'').trim()}${spec.unit?` ${String(spec.unit).trim()}`:''}`.trim();
  }

  function productSpecEditorRowHtml(spec=null){
    return `<div class="fl-flex-spec-row" data-flex-spec-row>
      <div class="fl-cloud-field"><label>اسم الصفة</label><input data-flex-spec-label value="${esc(spec?.label||'')}" placeholder="مثال: القدرة"></div>
      <div class="fl-cloud-field"><label>القيمة</label><input data-flex-spec-value value="${esc(specificationEditorValue(spec))}" placeholder="مثال: 30W"></div>
      <button class="fl-flex-spec-remove" data-flex-spec-remove type="button" aria-label="حذف الصفة">حذف</button>
    </div>`;
  }

  function productSpecsFormHtml(prod){
    const specs=normalizeSpecifications(prod?.specifications);
    const rows=(specs.length?specs:[null]).map(spec=>productSpecEditorRowHtml(spec)).join('');
    const showInWhatsApp=productWhatsAppOption(prod?.specifications,WHATSAPP_META_SHOW_SPECS);
    return `<div class="fl-product-spec-section full"><div class="fl-product-spec-head"><div><div class="fl-field-label-inline"><strong>المواصفات الفنية</strong><label class="fl-whatsapp-include-toggle"><input id="flProdWhatsAppShowSpecs" type="checkbox" ${showInWhatsApp?'checked':''}><span>إظهار في رسالة واتساب</span></label></div><small>اكتب اسم الصفة وقيمتها بنفسك، مثل: القدرة — 30W. أضف فقط المواصفات التي تحتاجها.</small></div><button class="fl-cloud-btn fl-add-spec-btn" id="flAddProductSpec" type="button">+ إضافة صفة</button></div><div id="flFlexibleSpecs" class="fl-flex-spec-list">${rows}</div></div>`;
  }

  function collectProductSpecifications(pricingTiers=[]){
    const specs=[];
    document.querySelectorAll('[data-flex-spec-row]').forEach((row,index)=>{
      const label=String(row.querySelector('[data-flex-spec-label]')?.value||'').trim();
      const value=String(row.querySelector('[data-flex-spec-value]')?.value||'').trim();
      if(!label || !value) return;
      specs.push({
        key:`custom_${index+1}`,
        label,
        value,
        unit:'',
      });
    });
    return [...specs.slice(0,30),...productWhatsAppMetaRows(),pricingMetaRow(pricingTiers)];
  }

  function imageUrl(path){
    if (!path) return EMPTY_IMAGE;
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (!db) return '';
    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  function catalogFileUrl(path){
    const value=String(path||'').trim();
    if(!value) return '';
    if(/^(https?:|data:|blob:)/i.test(value)) return value;
    if(!db) return '';
    return db.storage.from(catalogBucket).getPublicUrl(value).data.publicUrl;
  }

  const contactLabels = {
    phone:'جوال',
    whatsapp:'واتساب',
    website:'الموقع الإلكتروني',
    email:'البريد الإلكتروني',
    location:'الموقع'
  };

  function cleanPhone(value){ return String(value || '').replace(/[^\d+]/g,''); }
  function cleanWhatsApp(value){ return window.flNormalizeWhatsAppNumber ? window.flNormalizeWhatsAppNumber(value) : String(value || '').replace(/\D/g,''); }
  function normalizeWebsite(value){
    const v=String(value||'').trim();
    if(!v) return '';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  }
  function contactHref(item){
    const value=String(item?.value||'').trim();
    if(!value) return '#';
    if(item.type==='phone') return `tel:${cleanPhone(value)}`;
    if(item.type==='whatsapp') return `https://wa.me/${cleanWhatsApp(value)}`;
    if(item.type==='email') return `mailto:${value}`;
    if(item.type==='website' || item.type==='location') return normalizeWebsite(value);
    return '#';
  }
  function contactPhoneKey(value){
    const normalized=cleanWhatsApp(value);
    return normalized || String(value||'').replace(/\D/g,'');
  }
  function groupedPublicContacts(list){
    const result=[];
    const phoneGroups=new Map();
    let locationGroup=null;
    (list||[]).forEach(item=>{
      if(item?.type==='phone' || item?.type==='whatsapp'){
        const key=contactPhoneKey(item.value);
        if(key){
          let group=phoneGroups.get(key);
          if(!group){group={kind:'phone',key,items:[]};phoneGroups.set(key,group);result.push(group);}
          group.items.push(item);
          return;
        }
      }
      if(item?.type==='location'){
        if(!locationGroup){locationGroup={kind:'locations',items:[]};result.push(locationGroup);}
        locationGroup.items.push(item);
        return;
      }
      result.push({kind:'single',item});
    });
    return result;
  }
  const contactChoiceModal=document.getElementById('contactChoiceModal');
  const contactChoiceSubtitle=document.getElementById('contactChoiceSubtitle');
  const contactChoiceCall=document.getElementById('contactChoiceCall');
  const contactChoiceWhatsApp=document.getElementById('contactChoiceWhatsApp');
  const closeContactChoiceButton=document.getElementById('closeContactChoice');
  let contactChoiceLastFocus=null;
  function closeContactChoice(restoreFocus=true){
    if(!contactChoiceModal?.classList.contains('open'))return;
    contactChoiceModal.classList.remove('open');
    contactChoiceModal.setAttribute('aria-hidden','true');
    if(restoreFocus && contactChoiceLastFocus && typeof contactChoiceLastFocus.focus==='function') contactChoiceLastFocus.focus();
  }
  function openContactUrl(url){
    const target=String(url||'').trim();
    if(!target || target==='#') return;
    // Same-tab navigation is the most reliable way to hand tel:, wa.me and maps links to mobile OS/apps.
    window.location.href=target;
  }
  function openContactChoice(group,trigger){
    if(!contactChoiceModal)return;
    const phone=group.items.find(item=>item.type==='phone');
    const whatsapp=group.items.find(item=>item.type==='whatsapp');
    if(!phone || !whatsapp)return;
    const label=phone.label||whatsapp.label||'تواصل';
    const value=phone.value||whatsapp.value||'';
    contactChoiceLastFocus=trigger||document.activeElement;
    if(contactChoiceSubtitle)contactChoiceSubtitle.textContent=`${label} · ${value}`;
    if(contactChoiceCall)contactChoiceCall.href=contactHref(phone);
    if(contactChoiceWhatsApp)contactChoiceWhatsApp.href=contactHref(whatsapp);
    contactChoiceModal.classList.add('open');
    contactChoiceModal.setAttribute('aria-hidden','false');
    window.setTimeout(()=>contactChoiceCall?.focus(),0);
  }
  closeContactChoiceButton?.addEventListener('click',closeContactChoice);
  contactChoiceModal?.addEventListener('click',event=>{if(event.target===contactChoiceModal)closeContactChoice();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&contactChoiceModal?.classList.contains('open'))closeContactChoice();});
  contactChoiceCall?.addEventListener('click',event=>{
    event.preventDefault();
    const href=contactChoiceCall.getAttribute('href');
    if(typeof window.flTrack==='function')window.flTrack('contact_phone',{source:'combined_contact'});
    closeContactChoice(false);
    openContactUrl(href);
  });
  contactChoiceWhatsApp?.addEventListener('click',event=>{
    event.preventDefault();
    const href=contactChoiceWhatsApp.getAttribute('href');
    if(typeof window.flTrack==='function')window.flTrack('contact_whatsapp',{source:'combined_contact'});
    closeContactChoice(false);
    openContactUrl(href);
  });

  const locationChoiceModal=document.getElementById('locationChoiceModal');
  const locationChoiceList=document.getElementById('locationChoiceList');
  const closeLocationChoiceButton=document.getElementById('closeLocationChoice');
  let locationChoiceLastFocus=null;
  function closeLocationChoice(restoreFocus=true){
    if(!locationChoiceModal?.classList.contains('open'))return;
    locationChoiceModal.classList.remove('open');
    locationChoiceModal.setAttribute('aria-hidden','true');
    if(restoreFocus && locationChoiceLastFocus && typeof locationChoiceLastFocus.focus==='function') locationChoiceLastFocus.focus();
  }
  function openLocationChoice(items,trigger){
    const locations=(items||[]).filter(item=>item?.type==='location' && String(item.value||'').trim());
    if(!locationChoiceModal || !locationChoiceList || !locations.length)return;
    locationChoiceLastFocus=trigger||document.activeElement;
    locationChoiceList.innerHTML=locations.map((item,index)=>`<button class="location-choice-item" type="button" data-location-index="${index}"><span class="location-choice-item-icon">${contactIcon('location')}</span><span><strong>${esc(item.label||`الفرع ${index+1}`)}</strong><small>${esc(item.value)}</small></span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>`).join('');
    locationChoiceList.querySelectorAll('[data-location-index]').forEach(button=>{
      button.addEventListener('click',()=>{
        const item=locations[Number(button.dataset.locationIndex)];
        if(!item)return;
        if(typeof window.flTrack==='function')window.flTrack('contact_location',{source:'location_picker',label:item.label||''});
        const href=contactHref(item);
        closeLocationChoice(false);
        openContactUrl(href);
      });
    });
    locationChoiceModal.classList.add('open');
    locationChoiceModal.setAttribute('aria-hidden','false');
    window.setTimeout(()=>locationChoiceList.querySelector('button')?.focus(),0);
  }
  closeLocationChoiceButton?.addEventListener('click',()=>closeLocationChoice());
  locationChoiceModal?.addEventListener('click',event=>{if(event.target===locationChoiceModal)closeLocationChoice();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&locationChoiceModal?.classList.contains('open'))closeLocationChoice();});

  function contactIcon(type){
    if(type==='phone') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.28-1.28a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z"></path></svg>';
    if(type==='whatsapp') return '<svg viewBox="0 0 24 24" aria-hidden="true" style="fill:currentColor;stroke:none;color:#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.9 6.988c-.002 5.45-4.436 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.055 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.689 1.448h.005c6.557 0 11.893-5.335 11.896-11.893a11.82 11.82 0 0 0-3.488-8.413Z"></path></svg>';
    if(type==='email') return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>';
    if(type==='location') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  }

  function setText(id,value){
    const el=document.getElementById(id); if(!el) return;
    const v=String(value||'').trim(); el.textContent=v; el.hidden=!v;
  }
  function setImage(id,path,alt='',fallback=''){
    const el=document.getElementById(id); if(!el) return;
    if(path){
      el.onerror=fallback?()=>{el.onerror=null;el.src=fallback;el.hidden=false;}:null;
      el.src=imageUrl(path);el.alt=alt;el.hidden=false;
    } else if(fallback){
      el.onerror=null;el.src=fallback;el.alt=alt;el.hidden=false;
    } else {
      el.onerror=null;el.removeAttribute('src');el.alt='';el.hidden=true;
    }
  }

  const BUNDLED_SITE_LOGO=new URL('company-logo.png?v=75',document.baseURI).href;
  function bundledSiteLogo(){
    return BUNDLED_SITE_LOGO;
  }

  function renderPublicProfile(){
    const profile=window.FLOWER_LIGHT_PROFILE || {};
    const contacts=(Array.isArray(window.FLOWER_LIGHT_CONTACTS)?window.FLOWER_LIGHT_CONTACTS:[]).filter(c=>c.is_visible!==false && String(c.value||'').trim());
    const brand=String(profile.brand_name||'').trim();
    const company=String(profile.company_name||'').trim();
    const fullName=String(profile.full_name||'').trim();
    const jobAr=String(profile.job_title_ar||'').trim();
    const jobEn=String(profile.job_title_en||'').trim();

    const activeLogo=bundledSiteLogo();
    setImage('siteLogo',activeLogo,brand||company||'Logo');
    setImage('siteWatermark',activeLogo,'');
    setImage('sitePortrait',profile.portrait_path,fullName||'');
    setText('siteBrandName',brand);
    setText('siteCompanyName',company);
    setText('siteFullName',fullName);
    setText('siteJobTitleAr',jobAr);
    setText('siteJobTitleEn',jobEn);

    const brandRow=document.getElementById('siteBrandRow');
    const brandText=document.getElementById('siteBrandText');
    if(brandText) brandText.hidden=!(brand||company);
    if(brandRow) brandRow.hidden=!(brand||company||activeLogo);
    const portraitWrap=document.getElementById('sitePortraitWrap');
    if(portraitWrap) portraitWrap.hidden=!profile.portrait_path;
    const person=document.getElementById('sitePerson');
    if(person) person.hidden=!(fullName||jobAr||jobEn);
    const identity=document.getElementById('siteIdentity');
    if(identity) identity.hidden=!(profile.portrait_path||fullName||jobAr||jobEn);
    const hero=document.getElementById('siteHero');
    if(hero) hero.classList.toggle('profile-empty',!(brand||company||activeLogo||profile.portrait_path||fullName||jobAr||jobEn));

    document.title=isPrimaryAdmin?'لوحة المدير | Flower Light':'لوحة الأدمن | Flower Light';
    const card=document.getElementById('publicCard');
    if(card) card.setAttribute('aria-label',fullName?`Digital business card for ${fullName}`:'Digital business card');

    const quick=document.getElementById('quickActions');
    if(quick){
      const quickItems=[];
      const firstPhone=contacts.find(c=>c.type==='phone');
      const firstWhatsApp=contacts.find(c=>c.type==='whatsapp');
      const locations=contacts.filter(c=>c.type==='location');
      if(firstPhone)quickItems.push({kind:'direct',item:firstPhone});
      if(firstWhatsApp)quickItems.push({kind:'direct',item:firstWhatsApp});
      if(locations.length)quickItems.push({kind:'locations',items:locations});
      quick.innerHTML=quickItems.map((entry,index)=>{
        if(entry.kind==='locations') return `<button class="action" type="button" data-quick-locations="${index}" aria-label="الموقع الجغرافي، اختر الفرع">${contactIcon('location')}<span>المواقع</span></button>`;
        const item=entry.item;
        return `<a class="action" href="${esc(contactHref(item))}" data-contact-direct="1" data-track="contact_${esc(item.type)}" aria-label="${esc(item.label||contactLabels[item.type]||'Contact')}">${contactIcon(item.type)}<span>${esc(item.label||contactLabels[item.type]||'Contact')}</span></a>`;
      }).join('');
      quick.querySelectorAll('[data-contact-direct]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openContactUrl(link.getAttribute('href'));}));
      quick.querySelectorAll('[data-quick-locations]').forEach(button=>button.addEventListener('click',()=>openLocationChoice(locations,button)));
      quick.hidden=!quickItems.length;
    }

    const list=document.getElementById('contactInfoList');
    if(list){
      const displayContacts=groupedPublicContacts(contacts);
      list.innerHTML=displayContacts.map((entry,index)=>{
        if(entry.kind==='locations') {
          const count=entry.items.length;
          return `<button class="info-item" type="button" data-location-choice="${index}" aria-label="الموقع الجغرافي، اختر الفرع"><span class="info-icon">${contactIcon('location')}</span><span class="info-main"><span class="info-label">الموقع الجغرافي</span><span class="info-value">${count>1?`اختر من ${count} فروع`:'اختر الفرع'}</span></span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>`;
        }
        if(entry.kind==='single') {
          const item=entry.item;
          return `<a class="info-item" href="${esc(contactHref(item))}" data-contact-direct="1" data-track="contact_${esc(item.type)}"><span class="info-icon">${contactIcon(item.type)}</span><span class="info-main"><span class="info-label">${esc(item.label||contactLabels[item.type]||'Contact')}</span><span class="info-value">${esc(item.value)}</span></span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></a>`;
        }
        const phone=entry.items.find(item=>item.type==='phone');
        const whatsapp=entry.items.find(item=>item.type==='whatsapp');
        if(!(phone&&whatsapp)){
          const item=phone||whatsapp||entry.items[0];
          return `<a class="info-item" href="${esc(contactHref(item))}" ${item.type==='whatsapp'?'target="_blank" rel="noopener noreferrer"':''} data-track="contact_${esc(item.type)}"><span class="info-icon">${contactIcon(item.type)}</span><span class="info-main"><span class="info-label">${esc(item.label||contactLabels[item.type]||'Contact')}</span><span class="info-value">${esc(item.value)}</span></span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></a>`;
        }
        const label=phone.label||whatsapp.label||'تواصل';
        const value=phone.value||whatsapp.value||'';
        return `<button class="info-item" type="button" data-contact-choice="${index}" aria-label="${esc(label)}، اختر اتصال أو واتساب"><span class="info-icon">${contactIcon('phone')}</span><span class="info-main"><span class="info-label">${esc(label)} · اتصال أو واتساب</span><span class="info-value">${esc(value)}</span></span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg></button>`;
      }).join('');
      list.querySelectorAll('[data-contact-direct]').forEach(link=>{
        link.addEventListener('click',event=>{event.preventDefault();openContactUrl(link.getAttribute('href'));});
      });
      list.querySelectorAll('[data-location-choice]').forEach(button=>{
        button.addEventListener('click',()=>{const entry=displayContacts[Number(button.dataset.locationChoice)];if(entry?.kind==='locations')openLocationChoice(entry.items,button);});
      });
      list.querySelectorAll('[data-contact-choice]').forEach(button=>{
        button.addEventListener('click',()=>{const entry=displayContacts[Number(button.dataset.contactChoice)];if(entry?.kind==='phone')openContactChoice(entry,button);});
      });
    }
    const title=document.getElementById('contactTitle'); if(title) title.hidden=!contacts.length;

    const save=document.getElementById('saveContact');
    if(save) save.hidden=!(fullName||brand||company||contacts.length);

    const footer=document.getElementById('siteFooter');
    if(footer){const f=[brand||company,'DIGITAL BUSINESS CARD'].filter(Boolean).join(' · ');footer.textContent=f;footer.hidden=!f;}

    const sub=document.getElementById('productsButtonSubtitle');
    if(sub) sub.textContent=(brand||company)?`كتالوج منتجات ${brand||company}`:'تصفح الأقسام والمنتجات';
    const kicker=document.getElementById('catalogKicker');
    if(kicker){kicker.textContent=brand||company;kicker.hidden=!(brand||company);}
    const note=document.getElementById('catalogNote');
    if(note){
      const catalogName=(brand||company)?`أقسام ومنتجات ${brand||company}`:'الأقسام والمنتجات';
      note.textContent=`استعرض ${catalogName}.`;
    }
    window.flRenderProducts?.();
  }


  let publicSiteSettingsPromise=Promise.resolve(false);
  async function loadPublicSiteSettings(){
    const fallback={require_customer_lead:true};
    if(!db){window.FLOWER_LIGHT_SITE_SETTINGS=fallback;return false;}
    try{
      const {data,error}=await db.from('site_settings').select('require_customer_lead').eq('id',1).maybeSingle();
      if(error)throw error;
      window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:data?.require_customer_lead!==false};
      return true;
    }catch(err){
      console.warn('[Site settings] load failed; customer lead gate remains enabled for safety.',err);
      window.FLOWER_LIGHT_SITE_SETTINGS=fallback;
      return false;
    }
  }
  window.flLoadPublicSiteSettings=loadPublicSiteSettings;

  async function loadPublicProfile(){
    if(!db){window.FLOWER_LIGHT_PROFILE={};window.FLOWER_LIGHT_CONTACTS=[];renderPublicProfile();return false;}
    try{
      const [{data:profile,error:pe},{data:contacts,error:ce}]=await Promise.all([
        db.from('site_profile').select('*').eq('id',1).maybeSingle(),
        db.from('contact_items').select('*').eq('is_visible',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true})
      ]);
      if(pe||ce) throw pe||ce;
      window.FLOWER_LIGHT_PROFILE=profile||{};
      window.FLOWER_LIGHT_CONTACTS=contacts||[];
      renderPublicProfile();
      return true;
    }catch(err){
      console.warn('[Site profile] load failed',err);
      window.FLOWER_LIGHT_PROFILE={};window.FLOWER_LIGHT_CONTACTS=[];renderPublicProfile();
      return false;
    }
  }
  window.flLoadPublicProfile=loadPublicProfile;

  async function loadPublicSiteCatalog(){
    if(!db){window.FLOWER_LIGHT_SITE_CATALOGS=[];window.FLOWER_LIGHT_SITE_CATALOG={};window.flRenderProducts?.();return false;}
    try{
      const {data,error}=await db.from('site_catalogs').select('*').eq('is_visible',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
      if(error) throw error;
      const rows=(Array.isArray(data)?data:[]).map(row=>({
        ...row,
        id:String(row.id||''),
        name:String(row.name||'الكتالوج'),
        description:String(row.description||''),
        pdf_path:String(row.pdf_path||''),
        file_name:String(row.file_name||''),
        pdf_url:row.pdf_path?catalogFileUrl(row.pdf_path):''
      })).filter(row=>row.pdf_url);
      window.FLOWER_LIGHT_SITE_CATALOGS=rows;
      window.FLOWER_LIGHT_SITE_CATALOG=rows[0]||{};
      window.flRenderProducts?.();
      return true;
    }catch(err){
      const code=String(err?.code||'');
      if(code!=='42P01'&&code!=='PGRST205') console.warn('[Site catalogs] load failed',err);
      // Backward-compatible fallback for the legacy single-catalog schema.
      try{
        const {data,error}=await db.from('site_catalog').select('*').eq('id',1).maybeSingle();
        if(error) throw error;
        const row=data||{};
        const legacy=row.pdf_path?{id:'legacy',name:'الكتالوج',description:'',pdf_path:String(row.pdf_path||''),file_name:String(row.file_name||''),pdf_url:catalogFileUrl(row.pdf_path),sort_order:0,is_visible:true}:null;
        window.FLOWER_LIGHT_SITE_CATALOGS=legacy?[legacy]:[];
        window.FLOWER_LIGHT_SITE_CATALOG=legacy||{};
        window.flRenderProducts?.();
        return Boolean(legacy);
      }catch(_){
        window.FLOWER_LIGHT_SITE_CATALOGS=[];window.FLOWER_LIGHT_SITE_CATALOG={};window.flRenderProducts?.();return false;
      }
    }
  }
  window.flLoadPublicSiteCatalog=loadPublicSiteCatalog;

  function vcardEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
  function downloadDynamicVCard(){
    const p=window.FLOWER_LIGHT_PROFILE||{};
    const contacts=(Array.isArray(window.FLOWER_LIGHT_CONTACTS)?window.FLOWER_LIGHT_CONTACTS:[]).filter(c=>c.is_visible!==false&&String(c.value||'').trim());
    const fullName=String(p.full_name||p.brand_name||p.company_name||'Flower Light').trim();
    if(!fullName&&!contacts.length) return;

    const name=vcardEscape(fullName||'Flower Light');
    const lines=['BEGIN:VCARD','VERSION:3.0',`N:;${name};;;`,`FN:${name}`];
    const org=String(p.company_name||p.brand_name||'').trim();
    const title=[p.job_title_ar,p.job_title_en].filter(Boolean).join(' / ').trim();
    if(org) lines.push(`ORG:${vcardEscape(org)}`);
    if(title) lines.push(`TITLE:${vcardEscape(title)}`);

    const seenPhones=new Set();
    contacts.forEach(item=>{
      if(item.type==='phone' || item.type==='whatsapp'){
        let raw=String(item.value||'').trim();
        let digits=raw.replace(/\D/g,'');
        if(digits.startsWith('00')) digits=digits.slice(2);
        if(/^05\d{8}$/.test(digits)) digits=`966${digits.slice(1)}`;
        else if(/^5\d{8}$/.test(digits)) digits=`966${digits}`;
        else if(/^96605\d{8}$/.test(digits)) digits=`966${digits.slice(4)}`;
        if(digits && !seenPhones.has(digits)){
          seenPhones.add(digits);
          lines.push(`TEL;TYPE=CELL:+${digits}`);
        }
      } else if(item.type==='email') {
        lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(String(item.value||'').trim())}`);
      } else if(item.type==='website') {
        lines.push(`URL:${vcardEscape(normalizeWebsite(item.value))}`);
      }
    });

    lines.push('END:VCARD');
    const content=lines.join('\r\n')+'\r\n';
    const blob=new Blob([content],{type:'text/x-vcard;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='flower-light-contact.vcf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  document.getElementById('saveContact')?.addEventListener('click',()=>{downloadDynamicVCard();if(typeof window.flTrack==='function')window.flTrack('save_contact',{});});

  async function loadCloudProducts(){
    if (!db) return false;
    try {
      const [{data:cats,error:ce},{data:prods,error:pe},{data:galleryRows,error:ge}] = await Promise.all([
        db.from('categories').select('*').eq('is_visible',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
        db.from('products').select('*').eq('is_visible',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
        db.from('product_images').select('id,product_id,image_path,sort_order,is_primary,created_at').order('sort_order',{ascending:true}).order('created_at',{ascending:true})
      ]);
      if (ce || pe) throw ce || pe;
      if (ge) console.warn('[Site] Product gallery metadata unavailable.', ge.message || ge);
      const visibleCats = Array.isArray(cats) ? cats : [];
      const visibleProds = Array.isArray(prods) ? prods : [];
      const galleryMap = new Map();
      (Array.isArray(galleryRows) ? galleryRows : []).forEach(row=>{
        if(!row?.product_id || !row?.image_path) return;
        if(!galleryMap.has(row.product_id)) galleryMap.set(row.product_id,[]);
        galleryMap.get(row.product_id).push(row);
      });
      const grouped = new Map();
      visibleCats.forEach(c => grouped.set(c.id, []));
      visibleProds.forEach(p => {
        if (!grouped.has(p.category_id)) return;
        let gallery=(galleryMap.get(p.id)||[]).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
        if(p.image_path && !gallery.some(row=>row.image_path===p.image_path)){
          gallery.unshift({id:'',product_id:p.id,image_path:p.image_path,sort_order:-1,is_primary:true});
        }
        gallery=gallery.slice(0,4);
        let primaryIndex=gallery.findIndex(row=>row.image_path===p.image_path);
        if(primaryIndex<0) primaryIndex=gallery.findIndex(row=>row.is_primary===true);
        if(primaryIndex<0 && gallery.length) primaryIndex=0;
        if(primaryIndex>0){const [primary]=gallery.splice(primaryIndex,1);gallery.unshift(primary);}
        const primaryPath=gallery[0]?.image_path || p.image_path || p.image_url || '';
        grouped.get(p.category_id).push({
          id:p.id, name:p.name || '', model:p.model || '', caption:p.caption || '',
          alt:p.caption || p.name || '', category:'', category_id:p.category_id || '', category_slug:'',
          image:imageUrl(primaryPath), image_path:primaryPath,
          gallery:gallery.map((row,index)=>({
            id:row.id||'',image_path:row.image_path,image:imageUrl(row.image_path),is_primary:index===0,sort_order:index*10
          })),
          specifications:Array.isArray(p.specifications) ? p.specifications : [],
          price:p.price==null?null:Number(p.price),
          wholesale_price:p.wholesale_price==null?null:Number(p.wholesale_price),
          wholesale_min_qty:p.wholesale_min_qty==null?null:Number(p.wholesale_min_qty),
          limited_offer:p.limited_offer===true,
          catalog_pdf_path:'',
          catalog_pdf_url:'',
          sort_order:p.sort_order || 0, is_visible:p.is_visible !== false
        });
      });
      const extraSections = visibleCats.map(c => {
        const items = grouped.get(c.id) || [];
        items.forEach(item => { item.category = c.name; item.category_id = c.id; item.category_slug = c.slug || c.id; });
        return { id:c.id, name:c.name, slug:c.slug, description:c.description || '', sort_order:c.sort_order || 0, items };
      });
      window.FLOWER_LIGHT_PRODUCTS = { catalog: [], chandeliers: [], balfon: [], extraSections };
      window.flRenderProducts?.();
      return true;
    } catch (err) {
      console.warn('[Site] Supabase load failed.', err);
      window.FLOWER_LIGHT_PRODUCTS = { catalog: [], chandeliers: [], balfon: [], extraSections: [] };
      window.flRenderProducts?.();
      return false;
    }
  }
  window.flLoadCloudProducts = loadCloudProducts;

  // Public data starts empty and is populated only from Supabase.
  window.FLOWER_LIGHT_PROFILE = {};
  window.FLOWER_LIGHT_CONTACTS = [];
  window.FLOWER_LIGHT_SITE_CATALOGS = [];
  window.FLOWER_LIGHT_SITE_CATALOG = {};
  window.FLOWER_LIGHT_SITE_SETTINGS = { require_customer_lead: true };
  window.FLOWER_LIGHT_PRODUCTS = { catalog: [], chandeliers: [], balfon: [], extraSections: [] };
  renderPublicProfile();
  if (db) { publicSiteSettingsPromise=loadPublicSiteSettings(); loadPublicProfile(); loadPublicSiteCatalog(); loadCloudProducts(); }

  // Customer lead gate: visitors enter their details once before opening products.
  const leadGate=document.getElementById('flLeadGate');
  const leadForm=document.getElementById('flLeadForm');
  const leadClose=document.getElementById('flLeadClose');
  const leadError=document.getElementById('flLeadError');
  const leadSubmit=document.getElementById('flLeadSubmit');
  let leadGatePromise=null;
  let leadGateResolve=null;
  let leadLastFocus=null;
  const leadAccessKey='flower_light_customer_access_v1';
  const leadSubmitKey='flower_light_customer_submit_v1';
  const leadSubmitCooldownMs=30000;
  let leadOpenedAt=0;
  const hasLeadAccess=()=>{try{return localStorage.getItem(leadAccessKey)==='1';}catch(_){return false;}};
  const rememberLeadAccess=()=>{try{localStorage.setItem(leadAccessKey,'1');}catch(_){}};
  function finishLeadGate(allowed){
    leadGate?.classList.remove('open');
    leadGate?.setAttribute('aria-hidden','true');
    document.body.classList.remove('fl-lead-open');
    if(leadLastFocus && typeof leadLastFocus.focus==='function') leadLastFocus.focus();
    const resolve=leadGateResolve;
    leadGateResolve=null;leadGatePromise=null;
    if(resolve)resolve(Boolean(allowed));
  }
  async function requestLeadAccess(){
    try{await publicSiteSettingsPromise;}catch(_){}
    if(window.FLOWER_LIGHT_SITE_SETTINGS?.require_customer_lead===false)return true;
    if(hasLeadAccess())return true;
    if(!db || !leadGate || !leadForm)return false;
    if(leadGatePromise)return leadGatePromise;
    leadLastFocus=document.activeElement;
    leadError?.classList.remove('show');
    if(leadError)leadError.textContent='';
    leadGate.classList.add('open');leadGate.setAttribute('aria-hidden','false');document.body.classList.add('fl-lead-open');
    leadOpenedAt=Date.now();
    window.setTimeout(()=>document.getElementById('flLeadName')?.focus(),50);
    leadGatePromise=new Promise(resolve=>{leadGateResolve=resolve;});
    return leadGatePromise;
  }
  window.flBeforeProductsOpen=()=>{
    if(adminMode)return Promise.resolve(true);
    return requestLeadAccess();
  };
  leadClose?.addEventListener('click',()=>finishLeadGate(false));
  leadGate?.addEventListener('click',e=>{if(e.target===leadGate)finishLeadGate(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&leadGate?.classList.contains('open'))finishLeadGate(false);});
  leadForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    const full_name=document.getElementById('flLeadName').value.trim();
    const company_name=document.getElementById('flLeadCompany').value.trim();
    const mobile=document.getElementById('flLeadMobile').value.trim();
    const honeypot=(document.getElementById('flLeadWebsite')?.value||'').trim();
    const digits=leadPhoneDigits(mobile);
    if(honeypot){rememberLeadAccess();leadForm.reset();finishLeadGate(true);return;}
    if(Date.now()-leadOpenedAt<900){leadError.textContent='انتظر لحظة ثم حاول مرة أخرى.';leadError.classList.add('show');return;}
    try{
      const lastSubmit=Number(localStorage.getItem(leadSubmitKey)||0);
      if(lastSubmit && Date.now()-lastSubmit<leadSubmitCooldownMs){
        rememberLeadAccess();leadForm.reset();finishLeadGate(true);return;
      }
    }catch(_){}
    if(full_name.length<2){leadError.textContent='اكتب الاسم بشكل صحيح.';leadError.classList.add('show');return;}
    if(company_name && company_name.length<2){leadError.textContent='اكتب اسم الشركة بشكل صحيح أو اتركه فارغًا.';leadError.classList.add('show');return;}
    if(digits.length<9 || digits.length>15){leadError.textContent='اكتب رقم جوال صحيح.';leadError.classList.add('show');return;}
    leadError.classList.remove('show');leadError.textContent='';
    leadSubmit.disabled=true;leadSubmit.textContent='جاري الحفظ...';
    try{
      const {error}=await db.from('customer_leads').insert({full_name,company_name,mobile});
      if(error)throw error;
      try{localStorage.setItem(leadSubmitKey,String(Date.now()));}catch(_){}
      rememberLeadAccess();
      if(typeof window.flTrack==='function')window.flTrack('customer_lead_saved',{source:'products_gate'});
      leadForm.reset();
      finishLeadGate(true);
    }catch(err){
      console.warn('[Site] Customer lead save failed.',err);
      leadError.textContent='تعذر حفظ البيانات الآن. تحقق من الاتصال وحاول مرة أخرى.';leadError.classList.add('show');
    }finally{
      leadSubmit.disabled=false;leadSubmit.textContent='متابعة إلى المنتجات';
    }
  });

  if (!adminMode) return;

  const shell = document.getElementById('flCloudAdmin');
  const body = document.getElementById('flCloudAdminBody');
  const logoutBtn = document.getElementById('flCloudLogout');
  const modal = document.getElementById('flCloudModal');
  const modalTitle = document.getElementById('flCloudModalTitle');
  const modalBody = document.getElementById('flCloudModalBody');
  const toast = document.getElementById('flCloudToast');
  const adminTitle = document.getElementById('flCloudAdminTitle');
  const adminSubtitle = document.getElementById('flCloudAdminSubtitle');
  const primaryAdminBtn = document.getElementById('flCloudPrimaryAdmin');
  const assistantAdminBtn = document.getElementById('flCloudAssistantAdmin');
  if(adminTitle) adminTitle.textContent = isPrimaryAdmin ? 'لوحة المدير' : 'لوحة الأدمن';
  if(adminSubtitle) adminSubtitle.textContent = isPrimaryAdmin ? 'جميع أدوات الموقع والصلاحيات' : 'إدارة الصلاحيات المتاحة';
  if(primaryAdminBtn) primaryAdminBtn.hidden = !isPrimaryAdmin;
  primaryAdminBtn?.classList.toggle('active',isPrimaryAdmin);
  assistantAdminBtn?.classList.toggle('active',!isPrimaryAdmin);
  shell.classList.add('open'); shell.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  let view='overview'; let categories=[]; let products=[]; let productImages=[]; let siteCatalogs=[]; let profile={}; let contacts=[]; let leads=[]; let selectedCategory=''; let selectedProductNode=''; let analyticsPeriod=30; let cloudNavScrollLeft=0;
  let customerLeadGateEnabled=window.FLOWER_LIGHT_SITE_SETTINGS?.require_customer_lead!==false;
  let customerLeadGateSettingError='';
  let passwordRecoveryMode=/(?:^|[#&?])type=recovery(?:&|$)/i.test(`${location.search}${location.hash}`);
  const LEADS_PAGE_SIZE=100;
  let leadsTotalCount=0;
  let leadsAllTotalCount=0;
  let leadsHasMore=false;
  let leadsLoading=false;
  let leadsSearchTerm='';
  const adminViewItems = [
    ['analytics','الإحصائيات'],
    ['datasheet','صمّم داتا شيت'],
    ['sections','الأقسام'],
    ['products','المنتجات'],
    ['profile','البيانات الشخصية'],
    ['contacts','وسائل التواصل'],
    ['leads','جهات اتصال العملاء']
  ];
  const validPermissionKeys = new Set(adminViewItems.map(([key])=>key));
  const delegatablePermissionKeys = new Set([...validPermissionKeys].filter(key=>!['sections','products'].includes(key)));
  let currentAdminRole='';
  let currentAdminEmail='';
  let currentAdminPermissions=new Set();
  let managedAdmin2Email='';
  let managedAdmin2Permissions=new Set();
  let primaryRecoveryEmail='';
  let recoveryContext=null;
  let recoveryPortalRendered=false;
  let datasheetFields=null;
  let datasheetLoadPromise=null;
  let datasheetLoadError='';
  const allowedAdminViews = () => new Set(isPrimaryAdmin
    ? ['overview',...validPermissionKeys,'credentials','permissions']
    : ['overview',...currentAdminPermissions]);
  const normalizeAdminView = candidate => allowedAdminViews().has(candidate) ? candidate : 'overview';
  let toastTimer;
  const notify = msg => { toast.textContent=msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2600); };
  const openModal = (title, html) => { modalTitle.textContent=title; modalBody.innerHTML=html; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); modalBody.innerHTML=''; };
  document.getElementById('flCloudModalClose').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
  document.getElementById('flCloudPreview').addEventListener('click',()=>{ location.href=location.pathname; });
  async function switchAdminPanel(mode){
    if((mode===1&&isPrimaryAdmin)||(mode===2&&!isPrimaryAdmin))return;
    try{if(db)await db.auth.signOut();}catch{}
    const url=new URL(location.href);
    url.searchParams.set('admin',String(mode));
    url.hash='';
    location.href=url.pathname+url.search;
  }
  primaryAdminBtn?.addEventListener('click',()=>switchAdminPanel(1));
  assistantAdminBtn?.addEventListener('click',()=>switchAdminPanel(2));
  logoutBtn.addEventListener('click', async()=>{
    if(db) await db.auth.signOut();
    if(recoveryPortalRequested){
      location.href=`${location.pathname}?admin=1`;
      return;
    }
    renderLogin();
  });

  function normalizePermissionList(value){
    const list=Array.isArray(value) ? value : (Array.isArray(value?.permissions) ? value.permissions : []);
    return [...new Set(list.map(String).filter(key=>delegatablePermissionKeys.has(key)))];
  }

  async function loadCurrentAdminAccess(){
    const {data,error}=await db.rpc('get_current_admin_access');
    if(error)throw new Error((String(error.code)==='PGRST202'||String(error.code)==='42883') ? 'شغّل ملف FINAL_SQL_STAGE84.sql في Supabase أولًا.' : (error.message||error));
    currentAdminRole=String(data?.role||'');
    currentAdminEmail=String(data?.email||'');
    currentAdminPermissions=new Set(normalizePermissionList(data));
    const expectedRole=isPrimaryAdmin?'owner':'subadmin';
    if(currentAdminRole!==expectedRole){
      throw new Error(isPrimaryAdmin
        ? 'هذا الرابط مخصص لحساب المدير الأساسي Owner فقط.'
        : 'هذا الرابط مخصص لحساب الأدمن فقط.');
    }
    if(primaryAdminBtn) primaryAdminBtn.hidden = currentAdminRole !== 'owner';
    if(isPrimaryAdmin){
      const {data:settings,error:settingsError}=await db.rpc('owner_get_admin2_settings');
      if(settingsError)throw settingsError;
      managedAdmin2Email=String(settings?.email||'');
      managedAdmin2Permissions=new Set(normalizePermissionList(settings));
    }
  }

  function renderSetup(){
    logoutBtn.hidden=true;
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login fl-cloud-setup"><h2>ربط Supabase مرة واحدة</h2><p>أدخل عنوان مشروع Supabase والمفتاح العام Publishable/Anon في أعلى ملفي <b>admin.js</b> و <b>public-sync.js</b> بنفس القيم.</p><div class="fl-cloud-note">ابحث في الملفين عن <b>window.FLOWER_LIGHT_SUPABASE</b> ثم حدّث حقلي <b>url</b> و <b>anonKey</b> بالقيم من Supabase → Project Settings → API. لا تحتاج لتعديل <b>index.html</b>.</div><code>url: 'https://YOUR_PROJECT.supabase.co'\nanonKey: 'YOUR_PUBLISHABLE_OR_ANON_KEY'</code><p>بعد رفع الملفين يصبح الحفظ والمزامنة مباشرَين عبر Supabase.</p></div></div>`;
  }

  async function getSession(){ const {data} = await db.auth.getSession(); return data.session; }

  function passwordResetRedirect(mode=isPrimaryAdmin?1:2){
    const url=new URL(location.origin+location.pathname);
    url.searchParams.set('admin',String(mode));
    return url.toString();
  }

  async function sendPasswordResetEmail(email,mode=isPrimaryAdmin?1:2){
    const normalized=String(email||'').trim();
    if(!normalized || !normalized.includes('@'))throw new Error('اكتب البريد الإلكتروني أولًا.');
    const {error}=await db.auth.resetPasswordForEmail(normalized,{redirectTo:passwordResetRedirect(mode)});
    if(error)throw error;
  }

  function primaryRecoveryRedirect(){
    const url=new URL(location.origin+location.pathname);
    url.searchParams.set('admin','1');
    url.searchParams.set('recovery','1');
    return url.toString();
  }

  async function sendPrimaryRecoveryAccessLink(email){
    const normalized=String(email||'').trim().toLowerCase();
    if(!normalized || !normalized.includes('@'))throw new Error('اكتب البريد الأساسي للاستعادة.');
    const {error}=await db.auth.signInWithOtp({
      email:normalized,
      options:{shouldCreateUser:false,emailRedirectTo:primaryRecoveryRedirect()}
    });
    if(error)throw error;
  }

  async function fetchPrimaryRecoverySettings(){
    const {data,error}=await db.functions.invoke('manage-admin-account',{body:{action:'get_recovery_settings'}});
    if(error||data?.error)throw Object.assign(error||new Error(data.error),{functionData:data});
    primaryRecoveryEmail=String(data?.recovery_email||'').trim().toLowerCase();
    return data||{};
  }

  function openPrimaryRecoveryRequest(prefill=''){
    openModal('الاستعادة عبر البريد الأساسي',`<form id="flPrimaryRecoveryRequestForm" class="fl-cloud-form">
      <div class="fl-cloud-note full">اكتب البريد الأساسي الذي حدده المدير. إذا كان مطابقًا، سيصلك رابط محمي لتغيير بريد أو كلمة مرور المدير أو الأدمن.</div>
      <div class="fl-cloud-field full"><label for="flRecoveryRequestEmail">البريد الأساسي للاستعادة</label><input id="flRecoveryRequestEmail" type="email" autocomplete="email" dir="ltr" required value="${esc(prefill)}" placeholder="recovery@example.com"></div>
      <div class="fl-cloud-actions full"><button class="fl-cloud-btn primary" id="flRecoveryRequestSubmit" type="submit">إرسال رابط الاستعادة</button></div>
    </form>`);
    document.getElementById('flPrimaryRecoveryRequestForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const email=document.getElementById('flRecoveryRequestEmail').value.trim();
      const submit=document.getElementById('flRecoveryRequestSubmit');
      submit.disabled=true;submit.textContent='جاري الإرسال...';
      try{
        await sendPrimaryRecoveryAccessLink(email);
        closeModal();
        notify('إذا كان البريد مطابقًا فسيصل إليه رابط الاستعادة');
      }catch(error){
        notify(authErrorMessage(error,'تعذر إرسال رابط الاستعادة'));
        submit.disabled=false;submit.textContent='إرسال رابط الاستعادة';
      }
    });
  }

  function authErrorMessage(error,fallback='تعذر تنفيذ العملية'){
    const message=String(error?.message||error||'');
    if(/invalid login credentials/i.test(message))return 'كلمة المرور الحالية غير صحيحة.';
    if(/password should be at least|weak password/i.test(message))return 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.';
    if(/email.*already|already.*registered|user already registered/i.test(message))return 'هذا البريد مرتبط بحساب آخر بالفعل.';
    if(/same password|different from the old/i.test(message))return 'اختر كلمة مرور جديدة مختلفة عن الحالية.';
    if(/reauthentication|reauthenticate|nonce/i.test(message))return 'انتهت مهلة التحقق الأمني. سجّل الخروج ثم ادخل مجددًا وحاول مرة أخرى.';
    if(/rate limit|too many/i.test(message))return 'تم إرسال محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.';
    return message?`${fallback}: ${message}`:fallback;
  }

  function renderPasswordRecovery(){
    passwordRecoveryMode=true;
    logoutBtn.hidden=true;
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login"><h2>تعيين كلمة مرور جديدة</h2><p>اكتب كلمة مرور جديدة للحساب. بعد الحفظ ستعود إلى شاشة تسجيل الدخول.</p><form id="flRecoveryForm"><div class="fl-cloud-field"><label>كلمة المرور الجديدة</label><input id="flRecoveryPassword" type="password" autocomplete="new-password" minlength="8" required></div><div class="fl-cloud-field"><label>تأكيد كلمة المرور</label><input id="flRecoveryConfirm" type="password" autocomplete="new-password" minlength="8" required></div><button class="fl-cloud-btn primary" id="flRecoverySubmit" type="submit">حفظ كلمة المرور</button></form></div></div>`;
    document.getElementById('flRecoveryForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const password=document.getElementById('flRecoveryPassword').value;
      const confirmation=document.getElementById('flRecoveryConfirm').value;
      const submit=document.getElementById('flRecoverySubmit');
      if(password.length<8){notify('كلمة المرور يجب أن تكون 8 أحرف على الأقل');return;}
      if(password!==confirmation){notify('تأكيد كلمة المرور غير مطابق');return;}
      submit.disabled=true;submit.textContent='جاري الحفظ...';
      try{
        const {error}=await db.auth.updateUser({password});
        if(error)throw error;
        await db.auth.signOut();
        passwordRecoveryMode=false;
        history.replaceState(null,'',`${location.pathname}?admin=${isPrimaryAdmin?'1':'2'}`);
        renderLogin();
        notify('تم تغيير كلمة المرور. سجّل الدخول بالكلمة الجديدة');
      }catch(error){
        notify(authErrorMessage(error,'تعذر تغيير كلمة المرور'));
        submit.disabled=false;submit.textContent='حفظ كلمة المرور';
      }
    });
  }

  async function renderLogin(){
    logoutBtn.hidden=true;
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login"><h2>${isPrimaryAdmin?'تسجيل دخول المدير':'تسجيل دخول الأدمن'}</h2><p>استخدم البريد الإلكتروني وكلمة المرور الخاصة بهذا الحساب.</p><form id="flLoginForm"><div class="fl-cloud-field"><label>البريد الإلكتروني</label><input id="flLoginEmail" type="email" autocomplete="username" required></div><div class="fl-cloud-field"><label>كلمة المرور</label><input id="flLoginPassword" type="password" autocomplete="current-password" required></div><button class="fl-cloud-btn primary" id="flLoginSubmit" type="submit">تسجيل الدخول</button><button class="fl-login-forgot" id="flForgotPassword" type="button">نسيت البريد أو كلمة المرور؟</button></form></div></div>`;
    document.getElementById('flForgotPassword')?.addEventListener('click',()=>openPrimaryRecoveryRequest());
    document.getElementById('flLoginForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const submit=document.getElementById('flLoginSubmit');
      submit.disabled=true;submit.textContent='جاري الدخول...';
      const email=document.getElementById('flLoginEmail').value.trim();
      const password=document.getElementById('flLoginPassword').value;
      try{
        const {error}=await db.auth.signInWithPassword({email,password});
        if(error)throw error;
        await loadCurrentAdminAccess();
        await refresh();
        renderApp();
      }catch(accessError){
        await db.auth.signOut();
        console.warn('[Admin] Sign-in failed.',accessError);
        notify('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.');
      }finally{
        submit.disabled=false;submit.textContent='تسجيل الدخول';
      }
    });
  }

  db?.auth.onAuthStateChange(event=>{
    if(event==='PASSWORD_RECOVERY'){
      passwordRecoveryMode=true;
      window.setTimeout(()=>renderPasswordRecovery(),0);
    }
  });

  function normalizeCatalogSelections(){
    if(!selectedCategory && categories[0]) selectedCategory=categories[0].id;
    if(selectedCategory && !categories.some(c=>c.id===selectedCategory)) selectedCategory=categories[0]?.id||'';
    const validProductNodes=new Set([
      ...categories.map(c=>`category:${c.id}`),
      ...siteCatalogs.map(c=>`catalog:${c.id}`)
    ]);
    if(!selectedProductNode || !validProductNodes.has(selectedProductNode)){
      selectedProductNode=categories[0]?`category:${categories[0].id}`:(siteCatalogs[0]?`catalog:${siteCatalogs[0].id}`:'');
    }
    if(selectedProductNode.startsWith('category:')) selectedCategory=selectedProductNode.slice(9);
  }

  async function loadCatalogAdminData(){
    const allowed=allowedAdminViews();
    const needCatalog=allowed.has('sections') || allowed.has('products');
    if(!needCatalog){categories=[];products=[];productImages=[];siteCatalogs=[];normalizeCatalogSelections();return;}
    const [{data:c,error:ce},{data:p,error:pe},{data:pi,error:pie},{data:sc,error:sce}] = await Promise.all([
      db.from('categories').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      db.from('products').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      db.from('product_images').select('id,product_id,image_path,sort_order,is_primary,created_at').order('sort_order',{ascending:true}).order('created_at',{ascending:true}),
      db.from('site_catalogs').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true})
    ]);
    if(ce||pe||pie) throw ce||pe||pie;
    const catalogMissing=sce && ['42P01','PGRST205'].includes(String(sce?.code||''));
    if(sce && !catalogMissing) throw sce;
    categories=c||[];products=p||[];productImages=pi||[];siteCatalogs=catalogMissing?[]:(sc||[]);
    normalizeCatalogSelections();
  }

  async function loadProfileAdminData(){
    const allowed=allowedAdminViews();
    if(allowed.has('profile')){
      const {data,error}=await db.from('site_profile').select('*').eq('id',1).maybeSingle();
      if(error)throw error;profile=data||{};return;
    }
    profile={};
  }

  async function loadCustomerLeadGateAdminSetting(){
    if(!isPrimaryAdmin)return;
    customerLeadGateSettingError='';
    try{
      const {data,error}=await db.from('site_settings').select('require_customer_lead').eq('id',1).maybeSingle();
      if(error)throw error;
      customerLeadGateEnabled=data?.require_customer_lead!==false;
      window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:customerLeadGateEnabled};
    }catch(error){
      customerLeadGateEnabled=true;
      customerLeadGateSettingError=String(error?.message||error||'');
    }
  }

  async function loadContactsAdminData(){
    if(!allowedAdminViews().has('contacts')){contacts=[];return;}
    const {data,error}=await db.from('contact_items').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true});
    if(error)throw error;contacts=data||[];
  }

  function sanitizeLeadSearch(value){
    return String(value||'').replace(/[,%()*]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);
  }

  function applyLeadSearch(builder,term){
    const q=sanitizeLeadSearch(term);
    if(!q)return builder;
    return builder.or(`full_name.ilike.%${q}%,company_name.ilike.%${q}%,mobile.ilike.%${q}%`);
  }

  async function loadLeadsPage({reset=true,searchTerm=leadsSearchTerm}={}){
    if(!allowedAdminViews().has('leads')){leads=[];leadsTotalCount=0;leadsAllTotalCount=0;leadsHasMore=false;return;}
    if(leadsLoading)return;
    leadsLoading=true;
    try{
      const normalized=sanitizeLeadSearch(searchTerm);
      if(reset)leadsSearchTerm=normalized;
      const offset=reset?0:leads.length;
      let query=db.from('customer_leads')
        .select('id,full_name,company_name,mobile,created_at',{count:'exact'})
        .order('created_at',{ascending:false})
        .range(offset,offset+LEADS_PAGE_SIZE-1);
      query=applyLeadSearch(query,reset?normalized:leadsSearchTerm);
      const {data,error,count}=await query;
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      if(reset)leads=rows;
      else{
        const seen=new Set(leads.map(item=>String(item.id)));
        leads=[...leads,...rows.filter(item=>!seen.has(String(item.id)))];
      }
      leadsTotalCount=Number.isFinite(Number(count))?Number(count):leads.length;
      if(!leadsSearchTerm)leadsAllTotalCount=leadsTotalCount;
      leadsHasMore=leads.length<leadsTotalCount && rows.length>0;
    }finally{leadsLoading=false;}
  }

  async function refresh(){
    await Promise.all([
      loadCatalogAdminData(),
      loadProfileAdminData(),
      loadContactsAdminData(),
      loadLeadsPage({reset:true}),
      loadCustomerLeadGateAdminSetting()
    ]);
  }

  function syncPublicProductsFromAdminCache(){
    const visibleCats=categories.filter(c=>c.is_visible!==false).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const visibleCatIds=new Set(visibleCats.map(c=>c.id));
    const visibleProds=products.filter(p=>p.is_visible!==false&&visibleCatIds.has(p.category_id)).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')));
    const galleryMap=new Map();
    productImages.forEach(row=>{
      if(!row?.product_id||!row?.image_path)return;
      if(!galleryMap.has(row.product_id))galleryMap.set(row.product_id,[]);
      galleryMap.get(row.product_id).push(row);
    });
    const grouped=new Map(visibleCats.map(c=>[c.id,[]]));
    visibleProds.forEach(p=>{
      let gallery=(galleryMap.get(p.id)||[]).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
      if(p.image_path&&!gallery.some(row=>row.image_path===p.image_path))gallery.unshift({id:'',product_id:p.id,image_path:p.image_path,sort_order:-1,is_primary:true});
      gallery=gallery.slice(0,MAX_PRODUCT_IMAGES);
      let primaryIndex=gallery.findIndex(row=>row.image_path===p.image_path);
      if(primaryIndex<0)primaryIndex=gallery.findIndex(row=>row.is_primary===true);
      if(primaryIndex<0&&gallery.length)primaryIndex=0;
      if(primaryIndex>0){const [primary]=gallery.splice(primaryIndex,1);gallery.unshift(primary);}
      const primaryPath=gallery[0]?.image_path||p.image_path||p.image_url||'';
      grouped.get(p.category_id)?.push({
        id:p.id,name:p.name||'',model:p.model||'',caption:p.caption||'',alt:p.caption||p.name||'',category:'',category_id:p.category_id||'',category_slug:'',
        image:imageUrl(primaryPath),image_path:primaryPath,
        gallery:gallery.map((row,index)=>({id:row.id||'',image_path:row.image_path,image:imageUrl(row.image_path),is_primary:index===0,sort_order:index*10})),
        specifications:Array.isArray(p.specifications)?p.specifications:[],price:p.price==null?null:Number(p.price),wholesale_price:p.wholesale_price==null?null:Number(p.wholesale_price),
        wholesale_min_qty:p.wholesale_min_qty==null?null:Number(p.wholesale_min_qty),limited_offer:p.limited_offer===true,catalog_pdf_path:'',catalog_pdf_url:'',sort_order:p.sort_order||0,is_visible:true
      });
    });
    const extraSections=visibleCats.map(c=>{
      const items=grouped.get(c.id)||[];
      items.forEach(item=>{item.category=c.name;item.category_id=c.id;item.category_slug=c.slug||c.id;});
      return {id:c.id,name:c.name,slug:c.slug,description:c.description||'',sort_order:c.sort_order||0,items};
    });
    window.FLOWER_LIGHT_PRODUCTS={catalog:[],chandeliers:[],balfon:[],extraSections};
    window.flRenderProducts?.();
  }

  function syncPublicCatalogFromAdminCache(){
    const rows=siteCatalogs.filter(row=>row.is_visible!==false&&row.pdf_path).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||''))).map(row=>({
      ...row,id:String(row.id||''),name:String(row.name||'الكتالوج'),description:String(row.description||''),pdf_path:String(row.pdf_path||''),file_name:String(row.file_name||''),pdf_url:catalogFileUrl(row.pdf_path)
    })).filter(row=>row.pdf_url);
    window.FLOWER_LIGHT_SITE_CATALOGS=rows;
    window.FLOWER_LIGHT_SITE_CATALOG=rows[0]||{};
    window.flRenderProducts?.();
  }

  function navHtml(){
    const allowed=allowedAdminViews();
    const items=[['overview','الرئيسية'],...adminViewItems.filter(([key])=>allowed.has(key))];
    if(isPrimaryAdmin)items.push(['credentials','بيانات تسجيل الدخول'],['permissions','صلاحيات الأدمن']);
    return `<nav class="fl-cloud-nav">${items.map(([key,label])=>`<button data-cloud-view="${key}" class="${view===key?'active':''}">${label}</button>`).join('')}</nav>`;
  }

  function layout(content,topTools=''){
    const previousNav=body.querySelector('.fl-cloud-nav');
    if(previousNav) cloudNavScrollLeft=previousNav.scrollLeft;
    body.innerHTML=`<div class="fl-cloud-wrap">${topTools?`<div class="fl-cloud-top-tools">${topTools}</div>`:''}<div class="fl-cloud-grid">${navHtml()}<main class="fl-cloud-main">${content}</main></div></div>`;
    const currentNav=body.querySelector('.fl-cloud-nav');
    if(currentNav){
      currentNav.scrollLeft=cloudNavScrollLeft;
      currentNav.addEventListener('scroll',()=>{cloudNavScrollLeft=currentNav.scrollLeft;},{passive:true});
      requestAnimationFrame(()=>{currentNav.scrollLeft=cloudNavScrollLeft;});
    }
    body.querySelectorAll('[data-cloud-view]').forEach(button=>button.addEventListener('click',()=>{
      const nav=body.querySelector('.fl-cloud-nav');
      if(nav) cloudNavScrollLeft=nav.scrollLeft;
      const nextView=normalizeAdminView(button.dataset.cloudView);
      view=nextView;
      renderApp();
    }));
  }

  function renderApp(){
    logoutBtn.hidden=false;
    view=normalizeAdminView(view);
    if(view==='analytics') renderAnalytics();
    else if(view==='datasheet') renderDatasheetDesigner();
    else if(view==='sections') renderSections();
    else if(view==='products') renderProducts();
    else if(view==='profile') renderProfile();
    else if(view==='contacts') renderContacts();
    else if(view==='leads') renderLeads();
    else if(view==='credentials' && isPrimaryAdmin) renderCredentials();
    else if(view==='permissions' && isPrimaryAdmin) renderPermissions();
    else renderOverview();
  }

  function renderOverview(){
    const allowed=allowedAdminViews();
    const visible=products.filter(p=>p.is_visible!==false).length;
    const profileReady=Boolean(profile.full_name||profile.brand_name||profile.company_name||profile.logo_path||profile.portrait_path);
    const statCards=[];
    if(allowed.has('sections'))statCards.push([categories.length,'الأقسام']);
    if(allowed.has('products'))statCards.push([products.length,'إجمالي المنتجات'],[visible,'المنتجات الظاهرة']);
    if(allowed.has('datasheet'))statCards.push(['✓','صمّم داتا شيت']);
    if(allowed.has('profile'))statCards.push([profileReady?'✓':'—','بيانات البطاقة']);
    if(allowed.has('contacts'))statCards.push([contacts.length,'وسائل التواصل']);
    if(allowed.has('leads'))statCards.push([leadsAllTotalCount||leadsTotalCount,'جهات اتصال العملاء']);
    const statsHtml=statCards.length?`<div class="fl-cloud-stats">${statCards.map(([value,label])=>`<div class="fl-cloud-stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>`:'';
    const leadGateCard=isPrimaryAdmin?`<form id="flCustomerLeadGateSettingsForm" class="fl-cloud-card fl-lead-gate-settings-card">
      <div class="fl-credentials-card-head"><div><span class="fl-account-badge owner">دخول المنتجات</span><h3>طلب بيانات العميل قبل عرض المنتجات</h3></div></div>
      <p>تحكم من هنا في ظهور نموذج الاسم ورقم الجوال للعميل عند فتح قسم المنتجات.</p>
      ${customerLeadGateSettingError?`<div class="fl-cloud-note bad">تعذر قراءة الإعداد. شغّل <b>FINAL_SQL_STAGE84.sql</b> في Supabase مرة واحدة ثم أعد تحميل الصفحة.</div>`:''}
      <label class="fl-permission-row fl-lead-gate-setting-row">
        <span class="fl-permission-copy"><strong>طلب الاسم ورقم الجوال</strong><small>${customerLeadGateEnabled?'مفعّل الآن: سيُطلب من العميل إدخال بياناته مرة واحدة قبل فتح المنتجات.':'متوقف الآن: سيدخل العميل إلى المنتجات مباشرة بدون طلب الاسم أو رقم الجوال.'}</small></span>
        <input id="flRequireCustomerLead" type="checkbox" ${customerLeadGateEnabled?'checked':''} ${customerLeadGateSettingError?'disabled':''}>
        <span class="fl-permission-check" aria-hidden="true">✓</span>
      </label>
      <div class="fl-cloud-actions"><button class="fl-cloud-btn primary" id="flCustomerLeadGateSave" type="submit" ${customerLeadGateSettingError?'disabled':''}>حفظ الإعداد</button></div>
    </form>`:'';
    const recoveryCard=isPrimaryAdmin?`<form id="flPrimaryRecoverySettingsForm" class="fl-cloud-card fl-primary-recovery-card">
      <div class="fl-credentials-card-head"><div><span class="fl-account-badge recovery">البريد الأساسي</span><h3>البريد الأساسي للاستعادة</h3></div></div>
      <p>هذا البريد يستقبل رابطًا محميًا تستطيع من خلاله تغيير بريد أو كلمة مرور المدير والأدمن، حتى عند نسيان كلمة المرور القديمة.</p>
      <div class="fl-cloud-field"><label for="flPrimaryRecoveryEmail">البريد الأساسي للاستعادة</label><input id="flPrimaryRecoveryEmail" type="email" autocomplete="email" dir="ltr" required value="${esc(primaryRecoveryEmail)}" placeholder="recovery@example.com"><small id="flPrimaryRecoveryStatus">جاري التحقق من الإعداد الحالي...</small></div>
      <div class="fl-cloud-field"><label for="flPrimaryRecoveryCurrentPassword">كلمة مرور المدير الحالية</label><input id="flPrimaryRecoveryCurrentPassword" type="password" autocomplete="current-password" required><small>مطلوبة فقط عند حفظ أو استبدال البريد الأساسي.</small></div>
      <div class="fl-cloud-actions fl-credentials-actions"><button class="fl-cloud-btn primary" id="flPrimaryRecoverySave" type="submit">حفظ البريد الأساسي</button><button class="fl-cloud-btn secondary" id="flPrimaryRecoveryTest" type="button">إرسال رابط اختبار</button></div>
    </form>`:'';
    layout(`<div class="fl-cloud-head"><div><h2>${isPrimaryAdmin?'إدارة الموقع بالكامل':'لوحة الأدمن'}</h2>${isPrimaryAdmin?'<p>جميع أجزاء الموقع متاحة لك، بما فيها الأقسام والمنتجات وتحديد صلاحيات الأدمن.</p>':''}</div></div>
      ${leadGateCard}
      ${recoveryCard}
      ${statsHtml}
      <div class="fl-cloud-note ok">الحساب الحالي: <b dir="ltr">${esc(currentAdminEmail)}</b> · ${isPrimaryAdmin?'المدير':'الأدمن'}</div>
      ${isPrimaryAdmin?'<div class="fl-cloud-note ok">يمكنك تغيير ما يظهر للأدمن من صفحة «صلاحيات الأدمن».</div>':''}`);

    if(!isPrimaryAdmin)return;
    document.getElementById('flCustomerLeadGateSettingsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const toggle=document.getElementById('flRequireCustomerLead');
      const save=document.getElementById('flCustomerLeadGateSave');
      if(!toggle||!save)return;
      const enabled=Boolean(toggle.checked);
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {error}=await db.from('site_settings').upsert({id:1,require_customer_lead:enabled},{onConflict:'id'});
        if(error)throw error;
        customerLeadGateEnabled=enabled;
        customerLeadGateSettingError='';
        window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:enabled};
        notify(enabled?'تم تفعيل طلب بيانات العميل قبل المنتجات':'تم إيقاف طلب البيانات؛ العميل سيدخل المنتجات مباشرة');
        renderOverview();
      }catch(error){
        notify(/42P01|PGRST205/i.test(String(error?.code||''))?'شغّل FINAL_SQL_STAGE84.sql في Supabase أولًا.':'تعذر حفظ الإعداد: '+(error?.message||error));
        save.disabled=false;save.textContent='حفظ الإعداد';
      }
    });

    const recoveryInput=document.getElementById('flPrimaryRecoveryEmail');
    const recoveryStatus=document.getElementById('flPrimaryRecoveryStatus');
    const testButton=document.getElementById('flPrimaryRecoveryTest');
    fetchPrimaryRecoverySettings().then(data=>{
      if(recoveryInput&&!recoveryInput.value)recoveryInput.value=primaryRecoveryEmail;
      if(recoveryStatus)recoveryStatus.textContent=data?.configured?'تم ربط هذا البريد بنظام الاستعادة.':'لم يتم تحديد بريد أساسي بعد.';
      if(testButton)testButton.disabled=!primaryRecoveryEmail;
    }).catch(async error=>{
      if(recoveryStatus)recoveryStatus.textContent=await edgeFunctionErrorMessage(error,error?.functionData);
      if(testButton)testButton.disabled=true;
    });

    document.getElementById('flPrimaryRecoverySettingsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const email=recoveryInput.value.trim().toLowerCase();
      const currentPassword=document.getElementById('flPrimaryRecoveryCurrentPassword').value;
      const save=document.getElementById('flPrimaryRecoverySave');
      if(!email){notify('اكتب البريد الأساسي للاستعادة');return;}
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {error:verifyError}=await db.auth.signInWithPassword({email:currentAdminEmail,password:currentPassword});
        if(verifyError)throw verifyError;
        const {data,error}=await db.functions.invoke('manage-admin-account',{body:{action:'save_recovery_email',email}});
        if(error||data?.error)throw Object.assign(error||new Error(data.error),{functionData:data});
        primaryRecoveryEmail=String(data?.recovery_email||email);
        recoveryInput.value=primaryRecoveryEmail;
        document.getElementById('flPrimaryRecoveryCurrentPassword').value='';
        if(recoveryStatus)recoveryStatus.textContent='تم ربط هذا البريد بنظام الاستعادة.';
        if(testButton)testButton.disabled=false;
        await sendPrimaryRecoveryAccessLink(primaryRecoveryEmail);
        notify('تم حفظ البريد الأساسي وإرسال رابط اختبار إليه');
      }catch(error){
        const message=error?.functionData?await edgeFunctionErrorMessage(error,error.functionData):authErrorMessage(error,'تعذر حفظ البريد الأساسي');
        notify(message);
      }finally{
        save.disabled=false;save.textContent='حفظ البريد الأساسي';
      }
    });

    testButton?.addEventListener('click',async()=>{
      const email=String(primaryRecoveryEmail||recoveryInput?.value||'').trim();
      if(!primaryRecoveryEmail){notify('احفظ البريد الأساسي أولًا');return;}
      testButton.disabled=true;testButton.textContent='جاري الإرسال...';
      try{await sendPrimaryRecoveryAccessLink(email);notify('تم إرسال رابط الاستعادة إلى البريد الأساسي');}
      catch(error){notify(authErrorMessage(error,'تعذر إرسال رابط الاختبار'));}
      finally{testButton.disabled=false;testButton.textContent='إرسال رابط اختبار';}
    });
  }

  async function edgeFunctionErrorMessage(error,data){
    if(data?.error)return String(data.error);
    try{
      const response=error?.context;
      if(response?.clone){
        const payload=await response.clone().json();
        if(payload?.error)return String(payload.error);
      }
    }catch(_){/* The function response was not JSON. */}
    const message=String(error?.message||error||'');
    if(/Failed to send|not found|404|FunctionsFetchError/i.test(message))return 'وظيفة إدارة الحساب غير مفعلة بعد في Supabase. انشر manage-admin-account ثم حاول مجددًا.';
    return message||'تعذر الاتصال بوظيفة إدارة الحساب.';
  }

  async function renderPrimaryRecoveryPortal(){
    if(recoveryPortalRendered)return;
    recoveryPortalRendered=true;
    logoutBtn.hidden=false;
    if(primaryAdminBtn)primaryAdminBtn.hidden=true;
    if(assistantAdminBtn)assistantAdminBtn.hidden=true;
    if(adminTitle)adminTitle.textContent='استعادة حسابات الإدارة';
    if(adminSubtitle)adminSubtitle.textContent='تغيير آمن عبر البريد الأساسي';
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login"><h2>جاري التحقق من رابط الاستعادة...</h2><p>انتظر لحظة.</p></div></div>`;
    try{
      const {data,error}=await db.functions.invoke('manage-admin-account',{body:{action:'get_recovery_context'}});
      if(error||data?.error)throw Object.assign(error||new Error(data.error),{functionData:data});
      recoveryContext=data||{};
    }catch(error){
      const message=await edgeFunctionErrorMessage(error,error?.functionData);
      body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login"><h2>تعذر فتح الاستعادة</h2><p>${esc(message)}</p><button class="fl-cloud-btn secondary" id="flRecoveryPortalExit" type="button">العودة لتسجيل الدخول</button></div></div>`;
      document.getElementById('flRecoveryPortalExit')?.addEventListener('click',()=>logoutBtn.click());
      return;
    }

    const hasAdmin=Boolean(recoveryContext?.has_admin);
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-recovery-portal">
      <div class="fl-cloud-head"><div><h2>استعادة حسابات الإدارة</h2><p>تم التحقق من البريد الأساسي. يمكنك الآن تغيير البريد الإلكتروني أو كلمة المرور للمدير أو الأدمن.</p></div></div>
      <div class="fl-cloud-note ok">البريد الأساسي الموثّق: <b dir="ltr">${esc(recoveryContext?.recovery_email||'')}</b></div>
      <form id="flRecoveryAccountsForm" class="fl-cloud-card fl-recovery-account-form">
        <div class="fl-cloud-field"><label for="flRecoveryTargetRole">الحساب المطلوب تعديله</label><select id="flRecoveryTargetRole"><option value="owner">المدير</option>${hasAdmin?'<option value="subadmin">الأدمن</option>':''}</select></div>
        <div class="fl-cloud-field"><label for="flRecoveryTargetEmail">البريد الإلكتروني</label><input id="flRecoveryTargetEmail" type="email" autocomplete="off" dir="ltr" required></div>
        <div class="fl-cloud-field"><label for="flRecoveryTargetPassword">كلمة مرور جديدة <small>(اختياري)</small></label><input id="flRecoveryTargetPassword" type="password" autocomplete="new-password" minlength="8" placeholder="اتركها فارغة إذا أردت تغيير البريد فقط"></div>
        <div class="fl-cloud-field"><label for="flRecoveryTargetConfirm">تأكيد كلمة المرور الجديدة</label><input id="flRecoveryTargetConfirm" type="password" autocomplete="new-password" minlength="8"></div>
        <div class="fl-cloud-note">يمكنك تغيير البريد فقط، أو كلمة المرور فقط، أو كليهما. لا تحتاج إلى معرفة كلمة المرور القديمة.</div>
        <div class="fl-cloud-actions fl-credentials-actions"><button class="fl-cloud-btn primary" id="flRecoveryAccountSave" type="submit">حفظ بيانات الحساب</button><button class="fl-cloud-btn secondary" id="flRecoveryPortalExit" type="button">إنهاء الاستعادة</button></div>
      </form>
    </div></div>`;

    const roleSelect=document.getElementById('flRecoveryTargetRole');
    const emailInput=document.getElementById('flRecoveryTargetEmail');
    const fillTargetEmail=()=>{
      emailInput.value=roleSelect.value==='owner'?String(recoveryContext?.owner_email||''):String(recoveryContext?.admin_email||'');
    };
    roleSelect.addEventListener('change',fillTargetEmail);
    fillTargetEmail();
    document.getElementById('flRecoveryPortalExit')?.addEventListener('click',()=>logoutBtn.click());
    document.getElementById('flRecoveryAccountsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const role=roleSelect.value;
      const email=emailInput.value.trim();
      const password=document.getElementById('flRecoveryTargetPassword').value;
      const confirmation=document.getElementById('flRecoveryTargetConfirm').value;
      const currentEmail=role==='owner'?String(recoveryContext?.owner_email||''):String(recoveryContext?.admin_email||'');
      const save=document.getElementById('flRecoveryAccountSave');
      if(password && password.length<8){notify('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');return;}
      if(password!==confirmation){notify('تأكيد كلمة المرور الجديدة غير مطابق');return;}
      if(email.toLowerCase()===currentEmail.toLowerCase()&&!password){notify('غيّر البريد أو أدخل كلمة مرور جديدة');return;}
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {data,error}=await db.functions.invoke('manage-admin-account',{body:{action:'recovery_update_credentials',role,email,password:password||null}});
        if(error||data?.error)throw Object.assign(error||new Error(data.error),{functionData:data});
        if(role==='owner')recoveryContext.owner_email=String(data?.email||email);
        else recoveryContext.admin_email=String(data?.email||email);
        document.getElementById('flRecoveryTargetPassword').value='';
        document.getElementById('flRecoveryTargetConfirm').value='';
        fillTargetEmail();
        notify(`تم تحديث بيانات ${role==='owner'?'المدير':'الأدمن'} بنجاح`);
      }catch(error){
        const message=await edgeFunctionErrorMessage(error,error?.functionData);
        notify(message);
      }finally{
        save.disabled=false;save.textContent='حفظ بيانات الحساب';
      }
    });
  }

  function renderCredentials(){
    const hasAdmin=Boolean(managedAdmin2Email);
    const adminCard=hasAdmin?`<div class="fl-cloud-card fl-credentials-card">
          <div class="fl-credentials-card-head"><div><span class="fl-account-badge admin">الأدمن</span><h3>حساب الأدمن</h3></div></div>
          <div class="fl-account-current-email"><small>البريد الحالي</small><strong dir="ltr">${esc(managedAdmin2Email)}</strong></div>
          <p>لتغيير بريد الأدمن أو كلمة مروره، أرسل رابطًا إلى البريد الأساسي ثم أكمل التغيير من الصفحة المحمية.</p>
          <button class="fl-cloud-btn primary" id="flAdminRecoveryLink" type="button">إرسال رابط تغيير بيانات الأدمن</button>
        </div>`:`<form id="flAdminCredentialsForm" class="fl-cloud-card fl-credentials-card">
          <div class="fl-credentials-card-head"><div><span class="fl-account-badge admin">الأدمن</span><h3>إنشاء حساب الأدمن</h3></div></div>
          <div class="fl-cloud-field"><label for="flManagedAdminEmail">بريد الأدمن</label><input id="flManagedAdminEmail" type="email" autocomplete="off" dir="ltr" required placeholder="admin@example.com"></div>
          <div class="fl-cloud-field"><label for="flManagedAdminPassword">كلمة المرور</label><input id="flManagedAdminPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="8 أحرف على الأقل"></div>
          <div class="fl-cloud-field"><label for="flManagedAdminConfirm">تأكيد كلمة المرور</label><input id="flManagedAdminConfirm" type="password" autocomplete="new-password" minlength="8" required></div>
          <button class="fl-cloud-btn primary" id="flAdminCredentialsSave" type="submit">إنشاء حساب الأدمن</button>
        </form>`;
    layout(`<div class="fl-cloud-head"><div><h2>بيانات تسجيل الدخول</h2><p>إدارة حسابي المدير والأدمن عبر البريد الأساسي للاستعادة.</p></div></div>
      <div class="fl-cloud-note ok" id="flCredentialsRecoveryStatus">جاري تحميل البريد الأساسي...</div>
      <div class="fl-credentials-grid">
        <div class="fl-cloud-card fl-credentials-card">
          <div class="fl-credentials-card-head"><div><span class="fl-account-badge owner">المدير</span><h3>حساب المدير</h3></div></div>
          <div class="fl-account-current-email"><small>البريد الحالي</small><strong dir="ltr">${esc(currentAdminEmail)}</strong></div>
          <p>يمكنك تغيير بريد المدير أو كلمة مروره حتى لو نسيت كلمة المرور القديمة.</p>
          <button class="fl-cloud-btn primary" id="flOwnerRecoveryLink" type="button">إرسال رابط تغيير بيانات المدير</button>
        </div>
        ${adminCard}
      </div>
      <button class="fl-cloud-btn secondary fl-recovery-settings-shortcut" id="flOpenRecoverySettings" type="button">تحديد أو تغيير البريد الأساسي</button>`);

    const status=document.getElementById('flCredentialsRecoveryStatus');
    fetchPrimaryRecoverySettings().then(data=>{
      status.innerHTML=data?.configured?`ترسل جميع روابط الاستعادة إلى: <b dir="ltr">${esc(primaryRecoveryEmail)}</b>`:'لم تحدد البريد الأساسي بعد. انتقل إلى الرئيسية وحدده أولًا.';
    }).catch(async error=>{status.classList.remove('ok');status.classList.add('bad');status.textContent=await edgeFunctionErrorMessage(error,error?.functionData);});

    const sendLink=async button=>{
      if(!primaryRecoveryEmail){
        try{await fetchPrimaryRecoverySettings();}catch(error){notify(await edgeFunctionErrorMessage(error,error?.functionData));return;}
      }
      if(!primaryRecoveryEmail){notify('حدد البريد الأساسي من الصفحة الرئيسية أولًا');return;}
      button.disabled=true;const oldText=button.textContent;button.textContent='جاري الإرسال...';
      try{await sendPrimaryRecoveryAccessLink(primaryRecoveryEmail);notify('تم إرسال رابط التغيير إلى البريد الأساسي');}
      catch(error){notify(authErrorMessage(error,'تعذر إرسال رابط الاستعادة'));}
      finally{button.disabled=false;button.textContent=oldText;}
    };
    document.getElementById('flOwnerRecoveryLink')?.addEventListener('click',event=>sendLink(event.currentTarget));
    document.getElementById('flAdminRecoveryLink')?.addEventListener('click',event=>sendLink(event.currentTarget));
    document.getElementById('flOpenRecoverySettings')?.addEventListener('click',()=>{view='overview';renderApp();});

    document.getElementById('flAdminCredentialsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const email=document.getElementById('flManagedAdminEmail').value.trim();
      const password=document.getElementById('flManagedAdminPassword').value;
      const confirmation=document.getElementById('flManagedAdminConfirm').value;
      const save=document.getElementById('flAdminCredentialsSave');
      if(password.length<8){notify('كلمة المرور يجب أن تكون 8 أحرف على الأقل');return;}
      if(password!==confirmation){notify('تأكيد كلمة المرور الجديدة غير مطابق');return;}
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {data,error}=await db.functions.invoke('manage-admin-account',{body:{action:'save_admin_credentials',email,password:password||null,permissions:[...managedAdmin2Permissions]}});
        if(error||data?.error)throw Object.assign(error||new Error(data.error),{functionData:data});
        managedAdmin2Email=String(data?.email||email);
        managedAdmin2Permissions=new Set(normalizePermissionList(data));
        renderCredentials();
        notify('تم إنشاء حساب الأدمن بنجاح');
      }catch(error){
        const message=await edgeFunctionErrorMessage(error,error?.functionData);
        notify(message);
        save.disabled=false;save.textContent='إنشاء حساب الأدمن';
      }
    });
  }

  function renderPermissions(){
    const rows=adminViewItems.filter(([key])=>delegatablePermissionKeys.has(key)).map(([key,label])=>`<label class="fl-permission-row"><span class="fl-permission-copy"><strong>${esc(label)}</strong><small>السماح للأدمن بفتح وإدارة هذا الجزء</small></span><input type="checkbox" name="admin2_permission" value="${key}" ${managedAdmin2Permissions.has(key)?'checked':''}><span class="fl-permission-check" aria-hidden="true">✓</span></label>`).join('');
    const accountReady=Boolean(managedAdmin2Email);
    layout(`<div class="fl-cloud-head"><div><h2>صلاحيات الأدمن</h2><p>حدد الأجزاء التي يستطيع الأدمن إدارتها. الرئيسية تبقى ظاهرة دائمًا، بينما الأقسام والمنتجات للمدير فقط.</p></div></div>
      <div class="fl-cloud-note ok">هذه صلاحيات حقيقية داخل قاعدة البيانات، وليست مجرد إخفاء للأزرار.</div>
      <div class="fl-cloud-note ${accountReady?'ok':'bad'}">${accountReady?`حساب الأدمن المرتبط: <b dir="ltr">${esc(managedAdmin2Email)}</b>`:'لم يتم إنشاء حساب الأدمن بعد. أنشئه أولًا من «بيانات تسجيل الدخول».'}</div>
      <form id="flPermissionsForm" class="fl-cloud-card fl-permissions-card">
        <div class="fl-permission-list">${rows}</div>
        <div class="fl-cloud-actions"><button class="fl-cloud-btn primary" id="flPermissionsSave" type="submit" ${accountReady?'':'disabled'}>حفظ الصلاحيات</button><button class="fl-cloud-btn secondary" id="flOpenCredentialsFromPermissions" type="button">بيانات تسجيل الدخول</button></div>
      </form>`);
    document.getElementById('flOpenCredentialsFromPermissions')?.addEventListener('click',()=>{view='credentials';renderApp();});
    document.getElementById('flPermissionsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const save=document.getElementById('flPermissionsSave');
      const email=managedAdmin2Email;
      if(!email){notify('أنشئ حساب الأدمن أولًا من بيانات تسجيل الدخول');return;}
      const selected=[...body.querySelectorAll('input[name="admin2_permission"]:checked')].map(input=>input.value);
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {data,error}=await db.rpc('owner_set_admin2_settings',{p_email:email,p_permissions:selected});
        if(error)throw error;
        managedAdmin2Email=String(data?.email||email);
        managedAdmin2Permissions=new Set(normalizePermissionList(data));
        renderPermissions();notify('تم حفظ صلاحيات الأدمن');
      }catch(error){
        const message=String(error?.message||error||'');
        const friendly=message.includes('No Supabase Auth user')?'تعذر العثور على حساب الأدمن. حدّث بيانات تسجيل الدخول ثم حاول مجددًا.'
          : message.includes('different Supabase Auth account')?'يجب أن يكون بريد الأدمن مختلفًا عن حساب المدير.'
          : message.includes('Owner access required')?'هذه العملية متاحة للمدير الأساسي Owner فقط.'
          : 'تعذر حفظ الصلاحيات: '+message;
        notify(friendly);
        save.disabled=false;save.textContent='حفظ الصلاحيات';
      }
    });
  }

  function profileImagePreview(path,kind){
    if(!path) return '<div class="fl-cloud-empty" style="padding:18px 8px">لا توجد صورة</div>';
    return `<img class="${kind==='logo'?'logo-preview':''}" src="${esc(imageUrl(path))}" alt="">`;
  }

  function analyticsPeriodLabel(days){
    return days===1?'اليوم':days===7?'آخر 7 أيام':days===30?'آخر 30 يومًا':days===90?'آخر 90 يومًا':'كل الوقت';
  }
  function analyticsRows(items,emptyText='لا توجد بيانات بعد.'){
    const list=Array.isArray(items)?items:[];
    if(!list.length)return `<div class="fl-cloud-empty">${esc(emptyText)}</div>`;
    return `<div class="fl-analytics-rank">${list.map(item=>`<div class="fl-analytics-rank-row"><strong title="${esc(item.label||'غير مسمى')}">${esc(item.label||'غير مسمى')}</strong><span class="fl-analytics-count">${Number(item.count||0).toLocaleString('ar-SA')}</span></div>`).join('')}</div>`;
  }
  const analyticsMetricLabels={
    visits:'الزيارات',
    products_open:'فتح المنتجات',
    catalog_downloads:'تحميل الكتالوج',
    lead_submissions:'بيانات العملاء'
  };
  function analyticsChartSvg(rows,metric='visits'){
    const data=(Array.isArray(rows)?rows:[]).map(row=>({day:String(row.day||''),value:Number(row?.[metric]||0)}));
    if(!data.length)return '<div class="fl-chart-empty">لا توجد بيانات زمنية بعد.</div>';
    const width=820,height=270,padL=48,padR=20,padT=24,padB=45;
    const innerW=width-padL-padR,innerH=height-padT-padB;
    const max=Math.max(1,...data.map(x=>x.value));
    const point=(x,i)=>({x:padL+(data.length===1?innerW/2:(i/(data.length-1))*innerW),y:padT+innerH-(x.value/max)*innerH});
    const pts=data.map(point);
    const line=pts.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area=`M ${pts[0].x.toFixed(1)} ${(padT+innerH).toFixed(1)} `+pts.map(p=>`L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')+` L ${pts[pts.length-1].x.toFixed(1)} ${(padT+innerH).toFixed(1)} Z`;
    const yTicks=[0,.25,.5,.75,1].map(r=>{
      const y=padT+innerH-(r*innerH);const v=Math.round(max*r);
      return `<line class="fl-chart-grid" x1="${padL}" y1="${y}" x2="${width-padR}" y2="${y}"></line><text class="fl-chart-text" x="${padL-9}" y="${y+4}" text-anchor="end">${v.toLocaleString('ar-SA')}</text>`;
    }).join('');
    const labelIndexes=[...new Set([0,Math.floor((data.length-1)*.25),Math.floor((data.length-1)*.5),Math.floor((data.length-1)*.75),data.length-1])];
    const xLabels=labelIndexes.map(i=>{
      const p=pts[i];let label=data[i].day;
      try{label=new Intl.DateTimeFormat('ar-SA',{month:'short',day:'numeric'}).format(new Date(`${data[i].day}T00:00:00`));}catch(_){}
      return `<text class="fl-chart-text" x="${p.x}" y="${height-16}" text-anchor="middle">${esc(label)}</text>`;
    }).join('');
    const dots=pts.map((p,i)=>{
      if(data.length>45 && i%Math.ceil(data.length/30)!==0 && i!==data.length-1)return '';
      return `<circle class="fl-chart-dot" cx="${p.x}" cy="${p.y}" r="3.5"><title>${esc(data[i].day)} · ${data[i].value.toLocaleString('ar-SA')}</title></circle>`;
    }).join('');
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(analyticsMetricLabels[metric]||'الإحصائيات')} حسب اليوم">${yTicks}<path class="fl-chart-area" d="${area}"></path><path class="fl-chart-line" d="${line}"></path>${dots}${xLabels}</svg>`;
  }
  let analyticsChartMetric='visits';
  function updateAnalyticsChart(a){
    const host=document.getElementById('flAnalyticsChart');
    if(host)host.innerHTML=analyticsChartSvg(a?.timeseries,analyticsChartMetric);
  }
  async function renderAnalytics(){
    layout(`<div class="fl-cloud-head"><div><h2>إحصائيات الموقع</h2><p>الزيارات والتفاعل مع المنتجات والأقسام والفروع.</p></div></div><div class="fl-cloud-card"><div class="fl-cloud-empty">جاري تحميل الإحصائيات...</div></div>`);
    const {data,error}=await db.rpc('get_site_analytics_for_admin',{p_days:analyticsPeriod});
    if(view!=='analytics')return;
    if(error){
      layout(`<div class="fl-cloud-head"><div><h2>إحصائيات الموقع</h2><p>الزيارات والتفاعل مع الموقع.</p></div></div><div class="fl-cloud-note bad">تعذر تحميل الإحصائيات. شغّل ملف <b>FINAL_SQL_STAGE84.sql</b> في Supabase مرة واحدة ثم أعد المحاولة.<br><small>${esc(error.message||'')}</small></div>`);
      return;
    }
    const a=data||{};
    const uniqueLabel=a.unique_visitors_is_approx?'زوار فريدون تقريبيًا*':'زوار فريدون';
    const allTimeChartNote=analyticsPeriod===0?' · الرسم يعرض آخر 90 يومًا للحفاظ على الوضوح':'';
    layout(`<div class="fl-cloud-head"><div><h2>إحصائيات الموقع</h2><p>${esc(analyticsPeriodLabel(analyticsPeriod))}${allTimeChartNote} · البيانات تتحدث تلقائيًا.</p></div></div>
      <div class="fl-analytics-toolbar"><select id="flAnalyticsPeriod" aria-label="الفترة"><option value="1" ${analyticsPeriod===1?'selected':''}>اليوم</option><option value="7" ${analyticsPeriod===7?'selected':''}>7 أيام</option><option value="30" ${analyticsPeriod===30?'selected':''}>30 يومًا</option><option value="90" ${analyticsPeriod===90?'selected':''}>90 يومًا</option><option value="0" ${analyticsPeriod===0?'selected':''}>كل الوقت</option></select><div class="fl-cloud-actions"><button class="fl-cloud-btn" id="flAnalyticsRefresh" type="button">تحديث</button><button class="fl-cloud-btn danger" id="flAnalyticsReset" type="button">إعادة تعيين الإحصائيات</button></div></div>
      <div class="fl-analytics-grid">
        <div class="fl-analytics-card"><strong>${Number(a.total_visits||0).toLocaleString('ar-SA')}</strong><span>زيارات الموقع</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.unique_visitors||0).toLocaleString('ar-SA')}</strong><span>${uniqueLabel}</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.products_open||0).toLocaleString('ar-SA')}</strong><span>فتح المنتجات</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.catalog_downloads||0).toLocaleString('ar-SA')}</strong><span>تحميل الكتالوج</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.whatsapp_clicks||0).toLocaleString('ar-SA')}</strong><span>ضغطات واتساب</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.phone_clicks||0).toLocaleString('ar-SA')}</strong><span>ضغطات اتصال</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.location_clicks||0).toLocaleString('ar-SA')}</strong><span>زيارات الفروع</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.lead_submissions||0).toLocaleString('ar-SA')}</strong><span>بيانات عملاء مسجلة</span></div>
        <div class="fl-analytics-card"><strong>${Number(a.saved_contacts||0).toLocaleString('ar-SA')}</strong><span>حفظ جهة الاتصال</span></div>
      </div>
      <div class="fl-analytics-chart-card">
        <div class="fl-analytics-chart-head"><div><h3>النشاط اليومي</h3><p>منحنى زمني حقيقي مبني على أحداث الموقع.</p></div><select id="flAnalyticsMetric" aria-label="المؤشر"><option value="visits" ${analyticsChartMetric==='visits'?'selected':''}>الزيارات</option><option value="products_open" ${analyticsChartMetric==='products_open'?'selected':''}>فتح المنتجات</option><option value="catalog_downloads" ${analyticsChartMetric==='catalog_downloads'?'selected':''}>تحميل الكتالوج</option><option value="lead_submissions" ${analyticsChartMetric==='lead_submissions'?'selected':''}>بيانات العملاء</option></select></div>
        <div class="fl-analytics-chart-wrap" id="flAnalyticsChart">${analyticsChartSvg(a.timeseries,analyticsChartMetric)}</div>
      </div>
      <div class="fl-analytics-columns">
        <div class="fl-cloud-card"><div class="fl-cloud-head"><div><h2 style="font-size:17px">الأقسام الأكثر ضغطًا</h2><p>عدد مرات اختيار كل قسم من كتالوج المنتجات.</p></div></div>${analyticsRows(a.categories,'لم يتم الضغط على أي قسم بعد.')}</div>
        <div class="fl-cloud-card"><div class="fl-cloud-head"><div><h2 style="font-size:17px">الفروع والمواقع</h2><p>الملز والفيصلية وأي فرع جديد يظهر منفصلًا.</p></div></div>${analyticsRows(a.locations,'لم تتم زيارة أي فرع بعد.')}</div>
      </div>
      <div class="fl-cloud-note">يتم الاحتفاظ بالأحداث الخام لمدة ${Number(a.raw_retention_days||180)} يومًا، ثم تُحفظ كإحصائيات يومية مجمعة تلقائيًا لتقليل حجم قاعدة البيانات. ${a.unique_visitors_is_approx?'*عند شمول بيانات مؤرشفة يكون عدد الزوار الفريدين تقديريًا لأن نفس الزائر قد يظهر في أكثر من يوم.':'عدد الزوار الفريدين محسوب من معرف متصفح مجهول ولا يتضمن الاسم أو رقم الجوال.'}</div>`);
    document.getElementById('flAnalyticsPeriod')?.addEventListener('change',e=>{analyticsPeriod=Number(e.target.value)||0;renderAnalytics();});
    document.getElementById('flAnalyticsRefresh')?.addEventListener('click',renderAnalytics);
    document.getElementById('flAnalyticsReset')?.addEventListener('click',async()=>{
      const resetBtn=document.getElementById('flAnalyticsReset');
      const confirmed=window.confirm('سيتم حذف جميع إحصائيات الموقع نهائيًا، بما فيها الزيارات وضغطات الأقسام والفروع وتحميلات الكتالوج، ثم يبدأ العد من الصفر.\n\nلن يتم حذف المنتجات أو الأقسام أو بيانات العملاء أو وسائل التواصل.\n\nهل تريد المتابعة؟');
      if(!confirmed)return;
      if(resetBtn){resetBtn.disabled=true;resetBtn.textContent='جاري إعادة التعيين...';}
      try{
        const {data:resetResult,error:resetError}=await db.rpc('reset_site_analytics_for_admin');
        if(resetError)throw resetError;
        const rawDeleted=Number(resetResult?.raw_deleted||0);
        const dailyDeleted=Number(resetResult?.daily_deleted||0);
        analyticsChartMetric='visits';
        notify(`تمت إعادة تعيين الإحصائيات · حُذف ${rawDeleted.toLocaleString('ar-SA')} حدث خام و${dailyDeleted.toLocaleString('ar-SA')} سجل مؤرشف`);
        await renderAnalytics();
      }catch(err){
        console.warn('[Analytics reset] failed',err);
        const resetMessage=String(err?.message||'');
        notify(/DELETE requires a WHERE clause/i.test(resetMessage)
          ? 'شغّل ملف FINAL_SQL_STAGE84.sql في Supabase مرة واحدة، ثم أعد المحاولة.'
          : (resetMessage||'تعذر إعادة تعيين الإحصائيات. شغّل ملف FINAL_SQL_STAGE84.sql في Supabase ثم حاول مجددًا.'));
        if(resetBtn){resetBtn.disabled=false;resetBtn.textContent='إعادة تعيين الإحصائيات';}
      }
    });
    document.getElementById('flAnalyticsMetric')?.addEventListener('change',e=>{analyticsChartMetric=e.target.value;updateAnalyticsChart(a);});
  }


  const DEFAULT_DATASHEET_FIELDS=[
    {key:'datasheet_1',label:'القدرة',unit:'W'},
    {key:'datasheet_2',label:'اللومن',unit:'lm'},
    {key:'datasheet_3',label:'المقاس',unit:''},
    {key:'datasheet_4',label:'اللون',unit:''}
  ];

  function normalizeDatasheetFields(value){
    const source=Array.isArray(value) ? value : (Array.isArray(value?.fields) ? value.fields : []);
    return source.map((field,index)=>{
      if(!field || typeof field!=='object') return null;
      const label=String(field.label||'').trim();
      if(!label) return null;
      return {
        key:String(field.key||`datasheet_${index+1}`).trim()||`datasheet_${index+1}`,
        label:label.slice(0,80),
        unit:String(field.unit||'').trim().slice(0,20)
      };
    }).filter(Boolean).slice(0,15);
  }

  async function loadDatasheetSettings(force=false){
    if(datasheetLoadPromise && !force) return datasheetLoadPromise;
    datasheetLoadError='';
    datasheetLoadPromise=(async()=>{
      const {data,error}=await db.rpc('get_datasheet_settings');
      if(error){
        const missing=String(error.code)==='PGRST202'||String(error.code)==='42883'||String(error.code)==='42703';
        throw new Error(missing?'شغّل ملف FINAL_SQL_STAGE84.sql في Supabase أولًا.':(error.message||error));
      }
      datasheetFields=normalizeDatasheetFields(data);
      return datasheetFields;
    })().catch(error=>{
      datasheetFields=null;
      datasheetLoadError=error?.message||String(error);
      throw error;
    }).finally(()=>{datasheetLoadPromise=null;});
    return datasheetLoadPromise;
  }

  function datasheetConfigRowHtml(field={}){
    return `<div class="fl-datasheet-config-row" data-datasheet-config-row>
      <div class="fl-cloud-field"><label>اسم المعلومة الفنية</label><input data-datasheet-config-label value="${esc(field.label||'')}" placeholder="مثال: القدرة"></div>
      <div class="fl-cloud-field fl-datasheet-unit-field"><label>الوحدة <small>(اختياري)</small></label><input data-datasheet-config-unit value="${esc(field.unit||'')}" placeholder="W / lm / V"></div>
      <button class="fl-cloud-mini red fl-datasheet-remove-field" data-datasheet-remove-field type="button">حذف</button>
    </div>`;
  }

  function datasheetValueFieldsHtml(fields){
    if(!fields.length) return '<div class="fl-cloud-empty full">لم يحدد المدير أي مواصفات فنية بعد.</div>';
    return fields.map((field,index)=>`<div class="fl-cloud-field">
      <label>${esc(field.label)}${field.unit?` <span class="fl-datasheet-unit">(${esc(field.unit)})</span>`:''}</label>
      <input data-datasheet-value="${index}" autocomplete="off" placeholder="أدخل القيمة فقط${field.unit?` — مثال: 30`:''}">
    </div>`).join('');
  }

  function fileAsDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(reader.error||new Error('تعذر قراءة الصورة.'));
      reader.readAsDataURL(file);
    });
  }

  async function createAdminDatasheetExport(event){
    event.preventDefault();
    const button=document.getElementById('flDatasheetCreate');
    const imageInput=document.getElementById('flDatasheetImage');
    const imageFile=imageInput?.files?.[0];
    const name=document.getElementById('flDatasheetName')?.value.trim()||'';
    const model=document.getElementById('flDatasheetCode')?.value.trim()||'';
    const caption=document.getElementById('flDatasheetCaption')?.value.trim()||'';
    if(!imageFile){notify('اختر صورة المنتج أولًا');return;}
    if(!name){notify('اكتب اسم المنتج');return;}
    const renderer=window.flDatasheetPdf;
    if(!(renderer?.createSinglePage||renderer?.createPage) || !renderer?.loadJsPdf){notify('أداة إنشاء PDF غير جاهزة. حدّث الصفحة وحاول مرة أخرى.');return;}
    button.disabled=true;button.textContent='جاري تصميم الداتا شيت…';
    try{
      const specifications=(datasheetFields||[]).map((field,index)=>{
        const value=String(body.querySelector(`[data-datasheet-value="${index}"]`)?.value||'').trim();
        if(!value) return null;
        const warranty=/ضمان|warranty/i.test(field.label);
        return {key:warranty?'warranty':field.key,label:field.label,value,unit:field.unit||''};
      }).filter(Boolean);
      const image=await fileAsDataUrl(imageFile);
      try{
        await document.fonts?.load('800 40px Tajawal');
        await document.fonts?.load('700 20px Tajawal');
      }catch(_){}
      const item={name,model,caption,specifications,image,image_path:'',gallery:[{image,image_path:'',is_primary:true,sort_order:0}]};
      const choice=await (renderer.askExportChoice?renderer.askExportChoice({title:'تحميل الداتا شيت',subtitle:'اختر تنزيل الداتا شيت كملف PDF أو صورة JPG عالية الدقة.',pdfLabel:'تحميل PDF',jpgLabel:'تحميل JPG'}):Promise.resolve('pdf'));
      if(!choice){button.disabled=false;button.textContent='صمّم وتحميل';return;}
      const exportScale=choice==='jpg'?(renderer.scales?.jpg||3):(renderer.scales?.pdf||2);
      const page=renderer.createSinglePage
        ? await renderer.createSinglePage(item,image,0,1,{scale:exportScale})
        : await renderer.createPage(item,{images:[{image,image_path:''}],singleMode:true,currentIndex:0,totalImages:1,scale:exportScale});
      const {canvas,failedImages}=page;
      const fileBase=`${renderer.safeFilePart?.(model||name)||'product'}-datasheet`;
      if(choice==='jpg'){
        await renderer.downloadCanvasAsJpg(canvas,`${fileBase}.jpg`,renderer.qualities?.jpg||0.94);
      }else{
        const JsPdf=await renderer.loadJsPdf();
        const pdf=new JsPdf({orientation:'portrait',unit:'mm',format:'a4',compress:true});
        pdf.addImage(canvas.toDataURL('image/jpeg',renderer.qualities?.pdf||0.94),'JPEG',0,0,210,297,undefined,'FAST');
        const blob=pdf.output('blob');
        renderer.triggerBlobDownload(blob,`${fileBase}.pdf`);
      }
      notify(failedImages?'تم إنشاء الداتا شيت، لكن تعذر إدراج الصورة.':'تم تصميم وتحميل الداتا شيت بنفس القالب المعتمد');
    }catch(error){
      console.warn('[Admin datasheet] generation failed',error);
      notify('تعذر تصميم الداتا شيت: '+(error?.message||error));
    }finally{
      button.disabled=false;button.textContent='صمّم وتحميل';
    }
  }

  function bindDatasheetDesigner(){
    const imageInput=document.getElementById('flDatasheetImage');
    const preview=document.getElementById('flDatasheetImagePreview');
    let previewUrl='';
    imageInput?.addEventListener('change',()=>{
      if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}
      const file=imageInput.files?.[0];
      if(!file){if(preview){preview.hidden=true;preview.removeAttribute('src');}return;}
      previewUrl=URL.createObjectURL(file);
      if(preview){preview.src=previewUrl;preview.hidden=false;}
    });
    document.getElementById('flDatasheetDesignerForm')?.addEventListener('submit',createAdminDatasheetExport);

    if(!isPrimaryAdmin) return;
    const list=document.getElementById('flDatasheetFieldsList');
    document.getElementById('flDatasheetAddField')?.addEventListener('click',()=>{
      const count=list?.querySelectorAll('[data-datasheet-config-row]').length||0;
      if(count>=15){notify('الحد الأقصى 15 معلومة فنية');return;}
      list?.insertAdjacentHTML('beforeend',datasheetConfigRowHtml({}));
      list?.lastElementChild?.querySelector('[data-datasheet-config-label]')?.focus();
    });
    list?.addEventListener('click',event=>{
      const remove=event.target.closest?.('[data-datasheet-remove-field]');
      if(remove) remove.closest('[data-datasheet-config-row]')?.remove();
    });
    document.getElementById('flDatasheetFieldsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const save=document.getElementById('flDatasheetFieldsSave');
      const fields=[...document.querySelectorAll('[data-datasheet-config-row]')].map((row,index)=>({
        key:`datasheet_${index+1}`,
        label:String(row.querySelector('[data-datasheet-config-label]')?.value||'').trim(),
        unit:String(row.querySelector('[data-datasheet-config-unit]')?.value||'').trim()
      })).filter(field=>field.label).slice(0,15);
      save.disabled=true;save.textContent='جاري الحفظ…';
      try{
        const {data,error}=await db.rpc('owner_set_datasheet_fields',{p_fields:fields});
        if(error){
          const missing=String(error.code)==='PGRST202'||String(error.code)==='42883'||String(error.code)==='42703';
          throw new Error(missing?'شغّل ملف FINAL_SQL_STAGE84.sql في Supabase أولًا.':(error.message||error));
        }
        datasheetFields=normalizeDatasheetFields(data);
        renderDatasheetDesigner();
        notify('تم حفظ المواصفات الثابتة للأدمن');
      }catch(error){
        notify('تعذر حفظ المواصفات: '+(error?.message||error));
        save.disabled=false;save.textContent='حفظ المواصفات الثابتة';
      }
    });
  }

  function renderDatasheetDesigner(){
    if(datasheetFields===null && !datasheetLoadError){
      layout(`<div class="fl-cloud-head"><div><h2>صمّم داتا شيت</h2><p>أداة إدارية خاصة ولا تظهر في واجهة العملاء.</p></div></div>
        <div class="fl-cloud-card fl-datasheet-loading"><strong>جاري تحميل إعدادات الداتا شيت…</strong><small>يتم جلب الحقول التي حددها المدير.</small></div>`);
      void loadDatasheetSettings().then(()=>{if(view==='datasheet')renderDatasheetDesigner();}).catch(()=>{if(view==='datasheet')renderDatasheetDesigner();});
      return;
    }
    if(datasheetLoadError){
      layout(`<div class="fl-cloud-head"><div><h2>صمّم داتا شيت</h2><p>أداة إدارية خاصة ولا تظهر في واجهة العملاء.</p></div></div>
        <div class="fl-cloud-note bad">${esc(datasheetLoadError)}</div>
        <div class="fl-cloud-actions"><button class="fl-cloud-btn primary" id="flDatasheetRetry" type="button">إعادة المحاولة</button></div>`);
      document.getElementById('flDatasheetRetry')?.addEventListener('click',()=>{datasheetLoadError='';datasheetFields=null;renderDatasheetDesigner();});
      return;
    }
    const fields=Array.isArray(datasheetFields)?datasheetFields:DEFAULT_DATASHEET_FIELDS;
    const ownerSettings=isPrimaryAdmin?`<div class="fl-cloud-card fl-datasheet-settings-card">
      <div class="fl-cloud-head"><div><h2 style="font-size:18px">المواصفات الثابتة للأدمن</h2><p>المدير يحدد أسماء المعلومات ووحداتها مرة واحدة، والأدمن يرى الأسماء فقط ويدخل القيم.</p></div></div>
      <form id="flDatasheetFieldsForm">
        <div id="flDatasheetFieldsList" class="fl-datasheet-config-list">${fields.map(datasheetConfigRowHtml).join('')}</div>
        <div class="fl-cloud-actions fl-datasheet-config-actions"><button class="fl-cloud-btn" id="flDatasheetAddField" type="button">+ إضافة معلومة فنية</button><button class="fl-cloud-btn primary" id="flDatasheetFieldsSave" type="submit">حفظ المواصفات الثابتة</button></div>
      </form>
      <div class="fl-cloud-note">يمكن إضافة حتى 15 معلومة. مثال: القدرة (W)، اللومن (lm)، المقاس، اللون، الضمان.</div>
    </div>`:'';
    layout(`<div class="fl-cloud-head"><div><h2>صمّم داتا شيت</h2><p>ارفع صورة المنتج وأدخل الاسم والكود والقيم؛ ثم اضغط «صمّم» واختر التحميل PDF أو JPG بنفس قالب الداتا شيت المعتمد.</p></div></div>
      ${ownerSettings}
      <div class="fl-cloud-card fl-datasheet-designer-card">
        <form id="flDatasheetDesignerForm">
          <div class="fl-cloud-form fl-datasheet-form">
            <div class="fl-cloud-field full fl-datasheet-image-field"><label>صورة المنتج</label><input id="flDatasheetImage" type="file" accept="image/*" required><div class="fl-datasheet-preview-wrap"><img id="flDatasheetImagePreview" class="fl-datasheet-preview" alt="معاينة صورة المنتج" hidden></div></div>
            <div class="fl-cloud-field"><label>اسم المنتج</label><input id="flDatasheetName" required placeholder="مثال: كشاف LED جداري"></div>
            <div class="fl-cloud-field"><label>كود / رقم المنتج</label><input id="flDatasheetCode" placeholder="مثال: WL-205"></div>
            <div class="fl-cloud-field full"><label>وصف مختصر <small>(اختياري)</small></label><input id="flDatasheetCaption" placeholder="سطر مختصر يظهر أسفل اسم المنتج"></div>
            <div class="fl-datasheet-section-title full"><strong>المعلومات الفنية</strong>${isPrimaryAdmin?'<small>هذه نفس الحقول التي حددتها بالأعلى.</small>':''}</div>
            ${datasheetValueFieldsHtml(fields)}
          </div>
          <div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary fl-datasheet-create" id="flDatasheetCreate" type="submit">صمّم وتحميل</button></div>
        </form>
      </div>
      <div class="fl-cloud-note ok">القالب المستخدم هنا هو نفس قالب «تحميل الصورة مع المعلومات الفنية» الموجود في المنتجات، بما فيه الرأس والتذييل وجدول المواصفات والضمان.</div>`);
    bindDatasheetDesigner();
  }

  function renderProfile(){
    layout(`<div class="fl-cloud-head"><div><h2>البيانات الشخصية</h2><p>كل الحقول اختيارية. إذا تركت الحقل فارغًا فلن يظهر في الموقع.</p></div></div>
      <div class="fl-cloud-card">
        <form id="flProfileForm">
          <div class="fl-cloud-form">
            <div class="fl-cloud-field"><label>اسم الشخص</label><input id="flProfileName" value="${esc(profile.full_name||'')}" placeholder="مثال: سعيد ناجي"></div>
            <div class="fl-cloud-field"><label>اسم العلامة / المتجر</label><input id="flProfileBrand" value="${esc(profile.brand_name||'')}" placeholder="مثال: اسم المتجر أو العلامة"></div>
            <div class="fl-cloud-field"><label>المسمى الوظيفي بالعربي</label><input id="flProfileJobAr" value="${esc(profile.job_title_ar||'')}" placeholder="مثال: مدير مبيعات"></div>
            <div class="fl-cloud-field"><label>المسمى الوظيفي بالإنجليزي</label><input id="flProfileJobEn" value="${esc(profile.job_title_en||'')}" placeholder="مثال: Sales Manager"></div>
            <div class="fl-cloud-field full"><label>اسم الشركة / السطر الثاني</label><input id="flProfileCompany" value="${esc(profile.company_name||'')}" placeholder="مثال: اسم الشركة"></div>
            <div class="fl-cloud-field full">
              <div class="fl-profile-images">
                <div class="fl-profile-image-card">${profileImagePreview(profile.logo_path,'logo')}<label><b>شعار الشركة</b><input id="flProfileLogo" type="file" accept="image/*"></label>${profile.logo_path?'<label class="fl-cloud-check"><input id="flRemoveLogo" type="checkbox"> حذف الشعار الحالي</label>':''}</div>
                <div class="fl-profile-image-card">${profileImagePreview(profile.portrait_path,'portrait')}<label><b>الصورة الشخصية</b><input id="flProfilePortrait" type="file" accept="image/*"></label>${profile.portrait_path?'<label class="fl-cloud-check"><input id="flRemovePortrait" type="checkbox"> حذف الصورة الحالية</label>':''}</div>
              </div>
            </div>
          </div>
          <div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flProfileSave" type="submit">حفظ البيانات</button></div>
        </form>
      </div>`);
    document.getElementById('flProfileForm').addEventListener('submit',saveProfile);
  }

  async function saveProfile(e){
    e.preventDefault();
    const btn=document.getElementById('flProfileSave');btn.disabled=true;btn.textContent='جاري الحفظ...';
    const oldLogo=profile.logo_path||'';
    const oldPortrait=profile.portrait_path||'';
    const uploaded=[];
    const deleteAfterSave=[];
    try{
      let logo_path=oldLogo, portrait_path=oldPortrait;
      const logoFile=document.getElementById('flProfileLogo').files?.[0];
      const portraitFile=document.getElementById('flProfilePortrait').files?.[0];
      const removeLogo=Boolean(document.getElementById('flRemoveLogo')?.checked);
      const removePortrait=Boolean(document.getElementById('flRemovePortrait')?.checked);

      if(removeLogo){if(isStoragePath(oldLogo))deleteAfterSave.push(oldLogo);logo_path='';}
      if(removePortrait){if(isStoragePath(oldPortrait))deleteAfterSave.push(oldPortrait);portrait_path='';}
      if(logoFile){
        const next=await uploadBlob(await fileToOptimizedBlob(logoFile),'site-assets');uploaded.push(next);
        if(isStoragePath(oldLogo) && !deleteAfterSave.includes(oldLogo)) deleteAfterSave.push(oldLogo);
        logo_path=next;
      }
      if(portraitFile){
        const next=await uploadBlob(await fileToOptimizedBlob(portraitFile),'site-assets');uploaded.push(next);
        if(isStoragePath(oldPortrait) && !deleteAfterSave.includes(oldPortrait)) deleteAfterSave.push(oldPortrait);
        portrait_path=next;
      }

      const payload={
        id:1,
        full_name:document.getElementById('flProfileName').value.trim(),
        brand_name:document.getElementById('flProfileBrand').value.trim(),
        company_name:document.getElementById('flProfileCompany').value.trim(),
        job_title_ar:document.getElementById('flProfileJobAr').value.trim(),
        job_title_en:document.getElementById('flProfileJobEn').value.trim(),
        logo_path,portrait_path
      };
      const {error}=await db.from('site_profile').upsert(payload,{onConflict:'id'});
      if(error) throw error;
      if(deleteAfterSave.length) await db.storage.from(bucket).remove([...new Set(deleteAfterSave)]);
      profile={...profile,...payload};await loadPublicProfile();renderProfile();notify('تم حفظ البيانات وظهرت على الموقع');
    }catch(err){
      if(uploaded.length) await db.storage.from(bucket).remove(uploaded);
      notify('تعذر الحفظ: '+(err.message||err));btn.disabled=false;btn.textContent='حفظ البيانات';
    }
  }

  function contactTypeName(type){return contactLabels[type]||type||'وسيلة تواصل';}
  function contactRows(list){
    if(!list.length)return '<div class="fl-cloud-empty">لا توجد وسائل تواصل بعد.</div>';
    return `<div class="fl-cloud-list">${list.map(item=>`<div class="fl-cloud-row"><div class="fl-cloud-row-meta"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><strong>${esc(item.label||contactTypeName(item.type))}</strong><span class="fl-contact-type">${esc(contactTypeName(item.type))}</span></div><small dir="ltr">${esc(item.value||'')}</small><small>${item.is_visible===false?'مخفي':'ظاهر'} · ترتيب ${Number(item.sort_order||0)}</small></div><div class="fl-cloud-row-actions"><button class="fl-cloud-mini" data-contact-edit="${item.id}" type="button">تعديل</button><button class="fl-cloud-mini red" data-contact-delete="${item.id}" type="button">حذف</button></div></div>`).join('')}</div>`;
  }

  function renderContacts(){
    layout(`<div class="fl-cloud-head"><div><h2>وسائل التواصل</h2><p>يمكنك إضافة أكثر من رقم جوال، وأكثر من واتساب، وأكثر من موقع إلكتروني.</p></div><button class="fl-cloud-btn primary" id="flAddContact" type="button">+ إضافة وسيلة</button></div><div class="fl-cloud-card">${contactRows(contacts)}</div>`);
    document.getElementById('flAddContact').addEventListener('click',()=>openContactForm());
    bindContactActions();
  }
  function bindContactActions(){
    body.querySelectorAll('[data-contact-edit]').forEach(b=>b.addEventListener('click',()=>openContactForm(contacts.find(c=>c.id===b.dataset.contactEdit))));
    body.querySelectorAll('[data-contact-delete]').forEach(b=>b.addEventListener('click',()=>deleteContact(b.dataset.contactDelete)));
  }
  function openContactForm(item=null){
    const type=item?.type||'phone';
    openModal(item?'تعديل وسيلة التواصل':'إضافة وسيلة تواصل',`<form id="flContactForm"><div class="fl-cloud-form">
      <div class="fl-cloud-field"><label>النوع</label><select id="flContactType"><option value="phone" ${type==='phone'?'selected':''}>جوال</option><option value="whatsapp" ${type==='whatsapp'?'selected':''}>واتساب</option><option value="website" ${type==='website'?'selected':''}>موقع إلكتروني</option><option value="email" ${type==='email'?'selected':''}>بريد إلكتروني</option><option value="location" ${type==='location'?'selected':''}>رابط موقع / خرائط</option></select></div>
      <div class="fl-cloud-field"><label>الترتيب</label><input id="flContactSort" type="number" min="0" step="1" value="${Number(item?.sort_order||0)}"></div>
      <div class="fl-cloud-field full"><label>الاسم الظاهر (اختياري)</label><input id="flContactLabel" value="${esc(item?.label||'')}" placeholder="مثال: جوال المبيعات، واتساب الطلبات، الموقع الرسمي"></div>
      <div class="fl-cloud-field full"><label>الرقم أو الرابط</label><input id="flContactValue" required value="${esc(item?.value||'')}" placeholder="مثال: 0570000000 أو https://example.com"></div>
      <label class="fl-cloud-check full"><input id="flContactVisible" type="checkbox" ${item?.is_visible===false?'':'checked'}> إظهار للزوار</label>
      </div><div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" type="submit">حفظ</button><button class="fl-cloud-btn" id="flContactCancel" type="button">إلغاء</button></div></form>`);
    document.getElementById('flContactCancel').addEventListener('click',closeModal);
    document.getElementById('flContactForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const payload={type:document.getElementById('flContactType').value,label:document.getElementById('flContactLabel').value.trim(),value:document.getElementById('flContactValue').value.trim(),sort_order:Number(document.getElementById('flContactSort').value)||0,is_visible:document.getElementById('flContactVisible').checked};
      const res=item?await db.from('contact_items').update(payload).eq('id',item.id):await db.from('contact_items').insert(payload);
      if(res.error){notify('تعذر الحفظ: '+res.error.message);return;}
      closeModal();await loadContactsAdminData();await loadPublicProfile();renderContacts();notify('تم حفظ وسيلة التواصل');
    });
  }
  async function deleteContact(id){
    const item=contacts.find(c=>c.id===id);if(!item||!confirm(`حذف «${item.label||contactTypeName(item.type)}»؟`))return;
    const {error}=await db.from('contact_items').delete().eq('id',id);if(error){notify('تعذر الحذف: '+error.message);return;}
    contacts=contacts.filter(c=>c.id!==id);await loadPublicProfile();renderContacts();notify('تم حذف وسيلة التواصل');
  }

  function vcardEscape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function leadDate(value){
    if(!value)return '';
    try{return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_){return String(value);}
  }
  function leadVCard(lead){
    const fullName=String(lead.full_name||'').trim() || 'Customer';
    const company=String(lead.company_name||'').trim();
    const phone=normalizeLeadPhone(lead.mobile);
    const tel=phone?`+${phone}`:String(lead.mobile||'').trim();
    const name=vcardEscape(fullName);
    // Minimal vCard 3.0: safest common subset for iPhone, Android and Samsung Contacts.
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:;${name};;;`,
      `FN:${name}`,
      company?`ORG:${vcardEscape(company)}`:'',
      tel?`TEL;TYPE=CELL:${vcardEscape(tel)}`:'',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');
  }
  function uniqueLeadsForExport(list){
    const seen=new Set();const out=[];
    (list||[]).forEach(lead=>{const key=normalizeLeadPhone(lead.mobile)||String(lead.id||'');if(seen.has(key))return;seen.add(key);out.push(lead);});
    return out;
  }
  function downloadLeadsVcf(list=leads,filename='flower-light-customers.vcf'){
    const exportList=uniqueLeadsForExport(list);
    if(!exportList.length){notify('لا توجد جهات اتصال للتحميل');return;}
    // No BOM. Keep cards contiguous and terminate the file with CRLF for iOS/Android importers.
    const content=exportList.map(leadVCard).join('\r\n')+'\r\n';
    const blob=new Blob([content],{type:'text/x-vcard;charset=utf-8'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function leadRows(list){
    if(!list.length)return '<div class="fl-cloud-empty">لم يسجل أي عميل بياناته بعد.</div>';
    return `<div class="fl-cloud-list">${list.map(lead=>`<div class="fl-cloud-row"><div class="fl-cloud-row-meta"><strong>${esc(lead.full_name||'بدون اسم')}</strong><span class="fl-lead-company">${esc(lead.company_name||'')}</span><a class="fl-lead-phone" href="tel:${esc(leadPhoneDigits(lead.mobile))}">${esc(lead.mobile||'')}</a><small class="fl-lead-date">${esc(leadDate(lead.created_at))}</small></div><div class="fl-cloud-row-actions"><button class="fl-cloud-mini green" data-lead-vcf="${lead.id}" type="button">VCF</button><button class="fl-cloud-mini red" data-lead-delete="${lead.id}" type="button">حذف</button></div></div>`).join('')}</div>`;
  }
  async function fetchAllLeads({idsOnly=false,searchTerm=''}={}){
    const rows=[];
    const pageSize=1000;
    for(let offset=0;;offset+=pageSize){
      let query=db.from('customer_leads')
        .select(idsOnly?'id':'id,full_name,company_name,mobile,created_at')
        .order('created_at',{ascending:false})
        .range(offset,offset+pageSize-1);
      query=applyLeadSearch(query,searchTerm);
      const {data,error}=await query;
      if(error)throw error;
      const page=Array.isArray(data)?data:[];
      rows.push(...page);
      if(page.length<pageSize)break;
    }
    return rows;
  }

  async function loadMoreLeads(){
    if(leadsLoading||!leadsHasMore)return;
    const button=document.getElementById('flLoadMoreLeads');
    if(button){rememberButtonHtml(button);button.disabled=true;button.innerHTML='<span class="fl-btn-icon">⏳</span><span>جاري التحميل...</span>';}
    const scrollTop=shell.scrollTop;
    try{
      await loadLeadsPage({reset:false});
      renderLeads();
      requestAnimationFrame(()=>{shell.scrollTop=scrollTop;});
    }catch(error){
      notify('تعذر تحميل المزيد: '+(error?.message||error));
      if(button){button.disabled=false;restoreButtonHtml(button,'تحميل المزيد');}
    }
  }

  function rememberButtonHtml(button){
    if(button && !button.dataset.originalHtml)button.dataset.originalHtml=button.innerHTML;
  }
  function restoreButtonHtml(button,fallbackText=""){
    if(!button)return;
    button.innerHTML=button.dataset.originalHtml||fallbackText;
  }

  async function exportAllLeads(){
    const button=document.getElementById('flDownloadAllLeads');
    rememberButtonHtml(button);
    if(button){button.disabled=true;button.innerHTML='<span class="fl-btn-icon">⏳</span><span>جاري تجهيز الملف...</span>';}
    try{
      const all=await fetchAllLeads();
      if(!all.length){notify('لا توجد جهات اتصال للتصدير');return;}
      downloadLeadsVcf(all,`flower-light-customers-${new Date().toISOString().slice(0,10)}.vcf`);
      notify(`تم تجهيز ${all.length} جهة اتصال`);
    }catch(error){notify('تعذر تجهيز ملف جهات الاتصال: '+(error?.message||error));}
    finally{if(button){button.disabled=false;restoreButtonHtml(button,'تحميل الكل VCF');}}
  }

  function renderLeads(){
    const uniqueCount=uniqueLeadsForExport(leads).length;
    const totalAll=leadsAllTotalCount||(!leadsSearchTerm?leadsTotalCount:0);
    const filteredLabel=leadsSearchTerm?`نتائج البحث: ${leadsTotalCount}`:`المعروض: ${leads.length} من ${leadsTotalCount}`;
    const searchNote=leadsSearchTerm?`<div class="fl-cloud-note ok">البحث الحالي: <b>${esc(leadsSearchTerm)}</b> · ${Number(leadsTotalCount).toLocaleString('ar-SA')} نتيجة</div>`:'';
    layout(`<div class="fl-cloud-head fl-lead-toolbar"><div><h2>جهات اتصال العملاء</h2><p>يتم تحميل أحدث ${LEADS_PAGE_SIZE} سجل فقط في البداية لتبقى اللوحة سريعة، ثم يمكنك تحميل المزيد عند الحاجة.</p></div><div class="fl-lead-toolbar-actions"><button class="fl-cloud-btn success" id="flDownloadAllLeads" type="button" ${totalAll?'':'disabled'}><span class="fl-btn-icon">⬇️</span><span>تحميل الكل VCF</span></button><button class="fl-cloud-btn danger" id="flDeleteAllLeads" type="button" ${totalAll?'':'disabled'}><span class="fl-btn-icon">🗑️</span><span>حذف الكل</span></button></div></div>
      <div class="fl-cloud-card fl-lead-search-card"><form id="flLeadSearchForm" class="fl-lead-search-form"><div class="fl-lead-search-input-wrap"><input id="flLeadSearchInput" class="fl-lead-search-input" type="search" inputmode="search" value="${esc(leadsSearchTerm)}" placeholder="ابحث بالاسم أو الشركة أو رقم الجوال"></div><button class="fl-cloud-btn primary" type="submit"><span class="fl-btn-icon">🔎</span><span>بحث</span></button>${leadsSearchTerm?'<button class="fl-cloud-btn secondary" id="flLeadSearchClear" type="button"><span class="fl-btn-icon">✕</span><span>مسح البحث</span></button>':''}</form></div>
      ${searchNote}
      <div class="fl-lead-stats"><div class="fl-lead-stat"><strong>${Number(totalAll).toLocaleString('ar-SA')}</strong><span>إجمالي التسجيلات</span></div><div class="fl-lead-stat"><strong>${Number(leads.length).toLocaleString('ar-SA')}</strong><span>${esc(filteredLabel)}</span></div><div class="fl-lead-stat"><strong>${Number(uniqueCount).toLocaleString('ar-SA')}</strong><span>أرقام فريدة في المعروض</span></div></div>
      <div class="fl-cloud-card">${leadRows(leads)}${leadsHasMore?`<div class="fl-cloud-actions" style="justify-content:center;margin-top:14px"><button class="fl-cloud-btn secondary" id="flLoadMoreLeads" type="button"><span class="fl-btn-icon">＋</span><span>تحميل المزيد (${Math.min(LEADS_PAGE_SIZE,Math.max(0,leadsTotalCount-leads.length))})</span></button></div>`:''}</div>`);
    document.getElementById('flDownloadAllLeads')?.addEventListener('click',exportAllLeads);
    document.getElementById('flDeleteAllLeads')?.addEventListener('click',deleteAllLeads);
    document.getElementById('flLoadMoreLeads')?.addEventListener('click',loadMoreLeads);
    document.getElementById('flLeadSearchForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const input=document.getElementById('flLeadSearchInput');
      const term=sanitizeLeadSearch(input?.value||'');
      try{await loadLeadsPage({reset:true,searchTerm:term});renderLeads();}
      catch(error){notify('تعذر البحث: '+(error?.message||error));}
    });
    document.getElementById('flLeadSearchClear')?.addEventListener('click',async()=>{
      try{await loadLeadsPage({reset:true,searchTerm:''});renderLeads();}
      catch(error){notify('تعذر تحديث القائمة: '+(error?.message||error));}
    });
    body.querySelectorAll('[data-lead-vcf]').forEach(b=>b.addEventListener('click',()=>{const lead=leads.find(x=>x.id===b.dataset.leadVcf);if(lead){const phone=normalizeLeadPhone(lead.mobile)||String(lead.id||'').slice(0,8);downloadLeadsVcf([lead],`customer-${phone}.vcf`);}}));
    body.querySelectorAll('[data-lead-delete]').forEach(b=>b.addEventListener('click',()=>deleteLead(b.dataset.leadDelete)));
  }

  async function deleteAllLeads(){
    const total=leadsAllTotalCount||leadsTotalCount;
    if(!total)return;
    if(!confirm(`سيتم حذف جميع جهات اتصال العملاء (${total}) نهائيًا، وليس فقط السجلات المعروضة الآن. هل تريد المتابعة؟`))return;
    const button=document.getElementById('flDeleteAllLeads');
    rememberButtonHtml(button);
    if(button){button.disabled=true;button.innerHTML='<span class="fl-btn-icon">⏳</span><span>جاري الحذف...</span>';}
    try{
      const allIds=await fetchAllLeads({idsOnly:true});
      for(let i=0;i<allIds.length;i+=100){
        const batch=allIds.slice(i,i+100).map(item=>item.id).filter(Boolean);
        if(!batch.length)continue;
        const {error}=await db.from('customer_leads').delete().in('id',batch);
        if(error)throw error;
      }
      leads=[];leadsTotalCount=0;leadsAllTotalCount=0;leadsHasMore=false;leadsSearchTerm='';
      renderLeads();notify('تم حذف جميع جهات اتصال العملاء');
    }catch(error){
      notify('تعذر حذف جهات الاتصال: '+(error?.message||error));
      if(button){button.disabled=false;restoreButtonHtml(button,'حذف الكل');}
    }
  }

  async function deleteLead(id){
    const lead=leads.find(x=>x.id===id);if(!lead||!confirm(`حذف جهة اتصال «${lead.full_name||'العميل'}»؟`))return;
    const {error}=await db.from('customer_leads').delete().eq('id',id);if(error){notify('تعذر الحذف: '+error.message);return;}
    leads=leads.filter(item=>item.id!==id);
    leadsTotalCount=Math.max(0,leadsTotalCount-1);
    leadsAllTotalCount=Math.max(0,leadsAllTotalCount-1);
    leadsHasMore=leads.length<leadsTotalCount;
    renderLeads();notify('تم حذف جهة اتصال العميل');
  }

  function sectionAdminRows(){
    const combined=[
      ...categories.map(c=>({type:'category',sort_order:Number(c.sort_order)||0,created_at:c.created_at||'',row:c})),
      ...siteCatalogs.map(c=>({type:'catalog',sort_order:Number(c.sort_order)||0,created_at:c.created_at||'',row:c}))
    ].sort((a,b)=>a.sort_order-b.sort_order || String(a.created_at).localeCompare(String(b.created_at)));
    if(!combined.length) return `<div class="fl-cloud-empty">لا توجد أقسام أو كتالوجات بعد.</div>`;
    return `<div class="fl-cloud-list">${combined.map(item=>{
      if(item.type==='catalog'){
        const c=item.row;
        return `<div class="fl-cloud-row"><div class="fl-cloud-row-meta"><strong>${esc(c.name||'كتالوج')}</strong><small>كتالوج PDF · الترتيب ${Number(c.sort_order)||0} · ${c.is_visible===false?'مخفي':'ظاهر'}</small></div><div class="fl-cloud-row-actions"><button class="fl-cloud-mini" data-section-catalog-open="${c.id}" type="button">فتح</button><button class="fl-cloud-mini" data-section-catalog-edit="${c.id}" type="button">تعديل</button><button class="fl-cloud-mini red" data-section-catalog-delete="${c.id}" type="button">حذف</button></div></div>`;
      }
      const c=item.row;const count=products.filter(p=>p.category_id===c.id).length;
      return `<div class="fl-cloud-row"><div class="fl-cloud-row-meta"><strong>${esc(c.name)}</strong><small>${count} منتج · الترتيب ${Number(c.sort_order)||0} · ${c.is_visible===false?'مخفي':'ظاهر'}</small></div><div class="fl-cloud-row-actions"><button class="fl-cloud-mini" data-cat-products="${c.id}" type="button">المنتجات</button><button class="fl-cloud-mini" data-cat-edit="${c.id}" type="button">تعديل</button><button class="fl-cloud-mini red" data-cat-delete="${c.id}" type="button">حذف</button></div></div>`;
    }).join('')}</div>`;
  }

  function renderSections(){
    layout(`<div class="fl-cloud-head"><div><h2>الأقسام والكتالوجات</h2><p>الأقسام والكتالوجات PDF تستخدم نفس رقم الترتيب. مثال: إذا كان الكتالوج ترتيبه 1 والبلفون 2 فسيظهر الكتالوج قبله للزوار.</p></div><div class="fl-cloud-head-actions"><button class="fl-cloud-btn" id="flAddCatalogFromSections" type="button">+ كتالوج PDF</button><button class="fl-cloud-btn primary" id="flAddCategory" type="button">+ قسم جديد</button></div></div><div class="fl-cloud-card">${sectionAdminRows()}</div>`);
    document.getElementById('flAddCategory')?.addEventListener('click',()=>openCategoryForm());
    document.getElementById('flAddCatalogFromSections')?.addEventListener('click',()=>openCatalogForm());
    bindCategoryActions();
  }
  function bindCategoryActions(){
    body.querySelectorAll('[data-cat-products]').forEach(b=>b.addEventListener('click',()=>{selectedCategory=b.dataset.catProducts;selectedProductNode=`category:${b.dataset.catProducts}`;view='products';renderProducts();}));
    body.querySelectorAll('[data-cat-edit]').forEach(b=>b.addEventListener('click',()=>openCategoryForm(categories.find(c=>c.id===b.dataset.catEdit))));
    body.querySelectorAll('[data-cat-delete]').forEach(b=>b.addEventListener('click',()=>deleteCategory(b.dataset.catDelete)));
    body.querySelectorAll('[data-section-catalog-open]').forEach(b=>b.addEventListener('click',()=>{selectedProductNode=`catalog:${b.dataset.sectionCatalogOpen}`;view='products';renderProducts();}));
    body.querySelectorAll('[data-section-catalog-edit]').forEach(b=>b.addEventListener('click',()=>openCatalogForm(siteCatalogs.find(c=>String(c.id)===String(b.dataset.sectionCatalogEdit)))));
    body.querySelectorAll('[data-section-catalog-delete]').forEach(b=>b.addEventListener('click',()=>deleteCatalog(b.dataset.sectionCatalogDelete)));
  }

  const MAX_PRODUCT_IMAGES = 4;

  function adminGalleryRows(prod){
    if(!prod?.id) return [];
    let rows=productImages.filter(row=>row.product_id===prod.id && row.image_path).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
    if(prod.image_path && !rows.some(row=>row.image_path===prod.image_path)){
      rows.unshift({id:'',product_id:prod.id,image_path:prod.image_path,sort_order:-1,is_primary:true});
    }
    let primaryIndex=rows.findIndex(row=>row.image_path===prod.image_path);
    if(primaryIndex<0) primaryIndex=rows.findIndex(row=>row.is_primary===true);
    if(primaryIndex<0 && rows.length) primaryIndex=0;
    if(primaryIndex>0){const [primary]=rows.splice(primaryIndex,1);rows.unshift(primary);}
    return rows.slice(0,MAX_PRODUCT_IMAGES).map((row,index)=>({...row,is_primary:index===0,sort_order:index*10}));
  }

  function categoryProductsInOrder(categoryId){
    return products.filter(p=>p.category_id===categoryId).slice().sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0) || String(a.created_at||'').localeCompare(String(b.created_at||'')));
  }

  function nextProductSort(categoryId){
    const list=categoryProductsInOrder(categoryId);
    if(!list.length) return 0;
    return Math.max(...list.map(p=>Number(p.sort_order)||0))+10;
  }

  async function saveProductOrder(productIds){
    if(!productIds.length) return;
    const {error}=await db.rpc('reorder_products_for_admin',{p_product_ids:productIds});
    if(error) throw new Error((String(error.code)==='PGRST202'||String(error.code)==='42883') ? 'شغّل ملف FINAL_SQL_STAGE84.sql أولًا ثم أعد المحاولة.' : (error.message||error));
  }

  function bindProductDragReorder(){
    const container=body.querySelector('.fl-cloud-products');
    if(!container) return;
    let dragged=null;
    let pointerId=null;
    let moved=false;
    const status=document.getElementById('flProductOrderStatus');

    const finish=async()=>{
      if(!dragged) return;
      dragged.classList.remove('is-dragging');
      dragged=null; pointerId=null;
      if(!moved) return;
      const ids=[...container.querySelectorAll('.fl-cloud-product[data-product-id]')].map(card=>card.dataset.productId).filter(Boolean);
      if(status){status.textContent='جاري حفظ الترتيب...';status.classList.add('saving');}
      try{
        await saveProductOrder(ids);
        const orderMap=new Map(ids.map((id,index)=>[String(id),index*10]));
        products=products.map(p=>orderMap.has(String(p.id))?{...p,sort_order:orderMap.get(String(p.id))}:p);
        syncPublicProductsFromAdminCache();
        if(status){status.textContent='تم حفظ الترتيب';status.classList.remove('saving');status.classList.add('saved');}
        notify('تم حفظ ترتيب المنتجات');
        window.setTimeout(()=>renderProducts(),500);
      }catch(err){
        notify('تعذر حفظ الترتيب: '+(err.message||err));
        await loadCatalogAdminData();renderProducts();
      }
    };

    container.querySelectorAll('.fl-product-drag-handle').forEach(handle=>{
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==undefined && event.button!==0) return;
        const card=handle.closest('.fl-cloud-product');
        if(!card) return;
        dragged=card; pointerId=event.pointerId; moved=false;
        try{handle.setPointerCapture(pointerId);}catch(_){}
        card.classList.add('is-dragging');
        event.preventDefault();
      });
      handle.addEventListener('pointermove',event=>{
        if(!dragged || event.pointerId!==pointerId) return;
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('.fl-cloud-product[data-product-id]');
        if(!target || target===dragged || target.parentElement!==container) return;
        const cards=[...container.querySelectorAll('.fl-cloud-product[data-product-id]')];
        const from=cards.indexOf(dragged), to=cards.indexOf(target);
        if(from<0 || to<0) return;
        if(from<to) target.after(dragged); else target.before(dragged);
        moved=true;
      });
      handle.addEventListener('pointerup',event=>{if(event.pointerId===pointerId) void finish();});
      handle.addEventListener('pointercancel',event=>{if(event.pointerId===pointerId) void finish();});
    });
  }

  async function copyProductStorageImage(path,categoryId){
    if(!isStoragePath(path)) return path;
    const clean=String(path).split('?')[0];
    const match=clean.match(/\.([a-z0-9]{2,5})$/i);
    const ext=match?.[1]?.toLowerCase() || 'webp';
    const target=`${categoryId}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(bucket).copy(path,target);
    if(error) throw error;
    return target;
  }

  async function duplicateProduct(id){
    const source=products.find(p=>p.id===id);
    if(!source) return;
    if(!confirm(`إنشاء نسخة مستقلة من «${source.name||'المنتج'}» مع المواصفات والصور؟\n\nستُنشأ النسخة مخفية حتى تراجعها ثم تُظهرها.`)) return;
    const sourceGallery=adminGalleryRows(source);
    if(!sourceGallery.length){notify('لا توجد صورة للمنتج لنسخها');return;}
    const copiedStoragePaths=[];
    let createdId='';
    let duplicateCommitted=false;
    try{
      notify('جاري نسخ المنتج والصور...');
      const copiedPaths=[];
      for(const row of sourceGallery){
        const copied=await copyProductStorageImage(row.image_path,source.category_id);
        copiedPaths.push(copied);
        if(copied!==row.image_path && isStoragePath(copied)) copiedStoragePaths.push(copied);
      }
      const payload={
        category_id:source.category_id,
        name:`${source.name||'منتج'} - نسخة`,
        model:source.model||'',
        caption:source.caption||'',
        image_path:copiedPaths[0],
        specifications:[
          ...normalizeSpecifications(source.specifications),
          {key:WHATSAPP_META_SHOW_DESCRIPTION,label:'',value:productWhatsAppOption(source.specifications,WHATSAPP_META_SHOW_DESCRIPTION)?'1':'0',unit:''},
          {key:WHATSAPP_META_SHOW_SPECS,label:'',value:productWhatsAppOption(source.specifications,WHATSAPP_META_SHOW_SPECS)?'1':'0',unit:''},
          pricingMetaRow(productPricingTiers(source.specifications,source))
        ],
        price:source.price==null?null:Number(source.price),
        wholesale_price:source.wholesale_price==null?null:Number(source.wholesale_price),
        wholesale_min_qty:source.wholesale_min_qty==null?null:Number(source.wholesale_min_qty),
        limited_offer:source.limited_offer===true,
        sort_order:(Number(source.sort_order)||0)+1,
        is_visible:false
      };
      const {data:created,error:createError}=await db.from('products').insert(payload).select().single();
      if(createError) throw createError;
      createdId=created.id;
      const {error:galleryError}=await db.rpc('set_product_gallery_for_admin',{
        p_product_id:createdId,
        p_image_paths:copiedPaths,
        p_primary_path:copiedPaths[0]
      });
      if(galleryError) throw galleryError;

      const order=categoryProductsInOrder(source.category_id).map(p=>p.id);
      const sourceIndex=order.indexOf(source.id);
      order.splice(sourceIndex>=0?sourceIndex+1:order.length,0,createdId);
      await saveProductOrder(order);
      duplicateCommitted=true;
      const duplicateId=createdId;
      createdId='';
      await loadCatalogAdminData();syncPublicProductsFromAdminCache();renderProducts();
      const duplicate=products.find(p=>p.id===duplicateId);
      notify('تم إنشاء نسخة مخفية مستقلة؛ عدّلها ثم فعّل إظهارها');
      if(duplicate) openProductForm(duplicate);
    }catch(err){
      if(!duplicateCommitted){
        if(createdId) await db.from('products').delete().eq('id',createdId);
        if(copiedStoragePaths.length) await db.storage.from(bucket).remove(copiedStoragePaths);
        notify('تعذر نسخ المنتج: '+(err.message||err));
      }else{
        notify('تم نسخ المنتج، لكن تعذر تحديث الشاشة. حدّث الصفحة وستجد النسخة.');
      }
    }
  }

  const XLSX_IMPORT_CDN='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const JSZIP_IMPORT_CDN='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  let productImportLibrariesPromise=null;
  let currentProductImportPlan=null;

  function loadAdminScriptOnce(src,marker,test){
    if(test()) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-${marker}]`);
      const done=()=>test()?resolve():reject(new Error('تعذر تحميل مكتبة الاستيراد'));
      if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>reject(new Error('تعذر تحميل مكتبة الاستيراد')),{once:true});return;}
      const script=document.createElement('script');script.src=src;script.async=true;script.setAttribute(`data-${marker}`,'1');
      script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('تعذر تحميل مكتبة الاستيراد من الإنترنت')),{once:true});document.head.appendChild(script);
    });
  }

  function loadProductImportLibraries(){
    if(productImportLibrariesPromise) return productImportLibrariesPromise;
    productImportLibrariesPromise=(async()=>{
      await Promise.all([
        loadAdminScriptOnce(XLSX_IMPORT_CDN,'fl-xlsx',()=>Boolean(window.XLSX)),
        loadAdminScriptOnce(JSZIP_IMPORT_CDN,'fl-jszip',()=>Boolean(window.JSZip))
      ]);
      if(!window.XLSX||!window.JSZip) throw new Error('مكتبات Excel غير جاهزة');
    })().catch(error=>{productImportLibrariesPromise=null;throw error;});
    return productImportLibrariesPromise;
  }

  function importText(value){return String(value??'').trim();}
  function importKey(value){
    return importText(value).toLowerCase().replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\s_\-\/]+/g,' ').replace(/[.:،؛]/g,'').trim();
  }
  function importNumber(value){
    const s=importText(value).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g,'');
    if(!s) return null; const n=Number(s); return Number.isFinite(n)?n:null;
  }
  function importBoolean(value,defaultValue=false){
    const s=importKey(value);
    if(!s) return defaultValue;
    if(['نعم','yes','true','1','ظاهر','مفعل','مفعل'].includes(s)) return true;
    if(['لا','no','false','0','مخفي','غير مفعل'].includes(s)) return false;
    return defaultValue;
  }
  function normalizeImportPath(value){
    const parts=String(value||'').replace(/\\/g,'/').split('/');const out=[];
    for(const part of parts){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part);}return out.join('/');
  }
  function resolveImportPart(baseFile,target){
    const t=String(target||'').replace(/\\/g,'/');if(t.startsWith('/'))return normalizeImportPath(t.slice(1));
    const base=String(baseFile||'').replace(/\\/g,'/').split('/');base.pop();return normalizeImportPath([...base,t].join('/'));
  }
  function importMime(name){
    const ext=String(name||'').split('.').pop().toLowerCase();
    return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',bmp:'image/bmp',avif:'image/avif'})[ext]||'application/octet-stream';
  }
  function xmlLocal(root,name){return root?.getElementsByTagNameNS?.('*',name)?.[0]||null;}
  function xmlRelationships(doc){
    const map=new Map();
    [...(doc?.getElementsByTagNameNS?.('*','Relationship')||[])].forEach(node=>map.set(node.getAttribute('Id'),node.getAttribute('Target')));
    return map;
  }

  async function extractEmbeddedExcelImages(excelBuffer,workbook){
    const result=new Map();
    const addImage=(sheetName,row,col,source)=>{
      if(!sheetName||!source)return;
      let rowMap=result.get(sheetName);if(!rowMap){rowMap=new Map();result.set(sheetName,rowMap);}
      const arr=rowMap.get(row)||[];
      const signature=source.name||source.url||'';
      if(!arr.some(item=>(item.name||item.url||'')===signature))arr.push({...source,col:Number(col)||0});
      arr.sort((a,b)=>(a.col||0)-(b.col||0));rowMap.set(row,arr);
    };
    try{
      const zip=await window.JSZip.loadAsync(excelBuffer);
      const parser=new DOMParser();
      const wbEntry=zip.file('xl/workbook.xml'),relEntry=zip.file('xl/_rels/workbook.xml.rels');
      if(!wbEntry||!relEntry)return result;
      const wbDoc=parser.parseFromString(await wbEntry.async('text'),'application/xml');
      const relDoc=parser.parseFromString(await relEntry.async('text'),'application/xml');
      const wbRels=xmlRelationships(relDoc);const sheetPaths=new Map();
      [...wbDoc.getElementsByTagNameNS('*','sheet')].forEach(sheet=>{
        const name=sheet.getAttribute('name')||'';
        const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
        const target=wbRels.get(rid);if(name&&target)sheetPaths.set(name,resolveImportPart('xl/workbook.xml',target));
      });

      // A) Classic Excel pictures anchored over worksheet cells (drawing*.xml).
      for(const sheetName of workbook.SheetNames||[]){
        const wsPath=sheetPaths.get(sheetName);if(!wsPath)continue;
        const wsEntry=zip.file(wsPath);if(!wsEntry)continue;
        const wsDoc=parser.parseFromString(await wsEntry.async('text'),'application/xml');
        const drawing=xmlLocal(wsDoc,'drawing');
        if(drawing){
          const drawingRid=drawing.getAttribute('r:id')||drawing.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
          const wsParts=wsPath.split('/');const wsFile=wsParts.pop();const wsDir=wsParts.join('/');
          const wsRelsEntry=zip.file(`${wsDir}/_rels/${wsFile}.rels`);
          if(wsRelsEntry){
            const wsRelDoc=parser.parseFromString(await wsRelsEntry.async('text'),'application/xml');const wsRels=xmlRelationships(wsRelDoc);
            const drawingTarget=wsRels.get(drawingRid);
            if(drawingTarget){
              const drawingPath=resolveImportPart(wsPath,drawingTarget);const drawingEntry=zip.file(drawingPath);
              if(drawingEntry){
                const drawParts=drawingPath.split('/');const drawFile=drawParts.pop();const drawDir=drawParts.join('/');
                const drawingRelsEntry=zip.file(`${drawDir}/_rels/${drawFile}.rels`);
                if(drawingRelsEntry){
                  const drawDoc=parser.parseFromString(await drawingEntry.async('text'),'application/xml');
                  const drawRelDoc=parser.parseFromString(await drawingRelsEntry.async('text'),'application/xml');const drawRels=xmlRelationships(drawRelDoc);
                  const anchors=[...drawDoc.getElementsByTagNameNS('*','twoCellAnchor'),...drawDoc.getElementsByTagNameNS('*','oneCellAnchor')];
                  for(const anchor of anchors){
                    const from=xmlLocal(anchor,'from'),rowNode=xmlLocal(from,'row'),colNode=xmlLocal(from,'col'),blip=xmlLocal(anchor,'blip');
                    if(!rowNode||!blip)continue;
                    const row=Number(rowNode.textContent),col=Number(colNode?.textContent||0);
                    const embed=blip.getAttribute('r:embed')||blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed');
                    const mediaTarget=drawRels.get(embed);if(!mediaTarget)continue;
                    const mediaPath=resolveImportPart(drawingPath,mediaTarget),mediaEntry=zip.file(mediaPath);if(!mediaEntry)continue;
                    addImage(sheetName,row,col,{kind:'zipEntry',entry:mediaEntry,name:mediaPath,embedded:true,embeddedType:'drawing'});
                  }
                }
              }
            }
          }
        }
      }

      // B) Microsoft 365 "Place in Cell" pictures. These are stored as Rich Data,
      // not as worksheet drawings. Excel exposes the cell value as #VALUE!, while
      // the actual image lives under xl/media and is linked through metadata.xml.
      const metadataEntry=zip.file('xl/metadata.xml');
      const richValueEntry=zip.file('xl/richData/rdrichvalue.xml');
      const richRelEntry=zip.file('xl/richData/richValueRel.xml');
      const richRelRelsEntry=zip.file('xl/richData/_rels/richValueRel.xml.rels');
      if(metadataEntry&&richValueEntry&&richRelEntry&&richRelRelsEntry){
        const metadataDoc=parser.parseFromString(await metadataEntry.async('text'),'application/xml');
        const richValueDoc=parser.parseFromString(await richValueEntry.async('text'),'application/xml');
        const richRelDoc=parser.parseFromString(await richRelEntry.async('text'),'application/xml');
        const richRelRelsDoc=parser.parseFromString(await richRelRelsEntry.async('text'),'application/xml');

        // cell vm is 1-based into valueMetadata/bk; each bk points to a rich-value index.
        const metadataToRich=[];
        const valueMetadata=[...metadataDoc.getElementsByTagNameNS('*','valueMetadata')][0];
        if(valueMetadata){
          [...valueMetadata.getElementsByTagNameNS('*','bk')].forEach((bk,index)=>{
            const rc=xmlLocal(bk,'rc');metadataToRich[index+1]=Number(rc?.getAttribute('v'));
          });
        }

        // Each rich value's first <v> is the zero-based local-image relation index.
        const richValueToRelIndex=[];
        [...richValueDoc.getElementsByTagNameNS('*','rv')].forEach((rv,index)=>{
          const values=[...rv.getElementsByTagNameNS('*','v')];richValueToRelIndex[index]=Number(values[0]?.textContent);
        });
        const orderedRelIds=[...richRelDoc.getElementsByTagNameNS('*','rel')].map(rel=>rel.getAttribute('r:id')||rel.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
        const richRels=xmlRelationships(richRelRelsDoc);

        const colIndexFromCell=ref=>{
          const letters=String(ref||'').match(/^[A-Z]+/i)?.[0]?.toUpperCase()||'A';let n=0;
          for(const ch of letters)n=n*26+(ch.charCodeAt(0)-64);return Math.max(0,n-1);
        };
        const rowIndexFromCell=ref=>Math.max(0,(Number(String(ref||'').match(/\d+/)?.[0])||1)-1);

        for(const sheetName of workbook.SheetNames||[]){
          const wsPath=sheetPaths.get(sheetName);if(!wsPath)continue;const wsEntry=zip.file(wsPath);if(!wsEntry)continue;
          const wsDoc=parser.parseFromString(await wsEntry.async('text'),'application/xml');
          const cells=[...wsDoc.getElementsByTagNameNS('*','c')];
          for(const cell of cells){
            const vm=Number(cell.getAttribute('vm')||0);if(!vm)continue;
            const richIndex=metadataToRich[vm];if(!Number.isInteger(richIndex)||richIndex<0)continue;
            const relIndex=richValueToRelIndex[richIndex];if(!Number.isInteger(relIndex)||relIndex<0)continue;
            const relId=orderedRelIds[relIndex];const target=richRels.get(relId);if(!target)continue;
            const mediaPath=resolveImportPart('xl/richData/richValueRel.xml',target);const mediaEntry=zip.file(mediaPath);if(!mediaEntry)continue;
            const ref=cell.getAttribute('r')||'';
            addImage(sheetName,rowIndexFromCell(ref),colIndexFromCell(ref),{kind:'zipEntry',entry:mediaEntry,name:mediaPath,embedded:true,embeddedType:'cell'});
          }
        }
      }
    }catch(error){console.warn('[Excel import] embedded image extraction skipped',error);}
    return result;
  }


  const IMPORT_HEADER_ALIASES={
    product_id:['معرف المنتج','product id','product_id'],name:['اسم المنتج','الاسم','product name','name'],model:['الكود','كود المنتج','رقم المنتج','model','code','sku'],caption:['الوصف','description','caption'],
    price:['سعر المفرق','سعر القطاعي','سعر التجزئه','سعر التجزئة','retail price','price'],
    wholesale_price:['سعر الجمله','سعر الجملة','wholesale price'],
    wholesale_min_qty:['الجملة أدنى','كمية الجملة','كميه الجمله','اقل كميه للجمله','أقل كمية للجملة','wholesale qty','wholesale min qty'],
    wholesale_max_qty:['الجملة أعلى','اعلى كميه للجمله','أعلى كمية للجملة','wholesale max qty'],
    bulk_price:['سعر جملة الجملة','سعر جمله الجمله','bulk wholesale price','bulk price'],
    bulk_min_qty:['جملة الجملة أدنى','جمله الجمله ادنى','bulk min qty'],
    bulk_max_qty:['جملة الجملة أعلى','جمله الجمله اعلى','bulk max qty'],
    limited_offer:['عرض محدود','عرض لفتره محدوده','عرض لفترة محدودة','limited offer'],is_visible:['ظاهر','اظهار','إظهار','visible'],sort_order:['الترتيب','sort','sort order']
  };
  const IMPORT_ALIAS_MAP=(()=>{const m=new Map();Object.entries(IMPORT_HEADER_ALIASES).forEach(([key,list])=>list.forEach(v=>m.set(importKey(v),key)));return m;})();
  function canonicalImportHeader(header){
    const raw=importText(header),key=importKey(raw);if(!key)return null;if(IMPORT_ALIAS_MAP.has(key))return IMPORT_ALIAS_MAP.get(key);
    const img=key.match(/^(?:الصوره|صوره|image)\s*([1-4])$/);if(img)return `image${img[1]}`;return null;
  }
  function knownSpecDefinition(label){
    const key=importKey(label);
    const aliases=[
      ['wattage',['القدره','القدرة','wattage','power']],['lumens',['اللومن','لومن','lumens','lumen']],['cct',['حراره اللون','حرارة اللون','cct']],['cri',['cri']],['voltage',['الفولت','الجهد','voltage']],['ip_rating',['درجه الحمايه ip','درجة الحماية ip','ip']],['dimensions',['المقاس','الابعاد','الأبعاد','dimensions','size']],['color',['اللون','color']],['material',['الخامة','الخامه','material']],['beam_angle',['زاويه الاضاءه','زاوية الإضاءة','beam angle']],['frequency',['التردد','frequency']],['warranty',['الضمان','warranty']],['bulb_base',['قاعده اللمبه','قاعدة اللمبة','bulb base']],['bulb_count',['عدد اللمبات','bulb count']]
    ];
    for(const [specKey,list] of aliases){if(list.some(v=>importKey(v)===key))return PRODUCT_SPEC_FIELDS.find(f=>f.key===specKey)||{key:specKey,label};}
    return null;
  }
  function parseImportSpec(header,value,index){
    let label=importText(header).replace(/^\s*(?:مواصفه|مواصفة|spec)\s*[:：-]\s*/i,'').trim();if(!label||importText(value)==='')return null;
    let unit='';const match=label.match(/[\(\[]\s*([^\)\]]+)\s*[\)\]]\s*$/);if(match){unit=match[1].trim();label=label.slice(0,match.index).trim();}
    const def=knownSpecDefinition(label);if(!unit&&def?.unit)unit=def.unit;
    const text=importText(value);if(unit&&new RegExp(`${unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`,'i').test(text))unit='';
    return {key:def?.key||`excel_${index+1}`,label:def?.label||label,value:text,unit};
  }

  function outerZipImageLookup(zip){
    const full=new Map(),base=new Map();if(!zip)return {full,base};
    Object.values(zip.files).forEach(entry=>{if(entry.dir)return;const name=normalizeImportPath(entry.name);if(!/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(name))return;full.set(name.toLowerCase(),entry);const b=name.split('/').pop().toLowerCase();if(!base.has(b))base.set(b,entry);else base.set(b,null);});
    return {full,base};
  }
  function resolveImportImageReference(ref,lookup){
    const value=importText(ref);if(!value)return null;if(/^(https?:|data:|blob:)/i.test(value))return {kind:'url',url:value,name:value};
    const clean=normalizeImportPath(value).toLowerCase();let entry=lookup.full.get(clean);if(!entry)entry=lookup.base.get(clean.split('/').pop());return entry?{kind:'zipEntry',entry,name:entry.name,embedded:false}:null;
  }

  async function parseProductImportFile(file){
    await loadProductImportLibraries();
    const fileName=String(file?.name||'').toLowerCase();let excelBuffer=null,outerZip=null,excelName=file?.name||'';
    if(fileName.endsWith('.zip')){
      outerZip=await window.JSZip.loadAsync(file);const entries=Object.values(outerZip.files).filter(e=>!e.dir&&/\.xlsx?$/i.test(e.name)&&!/(^|\/)~\$/.test(e.name));
      if(!entries.length)throw new Error('لم أجد ملف Excel داخل ZIP');
      const preferred=entries.find(e=>/products?|منتجات|flower/i.test(e.name))||entries[0];excelBuffer=await preferred.async('arraybuffer');excelName=preferred.name;
    }else if(/\.xlsx?$/i.test(fileName)){excelBuffer=await file.arrayBuffer();}
    else throw new Error('اختر ملف Excel (.xlsx) أو ZIP يحتوي Excel والصور');

    const workbook=window.XLSX.read(excelBuffer,{type:'array',cellDates:false});
    const embedded=await extractEmbeddedExcelImages(excelBuffer,workbook);const outerLookup=outerZipImageLookup(outerZip);
    const ignoreSheets=new Set(['تعليمات','instructions','instruction','readme','ملاحظات']);const sections=[];let total=0,resolvedImages=0,missingImages=0;
    for(const sheetName of workbook.SheetNames||[]){
      if(ignoreSheets.has(importKey(sheetName)))continue;const sheet=workbook.Sheets[sheetName];if(!sheet)continue;
      const rows=window.XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});if(!rows.length)continue;
      const headers=Object.keys(rows[0]||{});const headerMap=new Map(headers.map(h=>[h,canonicalImportHeader(h)]));const section={name:importText(sheetName),products:[]};
      rows.forEach((row,rowIndex)=>{
        const nameHeader=headers.find(h=>headerMap.get(h)==='name');const name=importText(nameHeader?row[nameHeader]:'');if(!name)return;
        const get=canonical=>{const h=headers.find(x=>headerMap.get(x)===canonical);return h?row[h]:'';};
        const imageRefs=[];for(let i=1;i<=4;i++){const value=importText(get(`image${i}`));if(value&&!/^#(?:VALUE!|N\/A|REF!|NAME\?|NUM!|DIV\/0!|NULL!|SPILL!|CALC!)/i.test(value))value.split(/[;,\n]+/).map(v=>v.trim()).filter(Boolean).forEach(v=>imageRefs.push(v));}
        const sources=[],unresolved=[];imageRefs.slice(0,4).forEach(ref=>{const src=resolveImportImageReference(ref,outerLookup);if(src){sources.push(src);resolvedImages++;}else{unresolved.push(ref);missingImages++;}});
        if(!sources.length){const excelRow=Number(row.__rowNum__??(rowIndex+1));const embeddedForRow=embedded.get(sheetName)?.get(excelRow)||[];embeddedForRow.slice(0,4).forEach(src=>{sources.push(src);resolvedImages++;});}
        const specs=[];headers.forEach((header,index)=>{if(headerMap.get(header))return;const spec=parseImportSpec(header,row[header],index);if(spec)specs.push(spec);});
        const retailPrice=importNumber(get('price'));
        const wholesalePrice=importNumber(get('wholesale_price'));
        const wholesaleMin=importNumber(get('wholesale_min_qty'));
        const wholesaleMax=importNumber(get('wholesale_max_qty'));
        const bulkPrice=importNumber(get('bulk_price'));
        const bulkMin=importNumber(get('bulk_min_qty'));
        const bulkMax=importNumber(get('bulk_max_qty'));
        const pricingTiers=[];
        if(retailPrice!=null) pricingTiers.push({type:'retail',price:retailPrice,min_qty:null,max_qty:null});
        if(wholesalePrice!=null) pricingTiers.push({type:'wholesale',price:wholesalePrice,min_qty:wholesaleMin==null?null:Math.trunc(wholesaleMin),max_qty:wholesaleMax==null?null:Math.trunc(wholesaleMax)});
        if(bulkPrice!=null) pricingTiers.push({type:'bulk',price:bulkPrice,min_qty:bulkMin==null?null:Math.trunc(bulkMin),max_qty:bulkMax==null?null:Math.trunc(bulkMax)});
        const product={sheetName,rowNumber:Number(row.__rowNum__??(rowIndex+1))+1,product_id:importText(get('product_id')),name,model:importText(get('model')),caption:importText(get('caption')),price:retailPrice,wholesale_price:wholesalePrice,wholesale_min_qty:wholesaleMin,pricing_tiers:pricingTiers,limited_offer:importBoolean(get('limited_offer'),false),is_visible:importBoolean(get('is_visible'),true),sort_order:importNumber(get('sort_order')),specifications:specs.slice(0,30),imageSources:sources.slice(0,4),imageRefs:imageRefs.slice(0,4),unresolvedImages:unresolved};
        section.products.push(product);total++;
      });
      if(section.products.length)sections.push(section);
    }
    if(!sections.length||!total)throw new Error('لم أجد منتجات صالحة. تأكد أن كل ورقة قسم وبها عمود «اسم المنتج».');
    return {fileName:file.name,excelName,sections,total,resolvedImages,missingImages};
  }

  async function importSourceToFile(source){
    if(source.kind==='zipEntry'){const blob=await source.entry.async('blob');return new File([blob],String(source.name||'image').split('/').pop(),{type:importMime(source.name)});}
    if(source.kind==='url'){const response=await fetch(source.url,{mode:'cors'});if(!response.ok)throw new Error(`تعذر تحميل الصورة: ${source.url}`);const blob=await response.blob();return new File([blob],`import-${Date.now()}.${(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg')}`,{type:blob.type||'image/jpeg'});}
    throw new Error('مصدر صورة غير معروف');
  }

  function productImportPreviewHtml(plan){
    const rows=plan.sections.map(section=>`<div class="fl-import-section"><strong>${esc(section.name)}</strong><span>${section.products.length} منتج</span><small>${section.products.reduce((n,p)=>n+p.imageSources.length,0)} صور جاهزة${section.products.some(p=>p.unresolvedImages.length)?' · يوجد صور غير موجودة':''}</small></div>`).join('');
    const warnings=plan.sections.flatMap(s=>s.products.filter(p=>p.unresolvedImages.length).map(p=>`${s.name} / ${p.name}: ${p.unresolvedImages.join('، ')}`)).slice(0,8);
    return `<div class="fl-import-summary"><div><strong>${plan.sections.length}</strong><span>أقسام</span></div><div><strong>${plan.total}</strong><span>منتجات</span></div><div><strong>${plan.resolvedImages}</strong><span>صور جاهزة</span></div><div><strong>${plan.missingImages}</strong><span>صور مفقودة</span></div></div><div class="fl-import-sections">${rows}</div>${warnings.length?`<div class="fl-cloud-note bad"><b>تنبيه صور:</b><br>${warnings.map(esc).join('<br>')}${plan.missingImages>warnings.length?'<br>…':''}</div>`:''}`;
  }


  const EMBEDDED_EXCEL_TEMPLATE_B64='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';
  const EMBEDDED_IMPORT_PACKAGE_B64='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';

  function downloadEmbeddedBase64File(base64Data,mimeType,fileName){
    try{
      const binary=atob(base64Data);const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      const blob=new Blob([bytes],{type:mimeType});const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
    }catch(error){console.warn('[Embedded template download]',error);notify('تعذر تجهيز ملف القالب. حدّث الصفحة وحاول مرة أخرى.');}
  }
  function excelSafeSheetName(value,used){
    const base=(importText(value)||'منتجات').replace(/[\\\/?*\[\]:]/g,' ').replace(/\s+/g,' ').trim().slice(0,31)||'منتجات';
    let name=base,index=2;while(used.has(name.toLowerCase())){const suffix=` ${index++}`;name=(base.slice(0,Math.max(1,31-suffix.length))+suffix).trim();}used.add(name.toLowerCase());return name;
  }
  function excelSpecHeader(spec){
    const label=importText(spec?.label)||'مواصفة';const unit=importText(spec?.unit);return unit?`${label} (${unit})`:label;
  }
  function excelSpecKey(spec){return `${importKey(spec?.label)}|${importKey(spec?.unit)}`;}
  function excelBoolean(value){return value===false?'لا':'نعم';}
  function liveExcelHeaders(specHeaders=[]){
    return ['معرف المنتج','اسم المنتج','الكود','الوصف','سعر المفرق','سعر الجملة','الجملة أدنى','الجملة أعلى','سعر جملة الجملة','جملة الجملة أدنى','جملة الجملة أعلى','عرض محدود','ظاهر','الترتيب','الصورة 1','الصورة 2','الصورة 3','الصورة 4',...specHeaders];
  }
  function excelColumnWidths(specCount){
    return [24,28,18,36,14,14,14,14,16,16,16,14,12,12,36,36,36,36,...Array(specCount).fill(20)].map(w=>({wch:w}));
  }
  async function downloadExcelTemplate(event){
    const button=event?.currentTarget||document.getElementById('flDownloadExcelTemplate');const original=button?.innerHTML;
    if(button){button.disabled=true;button.classList.add('loading');const title=button.querySelector('.fl-product-tool-title');if(title)title.textContent='جاري تجهيز Excel...';}
    try{
      await loadProductImportLibraries();
      const wb=window.XLSX.utils.book_new();const usedNames=new Set();
      const instructions=[
        ['قالب Flower Light — المنتجات الحالية'],
        ['هذا الملف يحتوي كل المنتجات الحالية، ويمكنك تعديل أي بيانات أو إضافة صفوف جديدة ثم استيراده من زر «استيراد Excel».'],
        ['مهم: لا تغيّر «معرف المنتج» للصفوف الحالية. عند إضافة منتج جديد اترك «معرف المنتج» فارغًا.'],
        ['كل ورقة تمثل قسمًا. يمكنك إضافة منتج جديد في نهاية ورقة القسم نفسها.'],
        ['للمنتج الجديد: اكتب رابط الصورة في «الصورة 1» على الأقل، أو استخدم حزمة ZIP إذا أردت صورًا محلية.'],
        ['صور المنتجات الحالية مضافة كرابط تلقائيًا، وعند إعادة استيراد الملف دون تغيير الروابط سيحتفظ الموقع بالصور نفسها دون إعادة رفعها.'],
        ['القيم المقبولة في «ظاهر» و«عرض محدود»: نعم / لا.']
      ];
      const infoWs=window.XLSX.utils.aoa_to_sheet(instructions);infoWs['!cols']=[{wch:110}];
      window.XLSX.utils.book_append_sheet(wb,infoWs,excelSafeSheetName('تعليمات',usedNames));

      const standardOnly=liveExcelHeaders([]);
      for(const category of categories){
        const rows=products.filter(p=>String(p.category_id)===String(category.id)).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
        const specDefs=[];const seenSpecs=new Set();
        rows.forEach(product=>normalizeSpecifications(product.specifications).forEach(spec=>{const key=excelSpecKey(spec);if(!key||seenSpecs.has(key))return;seenSpecs.add(key);specDefs.push({key,header:excelSpecHeader(spec)});}));
        const headers=liveExcelHeaders(specDefs.map(item=>item.header));
        const data=rows.map(product=>{
          const gallery=adminGalleryRows(product).slice(0,4);const images=gallery.map(item=>imageUrl(item.image_path)).filter(Boolean);
          while(images.length<4)images.push('');
          const specs=new Map(normalizeSpecifications(product.specifications).map(spec=>[excelSpecKey(spec),importText(spec.value)]));
          const pricing=productPricingTiers(product.specifications,product);
          const retail=pricing.find(row=>row.type==='retail');
          const wholesale=pricing.find(row=>row.type==='wholesale');
          const bulk=pricing.find(row=>row.type==='bulk');
          return [
            importText(product.id),importText(product.name),importText(product.model),importText(product.caption),
            retail?.price??'',wholesale?.price??'',wholesale?.min_qty??'',wholesale?.max_qty??'',
            bulk?.price??'',bulk?.min_qty??'',bulk?.max_qty??'',
            product.limited_offer===true?'نعم':'لا',excelBoolean(product.is_visible),product.sort_order==null?'':Number(product.sort_order),...images,
            ...specDefs.map(def=>specs.get(def.key)||'')
          ];
        });
        if(!data.length)data.push(Array(headers.length).fill(''));
        const ws=window.XLSX.utils.aoa_to_sheet([headers,...data]);ws['!cols']=excelColumnWidths(specDefs.length);ws['!autofilter']={ref:`A1:${window.XLSX.utils.encode_col(headers.length-1)}${data.length+1}`};
        window.XLSX.utils.book_append_sheet(wb,ws,excelSafeSheetName(category.name,usedNames));
      }
      if(!categories.length){
        const ws=window.XLSX.utils.aoa_to_sheet([standardOnly,Array(standardOnly.length).fill('')]);ws['!cols']=excelColumnWidths(0);window.XLSX.utils.book_append_sheet(wb,ws,excelSafeSheetName('منتجات',usedNames));
      }
      const stamp=new Date().toISOString().slice(0,10);window.XLSX.writeFile(wb,`Flower-Light-Products-${stamp}.xlsx`,{compression:true});
      notify(`تم تجهيز ملف Excel بكل المنتجات الحالية (${products.length} منتج)`);
    }catch(error){console.warn('[Excel export] failed',error);notify('تعذر تجهيز ملف Excel: '+(error?.message||error));}
    finally{if(button){button.disabled=false;button.classList.remove('loading');if(original!=null)button.innerHTML=original;}}
  }
  function downloadImportPackageTemplate(){downloadEmbeddedBase64File(EMBEDDED_IMPORT_PACKAGE_B64,'application/zip','Flower-Light-Import-Package-Template.zip');}

  function openProductExcelImport(){
    currentProductImportPlan=null;
    openModal('استيراد المنتجات من Excel',`<div class="fl-excel-import">
      <div class="fl-cloud-note"><b>طريقتان مدعومتان:</b><br>1) ملف Excel وفيه الصور داخل الخلايا أو ملصوقة داخل صفوف المنتجات.<br>2) ملف ZIP يحتوي Excel + مجلد images، وتكتب أسماء الصور في أعمدة «الصورة 1…4».</div>
      <div class="fl-cloud-field full"><label>اختر Excel أو ZIP</label><input id="flExcelImportFile" type="file" accept=".xlsx,.xls,.zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"></div>
      <div class="fl-cloud-field full"><label>طريقة التعامل مع الأكواد الموجودة</label><select id="flExcelImportMode"><option value="upsert">تحديث المنتج إذا كان الكود موجودًا + إضافة الجديد</option><option value="new_only">إضافة الجديد فقط وتخطي الأكواد الموجودة</option></select></div>
      <div id="flExcelImportPreview" class="fl-import-preview"><div class="fl-cloud-empty">اختر الملف وسيظهر ملخص قبل الاستيراد.</div></div>
      <div id="flExcelImportProgress" class="fl-import-progress" hidden><div><span id="flExcelImportProgressText">جاري الاستيراد…</span><strong id="flExcelImportProgressCount">0/0</strong></div><progress id="flExcelImportProgressBar" max="100" value="0"></progress></div>
      <div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flExcelImportStart" type="button" disabled>استيراد الآن</button><button class="fl-cloud-btn" id="flExcelImportCancel" type="button">إلغاء</button></div>
    </div>`);
    document.getElementById('flExcelImportCancel')?.addEventListener('click',closeModal);
    const input=document.getElementById('flExcelImportFile'),start=document.getElementById('flExcelImportStart'),preview=document.getElementById('flExcelImportPreview');
    input?.addEventListener('change',async()=>{
      const file=input.files?.[0];currentProductImportPlan=null;start.disabled=true;if(!file)return;
      preview.innerHTML='<div class="fl-cloud-empty">جاري قراءة Excel والصور…</div>';
      try{const plan=await parseProductImportFile(file);currentProductImportPlan=plan;preview.innerHTML=productImportPreviewHtml(plan);start.disabled=false;}
      catch(error){preview.innerHTML=`<div class="fl-cloud-note bad">${esc(error?.message||error)}</div>`;}
    });
    start?.addEventListener('click',()=>runProductExcelImport());
  }

  async function ensureImportCategory(name,categoryMap,nextSortRef){
    const key=importKey(name);if(categoryMap.has(key))return categoryMap.get(key);
    const categoryName=importText(name);
    const payload={name:categoryName,description:`منتجات قسم ${categoryName}`,sort_order:nextSortRef.value,is_visible:true,slug:newCategorySlug()};nextSortRef.value+=10;
    const {data,error}=await db.from('categories').insert(payload).select().single();if(error)throw error;categories.push(data);categoryMap.set(key,data);return data;
  }

  async function runProductExcelImport(){
    const plan=currentProductImportPlan;if(!plan)return;const start=document.getElementById('flExcelImportStart'),cancel=document.getElementById('flExcelImportCancel');
    const mode=document.getElementById('flExcelImportMode')?.value||'upsert';const progress=document.getElementById('flExcelImportProgress'),bar=document.getElementById('flExcelImportProgressBar'),text=document.getElementById('flExcelImportProgressText'),count=document.getElementById('flExcelImportProgressCount');
    start.disabled=true;if(cancel)cancel.disabled=true;if(progress)progress.hidden=false;const categoryMap=new Map(categories.map(c=>[importKey(c.name),c]));const nextSortRef={value:(categories.length?Math.max(...categories.map(c=>Number(c.sort_order)||0))+10:0)};
    const idMap=new Map(products.map(p=>[String(p.id),p]));const codeMap=new Map(products.filter(p=>importText(p.model)).map(p=>[importKey(p.model),p]));let created=0,updated=0,skipped=0,failed=0,done=0;const errors=[];
    const total=plan.total;
    for(const section of plan.sections){
      let category;
      try{category=await ensureImportCategory(section.name,categoryMap,nextSortRef);}catch(error){section.products.forEach(p=>errors.push(`${section.name} / ${p.name}: تعذر إنشاء القسم - ${error.message||error}`));failed+=section.products.length;done+=section.products.length;continue;}
      let newSort=nextProductSort(category.id);
      for(const row of section.products){
        done++;if(text)text.textContent=`${section.name} — ${row.name}`;if(count)count.textContent=`${done}/${total}`;if(bar)bar.value=Math.round(done/total*100);
        const existing=(row.product_id?idMap.get(String(row.product_id)):null)||(row.model?codeMap.get(importKey(row.model)):null);if(existing&&mode==='new_only'){skipped++;continue;}
        const uploaded=[];let createdId='';
        try{
          const previousImagePaths=existing?adminGalleryRows(existing).map(x=>x.image_path).filter(Boolean):[];
          const previousImageUrls=previousImagePaths.map(path=>imageUrl(path));
          const exportedUrlsUnchanged=Boolean(existing&&row.imageSources.length&&row.imageSources.length===previousImageUrls.length&&row.imageSources.every((source,index)=>source.kind==='url'&&String(source.url)===String(previousImageUrls[index])));
          let imagePaths=[];
          if(exportedUrlsUnchanged){imagePaths=[...previousImagePaths];}
          else if(row.imageSources.length){
            for(const source of row.imageSources.slice(0,MAX_PRODUCT_IMAGES)){const file=await importSourceToFile(source);const optimized=await fileToOptimizedBlob(file);const path=await uploadBlob(optimized,category.id);uploaded.push(path);imagePaths.push(path);}
          }else if(existing){imagePaths=[...previousImagePaths];}
          if(!imagePaths.length)throw new Error(row.unresolvedImages.length?`الصور غير موجودة: ${row.unresolvedImages.join('، ')}`:'لا توجد صورة للمنتج');
          const importedPricing=Array.isArray(row.pricing_tiers)?row.pricing_tiers:[];
          for(const tier of importedPricing){
            if(tier.min_qty!=null&&tier.min_qty<1)tier.min_qty=null;
            if(tier.max_qty!=null&&tier.max_qty<1)tier.max_qty=null;
            if(tier.min_qty!=null&&tier.max_qty!=null&&tier.max_qty<tier.min_qty)[tier.min_qty,tier.max_qty]=[tier.max_qty,tier.min_qty];
          }
          const importedRetail=importedPricing.find(tier=>tier.type==='retail');
          const importedWholesale=importedPricing.find(tier=>tier.type==='wholesale');
          const preservedMeta=existing?[
            {key:WHATSAPP_META_SHOW_DESCRIPTION,label:'',value:productWhatsAppOption(existing.specifications,WHATSAPP_META_SHOW_DESCRIPTION)?'1':'0',unit:''},
            {key:WHATSAPP_META_SHOW_SPECS,label:'',value:productWhatsAppOption(existing.specifications,WHATSAPP_META_SHOW_SPECS)?'1':'0',unit:''}
          ]:[
            {key:WHATSAPP_META_SHOW_DESCRIPTION,label:'',value:'0',unit:''},
            {key:WHATSAPP_META_SHOW_SPECS,label:'',value:'0',unit:''}
          ];
          const payload={category_id:category.id,name:row.name,model:row.model,caption:row.caption,specifications:[...row.specifications,...preservedMeta,pricingMetaRow(importedPricing)],price:importedRetail?.price??null,wholesale_price:importedWholesale?.price??null,wholesale_min_qty:importedWholesale?.min_qty??null,limited_offer:row.limited_offer,is_visible:row.is_visible,sort_order:row.sort_order!=null?Math.trunc(row.sort_order):(existing?Number(existing.sort_order)||0:newSort)};
          let saved;
          if(existing){const {data,error}=await db.from('products').update(payload).eq('id',existing.id).select().single();if(error)throw error;saved=data;updated++;}
          else{const {data,error}=await db.from('products').insert({...payload,image_path:imagePaths[0]}).select().single();if(error)throw error;saved=data;createdId=saved.id;created++;newSort+=10;}
          if((row.imageSources.length&&!exportedUrlsUnchanged)||!existing){
            const {error}=await db.rpc('set_product_gallery_for_admin',{p_product_id:saved.id,p_image_paths:imagePaths,p_primary_path:imagePaths[0]});if(error)throw error;
            if(existing&&row.imageSources.length&&!exportedUrlsUnchanged){
              const removable=previousImagePaths.filter(path=>isStoragePath(path)&&!imagePaths.includes(path)&&!storagePathUsedByOtherProduct(path,saved.id));
              if(removable.length){try{await db.storage.from(bucket).remove([...new Set(removable)]);}catch(_){}}
            }
          }
          idMap.set(String(saved.id),saved);if(importText(saved.model))codeMap.set(importKey(saved.model),saved);if(!existing)products.push(saved);
        }catch(error){failed++;errors.push(`${section.name} / ${row.name}${row.model?` (${row.model})`:''}: ${error?.message||error}`);if(createdId){try{await db.from('products').delete().eq('id',createdId);}catch(_){}}if(uploaded.length){try{await db.storage.from(bucket).remove(uploaded);}catch(_){}}}
        await new Promise(resolve=>setTimeout(resolve,20));
      }
    }
    try{await loadCatalogAdminData();syncPublicProductsFromAdminCache();}catch(error){console.warn('[Excel import] catalog refresh failed',error);}
    const result=`<div class="fl-import-summary"><div><strong>${created}</strong><span>تمت إضافتها</span></div><div><strong>${updated}</strong><span>تم تحديثها</span></div><div><strong>${skipped}</strong><span>تم تخطيها</span></div><div><strong>${failed}</strong><span>فشل</span></div></div>${errors.length?`<div class="fl-cloud-note bad"><b>تفاصيل الأخطاء:</b><br>${errors.slice(0,15).map(esc).join('<br>')}${errors.length>15?'<br>…':''}</div>`:'<div class="fl-cloud-note good">تم الاستيراد بنجاح.</div>'}<div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flExcelImportDone" type="button">عرض المنتجات</button></div>`;
    modalBody.innerHTML=result;document.getElementById('flExcelImportDone')?.addEventListener('click',()=>{closeModal();renderProducts();});notify(`اكتمل الاستيراد: ${created} جديد، ${updated} تحديث`);
  }

  async function uploadSiteCatalogPdf(file){
    if(!file) throw new Error('اختر ملف PDF');
    const type=String(file.type||'').toLowerCase();
    if(type!=='application/pdf'&&!/\.pdf$/i.test(String(file.name||''))) throw new Error('الملف يجب أن يكون PDF');
    if(Number(file.size||0)>50*1024*1024) throw new Error('حجم ملف الكتالوج يجب ألا يتجاوز 50 MB');
    const path=`catalogs/${crypto.randomUUID()}.pdf`;
    const {error}=await db.storage.from(catalogBucket).upload(path,file,{contentType:'application/pdf',upsert:false,cacheControl:'3600'});
    if(error) throw error;
    return path;
  }

  function nextCatalogSort(){
    if(!siteCatalogs.length) return 0;
    return Math.max(...siteCatalogs.map(row=>Number(row.sort_order)||0))+10;
  }

  function catalogAdminCard(catalog){
    if(!catalog) return '';
    const url=catalog.pdf_path?catalogFileUrl(catalog.pdf_path):'';
    return `<article class="fl-admin-catalog-card">
      <div class="fl-admin-catalog-icon">PDF</div>
      <div class="fl-admin-catalog-body">
        <strong>${esc(catalog.name||'كتالوج')}</strong>
        <small>${esc(catalog.file_name||'بدون ملف')} · ${catalog.is_visible===false?'مخفي':'ظاهر'}</small>
        ${catalog.description?`<p>${esc(catalog.description)}</p>`:''}
        <div class="fl-admin-catalog-actions">${url?`<a class="fl-cloud-mini" href="${esc(url)}" target="_blank" rel="noopener noreferrer">فتح PDF</a>`:''}<button class="fl-cloud-mini" data-catalog-edit="${catalog.id}" type="button">تعديل</button><button class="fl-cloud-mini red" data-catalog-delete="${catalog.id}" type="button">حذف</button></div>
      </div>
    </article>`;
  }

  async function openCatalogForm(catalog=null){
    const currentPath=String(catalog?.pdf_path||'');
    const currentName=String(catalog?.file_name||'');
    const defaultSort=catalog?Number(catalog.sort_order||0):nextCatalogSort();
    openModal(catalog?'تعديل الكتالوج':'إضافة كتالوج',`<form id="flCatalogForm">
      <div class="fl-cloud-form">
        <div class="fl-cloud-field"><label>اسم الكتالوج</label><input id="flCatalogName" required value="${esc(catalog?.name||'')}" placeholder="مثال: كتالوج الثريات 2026"></div>
        <div class="fl-cloud-field"><label>الترتيب</label><input id="flCatalogSort" type="number" min="0" step="1" value="${defaultSort}"></div>
        <div class="fl-cloud-field full"><label>وصف اختياري</label><input id="flCatalogDescription" value="${esc(catalog?.description||'')}" placeholder="مثال: أحدث موديلات الثريات"></div>
        <section class="fl-site-catalog-admin full">
          <div class="fl-site-catalog-admin-head"><span class="fl-pdf-badge">PDF</span><div><strong>${currentPath?'استبدال ملف PDF':'رفع ملف PDF'}</strong><small>يظهر هذا الكتالوج كخيار مستقل بجانب أقسام المنتجات، وعند فتحه تُعرض كل صفحات PDF.</small></div></div>
          ${currentPath?`<div class="fl-site-catalog-current"><div><strong>${esc(currentName||'catalog.pdf')}</strong><small>الملف الحالي</small></div><a class="fl-cloud-btn" href="${esc(catalogFileUrl(currentPath))}" target="_blank" rel="noopener noreferrer">فتح الحالي</a></div>`:''}
          <label class="fl-site-catalog-drop" for="flCatalogPdf"><strong>${currentPath?'اختر PDF جديدًا للاستبدال':'اختر ملف PDF'}</strong><small>PDF فقط — حتى 50 MB</small></label>
          <input id="flCatalogPdf" type="file" accept="application/pdf,.pdf" hidden ${currentPath?'':'required'}>
          <div id="flCatalogFileName" class="fl-product-pdf-name"></div>
        </section>
        <label class="fl-cloud-check full"><input id="flCatalogVisible" type="checkbox" ${catalog?.is_visible===false?'':'checked'}> إظهار الكتالوج للزوار</label>
      </div>
      <div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flCatalogSave" type="submit">حفظ</button><button class="fl-cloud-btn" id="flCatalogCancel" type="button">إلغاء</button></div>
    </form>`);
    const input=document.getElementById('flCatalogPdf');
    const fileName=document.getElementById('flCatalogFileName');
    input?.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file){if(fileName)fileName.textContent='';return;}
      const isPdf=String(file.type||'').toLowerCase()==='application/pdf'||/\.pdf$/i.test(String(file.name||''));
      if(!isPdf){notify('اختر ملف PDF فقط');input.value='';return;}
      if(Number(file.size||0)>50*1024*1024){notify('حجم الملف يجب ألا يتجاوز 50 MB');input.value='';return;}
      if(fileName)fileName.textContent=`تم اختيار: ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)`;
    });
    document.getElementById('flCatalogCancel')?.addEventListener('click',closeModal);
    document.getElementById('flCatalogForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const save=document.getElementById('flCatalogSave');
      const name=String(document.getElementById('flCatalogName')?.value||'').trim();
      const description=String(document.getElementById('flCatalogDescription')?.value||'').trim();
      const file=input?.files?.[0]||null;
      if(!name){notify('اكتب اسم الكتالوج');return;}
      if(!catalog&&!file){notify('اختر ملف PDF للكتالوج');return;}
      save.disabled=true;save.textContent='جاري حفظ الكتالوج...';
      let uploadedPath='';
      try{
        let pdfPath=currentPath;
        let nextFileName=currentName;
        if(file){uploadedPath=await uploadSiteCatalogPdf(file);pdfPath=uploadedPath;nextFileName=file.name||'catalog.pdf';}
        const payload={
          name,
          description,
          pdf_path:pdfPath,
          file_name:nextFileName,
          sort_order:Number(document.getElementById('flCatalogSort')?.value)||0,
          is_visible:document.getElementById('flCatalogVisible')?.checked===true,
          updated_at:new Date().toISOString()
        };
        let saved;
        if(catalog){
          const {data,error}=await db.from('site_catalogs').update(payload).eq('id',catalog.id).select().single();
          if(error) throw error;saved=data;
        }else{
          const {data,error}=await db.from('site_catalogs').insert(payload).select().single();
          if(error) throw error;saved=data;
        }
        if(currentPath&&uploadedPath&&currentPath!==uploadedPath){try{await db.storage.from(catalogBucket).remove([currentPath]);}catch(_){}}
        closeModal();
        if(catalog)siteCatalogs=siteCatalogs.map(row=>String(row.id)===String(saved.id)?saved:row);else siteCatalogs.push(saved);
        siteCatalogs.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')));
        selectedProductNode=`catalog:${saved.id}`;normalizeCatalogSelections();syncPublicCatalogFromAdminCache();
        if(view==='sections') renderSections(); else renderProducts();
        notify('تم حفظ الكتالوج وسيظهر حسب ترتيبه مع الأقسام');
      }catch(error){
        if(uploadedPath){try{await db.storage.from(catalogBucket).remove([uploadedPath]);}catch(_){}}
        notify('تعذر حفظ الكتالوج: '+(error?.message||error));save.disabled=false;save.textContent='حفظ';
      }
    });
  }

  async function deleteCatalog(id){
    const catalog=siteCatalogs.find(row=>String(row.id)===String(id));
    if(!catalog||!confirm(`حذف الكتالوج «${catalog.name||'الكتالوج'}»؟`)) return;
    const path=String(catalog.pdf_path||'');
    const {error}=await db.from('site_catalogs').delete().eq('id',catalog.id);
    if(error){notify('تعذر حذف الكتالوج: '+error.message);return;}
    if(path){try{await db.storage.from(catalogBucket).remove([path]);}catch(_){}}
    siteCatalogs=siteCatalogs.filter(row=>String(row.id)!==String(catalog.id));normalizeCatalogSelections();syncPublicCatalogFromAdminCache();if(view==='sections') renderSections(); else renderProducts();notify('تم حذف الكتالوج');
  }

  function renderProducts(){
    const selector=[
      ...categories.map(c=>({type:'category',row:c,sort_order:Number(c.sort_order)||0,created_at:c.created_at||''})),
      ...siteCatalogs.map(c=>({type:'catalog',row:c,sort_order:Number(c.sort_order)||0,created_at:c.created_at||''}))
    ].sort((a,b)=>a.sort_order-b.sort_order || String(a.created_at).localeCompare(String(b.created_at))).map(item=>{
      const c=item.row;
      return item.type==='catalog'
        ? `<option value="catalog:${c.id}" ${selectedProductNode===`catalog:${c.id}`?'selected':''}>📕 ${esc(c.name||'كتالوج')}</option>`
        : `<option value="category:${c.id}" ${selectedProductNode===`category:${c.id}`?'selected':''}>${esc(c.name)}</option>`;
    }).join('');
    const isCatalog=selectedProductNode.startsWith('catalog:');
    const selectedCatalogId=isCatalog?selectedProductNode.slice(8):'';
    const selectedCatalog=siteCatalogs.find(c=>String(c.id)===String(selectedCatalogId));
    if(!isCatalog&&selectedProductNode.startsWith('category:')) selectedCategory=selectedProductNode.slice(9);

    const list=isCatalog?[]:categoryProductsInOrder(selectedCategory);
    const cards=list.map((p,index)=>{
      const specCount=normalizeSpecifications(p.specifications).length;
      const gallery=adminGalleryRows(p);
      const imagePath=gallery[0]?.image_path||p.image_path||p.image_url||'';
      const pricingSummary=productPricingTiers(p.specifications,p).map(tier=>{
        const label=PRICE_TIER_TYPE_MAP.get(tier.type)?.label||'سعر';
        const price=`${Number(tier.price).toLocaleString('en-US',{maximumFractionDigits:2})} ر.س`;
        const range=tier.min_qty!=null&&tier.max_qty!=null?` ${tier.min_qty}-${tier.max_qty}`:tier.min_qty!=null?` من ${tier.min_qty}+`:tier.max_qty!=null?` حتى ${tier.max_qty}`:'';
        return `${label} ${price}${range}`;
      }).join(' · ');
      return `<article class="fl-cloud-product" data-product-id="${p.id}">
        <button class="fl-product-drag-handle" type="button" aria-label="اسحب لتغيير ترتيب ${esc(p.name||'المنتج')}" title="اسحب لتغيير الترتيب"><span>⋮⋮</span><small>${index+1}</small></button>
        <div class="fl-cloud-product-image-wrap"><img src="${esc(imageUrl(imagePath))}" alt="${esc(p.name||'منتج')}" loading="lazy"><span class="fl-admin-gallery-count">${gallery.length} / ${MAX_PRODUCT_IMAGES} صور</span></div>
        <div class="fl-cloud-product-body"><strong>${esc(p.name||'منتج بدون اسم')}</strong><small>${esc(p.model?`الكود ${p.model}`:'بدون كود')} · ${p.is_visible===false?'مخفي':'ظاهر'}${specCount?` · ${specCount} معلومات`:''}${pricingSummary?` · ${esc(pricingSummary)}`:''}${p.limited_offer===true?' · عرض محدود':''}</small>
        <div class="fl-cloud-product-actions"><button class="fl-cloud-mini" data-prod-edit="${p.id}" type="button">تعديل</button><button class="fl-cloud-mini" data-prod-copy="${p.id}" type="button">نسخ</button><button class="fl-cloud-mini red" data-prod-delete="${p.id}" type="button">حذف</button></div></div></article>`;
    }).join('');

    const content=isCatalog
      ? (selectedCatalog?`<div class="fl-admin-catalog-list">${catalogAdminCard(selectedCatalog)}</div>`:`<div class="fl-cloud-empty">اختر كتالوجًا أو أضف كتالوجًا جديدًا.</div>`)
      : (cards?`<div class="fl-cloud-products">${cards}</div>`:`<div class="fl-cloud-empty">لا توجد منتجات في هذا القسم بعد.</div>`);

    const productTools=`<div class="fl-product-tools" aria-label="أدوات المنتجات والكتالوجات">
      <button class="fl-product-tool excel" id="flDownloadExcelTemplate" type="button"><span class="fl-product-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"></path><path d="M15 3v5h5"></path><path d="m8 12 5 5m0-5-5 5"></path></svg></span><span class="fl-product-tool-copy"><strong class="fl-product-tool-title">قالب Excel</strong><small>كل المنتجات الحالية جاهزة للتعديل</small></span></button>
      <button class="fl-product-tool import" id="flImportProductsExcel" type="button"><span class="fl-product-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12"></path><path d="m8 11 4 4 4-4"></path><path d="M5 19h14"></path></svg></span><span class="fl-product-tool-copy"><strong>استيراد Excel</strong><small>تحديث أو إضافة منتجات دفعة واحدة</small></span></button>
      <button class="fl-product-tool catalog" id="flAddCatalog" type="button"><span class="fl-product-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"></path><path d="M15 3v5h5"></path><path d="M8 13h8M8 17h6"></path></svg></span><span class="fl-product-tool-copy"><strong>كتالوج PDF</strong><small>إضافة كتالوج مستقل جديد</small></span></button>
      <button class="fl-product-tool product" id="flAddProduct" type="button" ${categories.length?'':'disabled'}><span class="fl-product-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></span><span class="fl-product-tool-copy"><strong>منتج جديد</strong><small>إضافة منتج يدويًا داخل قسم</small></span></button>
    </div>`;
    layout(`<div class="fl-cloud-head"><div><h2>المنتجات والكتالوجات</h2><p>الأقسام والكتالوجات موجودة معًا هنا. يمكنك إضافة أكثر من كتالوج PDF، وكل كتالوج يظهر للزوار كخيار مستقل بجانب ثريات وجداريات وبلفون وغيرها.</p></div></div><div class="fl-cloud-card"><div class="fl-products-toolbar"><div class="fl-cloud-field"><label>القسم / الكتالوج</label><select id="flCategorySelect">${selector}</select></div><div class="fl-product-order-status" id="flProductOrderStatus">${isCatalog?'هذا كتالوج PDF مستقل':'اسحب المنتجات لترتيبها تلقائيًا'}</div></div>${content}</div>`,productTools);
    const sel=document.getElementById('flCategorySelect');
    if(sel) sel.addEventListener('change',e=>{
      selectedProductNode=e.target.value;
      if(selectedProductNode.startsWith('category:')) selectedCategory=selectedProductNode.slice(9);
      renderProducts();
    });
    document.getElementById('flDownloadExcelTemplate')?.addEventListener('click',downloadExcelTemplate);
    document.getElementById('flAddCatalog')?.addEventListener('click',()=>openCatalogForm());
    document.getElementById('flImportProductsExcel')?.addEventListener('click',openProductExcelImport);
    document.getElementById('flAddProduct')?.addEventListener('click',()=>openProductForm());
    body.querySelectorAll('[data-prod-edit]').forEach(b=>b.addEventListener('click',()=>openProductForm(products.find(p=>p.id===b.dataset.prodEdit))));
    body.querySelectorAll('[data-prod-copy]').forEach(b=>b.addEventListener('click',()=>duplicateProduct(b.dataset.prodCopy)));
    body.querySelectorAll('[data-prod-delete]').forEach(b=>b.addEventListener('click',()=>deleteProduct(b.dataset.prodDelete)));
    body.querySelectorAll('[data-catalog-edit]').forEach(b=>b.addEventListener('click',()=>openCatalogForm(siteCatalogs.find(c=>String(c.id)===String(b.dataset.catalogEdit)))));
    body.querySelectorAll('[data-catalog-delete]').forEach(b=>b.addEventListener('click',()=>deleteCatalog(b.dataset.catalogDelete)));
    if(!isCatalog) bindProductDragReorder();
  }

  async function openCategoryForm(cat=null){
    openModal(cat?'تعديل القسم':'إضافة قسم',`<form id="flCategoryForm"><div class="fl-cloud-form"><div class="fl-cloud-field"><label>اسم القسم</label><input id="flCatName" required value="${esc(cat?.name||'')}" placeholder="مثال: جداريات"></div><div class="fl-cloud-field"><label>الترتيب</label><input id="flCatSort" type="number" min="0" step="1" value="${Number(cat?.sort_order||0)}"></div><div class="fl-cloud-field full"><label>الوصف</label><input id="flCatDesc" value="${esc(cat?.description||'')}" placeholder="وصف قصير اختياري"></div><label class="fl-cloud-check full"><input id="flCatVisible" type="checkbox" ${cat?.is_visible===false?'':'checked'}> إظهار القسم للزوار</label></div><div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flCatSave" type="submit">حفظ</button><button class="fl-cloud-btn" id="flCatCancel" type="button">إلغاء</button></div></form>`);
    document.getElementById('flCatCancel').addEventListener('click',closeModal);
    document.getElementById('flCategoryForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const save=document.getElementById('flCatSave');
      const name=document.getElementById('flCatName').value.trim();
      if(!name){notify('اكتب اسم القسم');return;}
      const duplicate=categories.some(c=>c.id!==cat?.id && String(c.name||'').trim().toLowerCase()===name.toLowerCase());
      if(duplicate){notify('يوجد قسم بهذا الاسم مسبقًا');return;}
      save.disabled=true;save.textContent='جاري الحفظ...';
      const payload={name,description:document.getElementById('flCatDesc').value.trim(),sort_order:Number(document.getElementById('flCatSort').value)||0,is_visible:document.getElementById('flCatVisible').checked};
      if(!cat) payload.slug=newCategorySlug();
      const res=cat?await db.from('categories').update(payload).eq('id',cat.id).select().single():await db.from('categories').insert(payload).select().single();
      if(res.error){
        const message=String(res.error.code)==='23505'?'تعذر الحفظ بسبب تعارض داخلي. أعد المحاولة.':res.error.message;
        notify('خطأ: '+message);save.disabled=false;save.textContent='حفظ';return;
      }
      const saved=res.data;
      if(cat)categories=categories.map(row=>row.id===saved.id?saved:row);else categories.push(saved);
      categories.sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.created_at||'').localeCompare(String(b.created_at||'')));
      normalizeCatalogSelections();closeModal();syncPublicProductsFromAdminCache();renderApp();notify('تم حفظ القسم');
    });
  }

  async function deleteCategory(id){
    const cat=categories.find(c=>c.id===id);
    if(!cat||!confirm(`حذف قسم «${cat.name}» وكل منتجاته وصورها؟`))return;
    const productIds=new Set(products.filter(p=>p.category_id===id).map(p=>p.id));
    const candidatePaths=new Set();
    products.filter(p=>productIds.has(p.id)).forEach(p=>{if(isStoragePath(p.image_path))candidatePaths.add(p.image_path);if(isStoragePath(p.catalog_pdf_path))candidatePaths.add(p.catalog_pdf_path);});
    productImages.filter(row=>productIds.has(row.product_id)).forEach(row=>{if(isStoragePath(row.image_path))candidatePaths.add(row.image_path);});
    const paths=[...candidatePaths].filter(path=>{
      const usedByOtherProduct=products.some(p=>!productIds.has(p.id) && (p.image_path===path || p.catalog_pdf_path===path)) || productImages.some(row=>!productIds.has(row.product_id) && row.image_path===path);
      return !usedByOtherProduct;
    });
    const {error}=await db.from('categories').delete().eq('id',id);
    if(error){notify('تعذر الحذف: '+error.message);return;}
    if(paths.length) await db.storage.from(bucket).remove(paths);
    categories=categories.filter(row=>row.id!==id);products=products.filter(row=>row.category_id!==id);productImages=productImages.filter(row=>!productIds.has(row.product_id));
    normalizeCatalogSelections();syncPublicProductsFromAdminCache();renderApp();notify('تم حذف القسم ومنتجاته');
  }

  async function fileToOptimizedBlob(file){
    if(!file) return null;
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>resolve(r.result);r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onerror=reject;i.onload=()=>resolve(i);i.src=dataUrl;});
    const max=1400, scale=Math.min(1,max/Math.max(img.width,img.height)); const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)); const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
    return await new Promise(resolve=>canvas.toBlob(blob=>resolve(blob||file),'image/webp',.82));
  }
  async function uploadBlob(blob,categoryId){ const ext=(blob.type||'image/webp').includes('png')?'png':(blob.type||'').includes('jpeg')?'jpg':'webp'; const path=`${categoryId}/${crypto.randomUUID()}.${ext}`; const {error}=await db.storage.from(bucket).upload(path,blob,{contentType:blob.type||'image/webp',upsert:false,cacheControl:'31536000'}); if(error)throw error; return path; }
  async function uploadProductCatalogPdf(file,categoryId){
    if(!file) return '';
    const isPdf=String(file.type||'').toLowerCase()==='application/pdf' || /\.pdf$/i.test(String(file.name||''));
    if(!isPdf) throw new Error('اختر ملف PDF فقط');
    const maxBytes=30*1024*1024;
    if(Number(file.size||0)>maxBytes) throw new Error('حجم ملف PDF يجب ألا يتجاوز 30 MB');
    const path=`${categoryId}/catalog-pdf/${crypto.randomUUID()}.pdf`;
    const {error}=await db.storage.from(bucket).upload(path,file,{contentType:'application/pdf',upsert:false,cacheControl:'31536000'});
    if(error) throw error;
    return path;
  }

  function storagePathUsedByOtherProduct(path,productId){
    if(!path) return false;
    return products.some(p=>p.id!==productId && (p.image_path===path || p.catalog_pdf_path===path))
      || productImages.some(row=>row.product_id!==productId && row.image_path===path);
  }

  function openProductForm(prod=null){
    if(!categories.length){notify('أضف قسمًا أولًا');return;}
    const cid=prod?.category_id||selectedCategory||categories[0].id;
    const options=categories.map(c=>`<option value="${c.id}" ${c.id===cid?'selected':''}>${esc(c.name)}</option>`).join('');
    const originalRows=prod ? adminGalleryRows(prod) : [];
    let galleryEntries=originalRows.map((row,index)=>({
      token:`existing-${row.id||index}-${crypto.randomUUID?.()||index}`,
      path:row.image_path,
      preview:imageUrl(row.image_path),
      file:null,
      objectUrl:'',
      original:true
    }));
    const defaultSort=prod ? Number(prod.sort_order||0) : nextProductSort(cid);

    openModal(prod?'تعديل المنتج':'إضافة منتج',`<form id="flProductForm"><div class="fl-cloud-form">
      <div class="fl-cloud-field"><label>القسم</label><select id="flProdCat">${options}</select></div>
      <div class="fl-cloud-field"><label>الترتيب</label><input id="flProdSort" type="number" min="0" step="1" value="${defaultSort}"><small class="fl-field-help">يمكنك أيضًا تغييره لاحقًا بالسحب.</small></div>
      <div class="fl-cloud-field"><label>اسم المنتج</label><input id="flProdName" required value="${esc(prod?.name||'')}" placeholder="مثال: جدارية LED"></div>
      <div class="fl-cloud-field"><label>رقم المنتج / الكود</label><input id="flProdModel" value="${esc(prod?.model||'')}" placeholder="مثال: 1010 أو WL-205"></div>
      <div class="fl-cloud-field full"><div class="fl-field-label-inline"><label for="flProdCaption">الوصف</label><label class="fl-whatsapp-include-toggle"><input id="flProdWhatsAppShowDescription" type="checkbox" ${productWhatsAppOption(prod?.specifications,WHATSAPP_META_SHOW_DESCRIPTION)?'checked':''}><span>إظهار في رسالة واتساب</span></label></div><textarea id="flProdCaption" placeholder="وصف مختصر">${esc(prod?.caption||'')}</textarea></div>
      ${productPricingEditorHtml(prod)}
      ${productSpecsFormHtml(prod)}
      <section class="fl-product-gallery-editor full">
        <div class="fl-product-gallery-head"><div><strong>صور المنتج</strong><small>حتى 4 صور فقط. الصورة الأولى هي الأساسية وتظهر في بطاقة المنتج وPDF.</small></div><span id="flProdGalleryCount">0 / ${MAX_PRODUCT_IMAGES}</span></div>
        <div id="flProductGalleryGrid" class="fl-product-gallery-grid"></div>
        <label class="fl-product-gallery-add" for="flProdImages"><strong>+ إضافة صور</strong><small>يمكن اختيار عدة صور دفعة واحدة، والحد الإجمالي 4.</small></label>
        <input id="flProdImages" class="fl-product-gallery-input" type="file" accept="image/*" multiple>
      </section>
      <label class="fl-cloud-check full"><input id="flProdVisible" type="checkbox" ${prod?.is_visible===false?'':'checked'}> إظهار المنتج للزوار</label>
    </div><div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flProdSave" type="submit">حفظ</button><button class="fl-cloud-btn" id="flProdCancel" type="button">إلغاء</button></div></form>`);

    const flexibleSpecs=document.getElementById('flFlexibleSpecs');
    const addProductSpec=document.getElementById('flAddProductSpec');
    const refreshSpecRemoveButtons=()=>{
      if(!flexibleSpecs) return;
      const rows=[...flexibleSpecs.querySelectorAll('[data-flex-spec-row]')];
      rows.forEach(row=>{
        const button=row.querySelector('[data-flex-spec-remove]');
        if(button) button.hidden=rows.length<=1;
      });
    };
    addProductSpec?.addEventListener('click',()=>{
      if(!flexibleSpecs) return;
      const count=flexibleSpecs.querySelectorAll('[data-flex-spec-row]').length;
      if(count>=30){notify('الحد الأقصى 30 صفة للمنتج');return;}
      flexibleSpecs.insertAdjacentHTML('beforeend',productSpecEditorRowHtml(null));
      refreshSpecRemoveButtons();
      flexibleSpecs.lastElementChild?.querySelector('[data-flex-spec-label]')?.focus();
    });
    flexibleSpecs?.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-flex-spec-remove]');
      if(!button) return;
      button.closest('[data-flex-spec-row]')?.remove();
      if(!flexibleSpecs.querySelector('[data-flex-spec-row]')) flexibleSpecs.insertAdjacentHTML('beforeend',productSpecEditorRowHtml(null));
      refreshSpecRemoveButtons();
    });
    refreshSpecRemoveButtons();

    const priceTierList=document.getElementById('flPriceTierList');
    const addPriceTier=document.getElementById('flAddPriceTier');
    const refreshPriceTiers=()=>priceTierList?.querySelectorAll('[data-price-tier-row]').forEach(syncPriceTierRow);
    addPriceTier?.addEventListener('click',()=>{
      if(!priceTierList) return;
      const count=priceTierList.querySelectorAll('[data-price-tier-row]').length;
      if(count>=12){notify('الحد الأقصى 12 خانة سعر للمنتج');return;}
      priceTierList.insertAdjacentHTML('beforeend',pricingTierEditorRowHtml({type:count===0?'retail':count===1?'wholesale':'bulk',price:null,min_qty:null,max_qty:null}));
      const row=priceTierList.lastElementChild;
      syncPriceTierRow(row);
      row?.querySelector('[data-price-tier-price]')?.focus();
    });
    priceTierList?.addEventListener('change',event=>{
      if(event.target.matches?.('[data-price-tier-type]')) syncPriceTierRow(event.target.closest('[data-price-tier-row]'));
    });
    priceTierList?.addEventListener('click',event=>{
      const button=event.target.closest?.('[data-price-tier-remove]');
      if(!button) return;
      button.closest('[data-price-tier-row]')?.remove();
      if(!priceTierList.querySelector('[data-price-tier-row]')){
        priceTierList.insertAdjacentHTML('beforeend',pricingTierEditorRowHtml({type:'retail',price:null,min_qty:null,max_qty:null}));
      }
      refreshPriceTiers();
    });
    refreshPriceTiers();

    const galleryGrid=document.getElementById('flProductGalleryGrid');
    const galleryCount=document.getElementById('flProdGalleryCount');
    const imageInput=document.getElementById('flProdImages');
    const addLabel=document.querySelector('label[for="flProdImages"]');
    const cleanupPreviewUrls=()=>galleryEntries.forEach(entry=>{if(entry.objectUrl){try{URL.revokeObjectURL(entry.objectUrl);}catch(_){}}});

    function renderGalleryEditor(){
      if(!galleryGrid) return;
      galleryGrid.innerHTML=galleryEntries.map((entry,index)=>`<article class="fl-product-gallery-item ${index===0?'is-primary':''}" data-gallery-token="${esc(entry.token)}">
        <div class="fl-product-gallery-thumb"><img src="${esc(entry.preview)}" alt="صورة المنتج ${index+1}"><span>${index===0?'أساسية':`صورة ${index+1}`}</span></div>
        <div class="fl-product-gallery-controls">
          ${index===0?'':`<button type="button" class="fl-gallery-primary-btn" data-gallery-primary="${esc(entry.token)}">اجعلها الأساسية</button>`}
          <div class="fl-gallery-order-buttons">
            <button type="button" data-gallery-move="up" data-gallery-token="${esc(entry.token)}" ${index<=1?'disabled':''} aria-label="تقديم الصورة">↑</button>
            <button type="button" data-gallery-move="down" data-gallery-token="${esc(entry.token)}" ${index===0||index>=galleryEntries.length-1?'disabled':''} aria-label="تأخير الصورة">↓</button>
            <button type="button" class="red" data-gallery-remove="${esc(entry.token)}">حذف</button>
          </div>
        </div>
      </article>`).join('');
      if(!galleryEntries.length) galleryGrid.innerHTML='<div class="fl-product-gallery-empty">أضف من صورة واحدة إلى 4 صور. أول صورة ستكون الأساسية.</div>';
      if(galleryCount) galleryCount.textContent=`${galleryEntries.length} / ${MAX_PRODUCT_IMAGES}`;
      const full=galleryEntries.length>=MAX_PRODUCT_IMAGES;
      if(imageInput) imageInput.disabled=full;
      if(addLabel) addLabel.classList.toggle('disabled',full);

      galleryGrid.querySelectorAll('[data-gallery-primary]').forEach(button=>button.addEventListener('click',()=>{
        const index=galleryEntries.findIndex(entry=>entry.token===button.dataset.galleryPrimary);
        if(index<=0) return;
        const [entry]=galleryEntries.splice(index,1);galleryEntries.unshift(entry);renderGalleryEditor();
      }));
      galleryGrid.querySelectorAll('[data-gallery-remove]').forEach(button=>button.addEventListener('click',()=>{
        const index=galleryEntries.findIndex(entry=>entry.token===button.dataset.galleryRemove);
        if(index<0) return;
        const [removed]=galleryEntries.splice(index,1);
        if(removed?.objectUrl){try{URL.revokeObjectURL(removed.objectUrl);}catch(_){}}
        renderGalleryEditor();
      }));
      galleryGrid.querySelectorAll('[data-gallery-move]').forEach(button=>button.addEventListener('click',()=>{
        const token=button.dataset.galleryToken;
        const index=galleryEntries.findIndex(entry=>entry.token===token);
        if(index<=0) return;
        const nextIndex=button.dataset.galleryMove==='up' ? Math.max(1,index-1) : Math.min(galleryEntries.length-1,index+1);
        if(nextIndex===index) return;
        const [entry]=galleryEntries.splice(index,1);galleryEntries.splice(nextIndex,0,entry);renderGalleryEditor();
      }));
    }

    imageInput?.addEventListener('change',()=>{
      const files=[...(imageInput.files||[])].filter(file=>String(file.type||'').startsWith('image/'));
      const remaining=Math.max(0,MAX_PRODUCT_IMAGES-galleryEntries.length);
      if(!remaining){notify('الحد الأقصى 4 صور للمنتج');imageInput.value='';return;}
      if(files.length>remaining) notify(`تم اختيار أول ${remaining} صورة فقط لأن الحد الأقصى ${MAX_PRODUCT_IMAGES}`);
      files.slice(0,remaining).forEach(file=>{
        const objectUrl=URL.createObjectURL(file);
        galleryEntries.push({token:`new-${crypto.randomUUID?.()||Date.now()+Math.random()}`,path:'',preview:objectUrl,file,objectUrl,original:false});
      });
      imageInput.value='';
      renderGalleryEditor();
    });

    document.getElementById('flProdCat')?.addEventListener('change',event=>{
      if(!prod) document.getElementById('flProdSort').value=String(nextProductSort(event.target.value));
    });

    renderGalleryEditor();

    document.getElementById('flProdCancel').addEventListener('click',()=>{cleanupPreviewUrls();closeModal();});
    document.getElementById('flProductForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const save=document.getElementById('flProdSave');
      const name=document.getElementById('flProdName').value.trim();
      if(!name){notify('اكتب اسم المنتج');return;}
      if(!galleryEntries.length){notify('أضف صورة واحدة على الأقل للمنتج');return;}
      if(galleryEntries.length>MAX_PRODUCT_IMAGES){notify('الحد الأقصى 4 صور');return;}
      save.disabled=true;save.textContent='جاري حفظ المنتج والصور...';
      const uploadedPaths=[];
      let createdProductId='';
      let saveCommitted=false;
      try{
        const category_id=document.getElementById('flProdCat').value;
        const finalEntries=[];
        for(const entry of galleryEntries){
          if(entry.file){
            const blob=await fileToOptimizedBlob(entry.file);
            const path=await uploadBlob(blob,category_id);
            uploadedPaths.push(path);
            finalEntries.push({...entry,path});
          }else if(entry.path){
            finalEntries.push(entry);
          }
        }
        const imagePaths=finalEntries.map(entry=>entry.path).filter(Boolean);
        if(!imagePaths.length) throw new Error('أضف صورة واحدة على الأقل');
        if(imagePaths.length>MAX_PRODUCT_IMAGES) throw new Error('الحد الأقصى 4 صور');
        const primaryPath=imagePaths[0];
        const pricingTiers=collectProductPricingTiers();
        const firstRetail=pricingTiers.find(row=>row.type==='retail');
        const firstWholesale=pricingTiers.find(row=>row.type==='wholesale');
        const payload={
          category_id,
          name,
          model:document.getElementById('flProdModel').value.trim(),
          caption:document.getElementById('flProdCaption').value.trim(),
          specifications:collectProductSpecifications(pricingTiers),
          price:firstRetail?.price??null,
          wholesale_price:firstWholesale?.price??null,
          wholesale_min_qty:firstWholesale?.min_qty??null,
          limited_offer:document.getElementById('flProdLimitedOffer')?.checked===true,
          sort_order:Number(document.getElementById('flProdSort').value)||0,
          is_visible:document.getElementById('flProdVisible').checked
        };
        let savedProduct;
        if(prod){
          const {data,error}=await db.from('products').update(payload).eq('id',prod.id).select().single();
          if(error) throw error;savedProduct=data;
        }else{
          const {data,error}=await db.from('products').insert({...payload,image_path:primaryPath}).select().single();
          if(error) throw error;savedProduct=data;createdProductId=data.id;
        }

        const {error:galleryError}=await db.rpc('set_product_gallery_for_admin',{
          p_product_id:savedProduct.id,
          p_image_paths:imagePaths,
          p_primary_path:primaryPath
        });
        if(galleryError) throw new Error((String(galleryError.code)==='PGRST202'||String(galleryError.code)==='42883') ? 'شغّل ملف FINAL_SQL_STAGE84.sql في Supabase أولًا.' : (galleryError.message||galleryError));
        // From this point the database save is committed; a later UI refresh failure must not roll it back.
        saveCommitted=true;
        createdProductId='';

        const removedPaths=originalRows.map(row=>row.image_path).filter(path=>path && !imagePaths.includes(path) && isStoragePath(path));
        const safeToDelete=removedPaths.filter(path=>!storagePathUsedByOtherProduct(path,savedProduct.id));
        if(safeToDelete.length) await db.storage.from(bucket).remove([...new Set(safeToDelete)]);

        savedProduct={...savedProduct,...payload,image_path:primaryPath};
        if(prod)products=products.map(row=>row.id===savedProduct.id?savedProduct:row);else products.push(savedProduct);
        productImages=productImages.filter(row=>row.product_id!==savedProduct.id);
        productImages.push(...imagePaths.map((path,index)=>({id:`local-${savedProduct.id}-${index}`,product_id:savedProduct.id,image_path:path,sort_order:index*10,is_primary:index===0,created_at:savedProduct.updated_at||savedProduct.created_at||new Date().toISOString()})));
        selectedCategory=category_id;selectedProductNode=`category:${category_id}`;
        cleanupPreviewUrls();closeModal();syncPublicProductsFromAdminCache();renderProducts();notify(`تم حفظ المنتج (${imagePaths.length} صور)`);
      }catch(err){
        if(saveCommitted){
          cleanupPreviewUrls();closeModal();
          notify('تم حفظ المنتج، لكن تعذر تحديث الشاشة. حدّث الصفحة لرؤية التغيير.');
          return;
        }
        if(createdProductId) await db.from('products').delete().eq('id',createdProductId);
        if(uploadedPaths.length) await db.storage.from(bucket).remove(uploadedPaths);
        notify('تعذر الحفظ: '+(err.message||err));save.disabled=false;save.textContent='حفظ';
      }
    });
  }

  async function deleteProduct(id){
    const p=products.find(x=>x.id===id);
    if(!p||!confirm(`حذف «${p.name||'المنتج'}» وجميع صوره؟`))return;
    const paths=new Set(adminGalleryRows(p).map(row=>row.image_path));
    if(p.image_path) paths.add(p.image_path);
    if(p.catalog_pdf_path) paths.add(p.catalog_pdf_path);
    const removable=[...paths].filter(path=>isStoragePath(path) && !storagePathUsedByOtherProduct(path,p.id));
    const {error}=await db.from('products').delete().eq('id',id);
    if(error){notify('تعذر الحذف: '+error.message);return;}
    if(removable.length) await db.storage.from(bucket).remove(removable);
    products=products.filter(row=>row.id!==id);productImages=productImages.filter(row=>row.product_id!==id);syncPublicProductsFromAdminCache();renderProducts();notify('تم حذف المنتج وصوره');
  }

  (async()=>{
    if(!configured || !db){renderSetup();return;}
    if(passwordRecoveryMode){renderPasswordRecovery();return;}
    const session=await getSession();
    if(passwordRecoveryMode){renderPasswordRecovery();return;}
    if(!session){renderLogin();return;}
    if(recoveryPortalRequested){await renderPrimaryRecoveryPortal();return;}
    try{
      await loadCurrentAdminAccess();
      await refresh();renderApp();
    }catch(err){
      await db.auth.signOut();
      renderLogin();
    }
  })();
})();
