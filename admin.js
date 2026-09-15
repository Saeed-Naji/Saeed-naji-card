// Flower Light Supabase public/admin controller — Stage 31.
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

  const adminPanel = new URLSearchParams(location.search).get('admin');
  const adminMode = adminPanel === '1' || adminPanel === '2';
  const isPrimaryAdmin = adminPanel === '1';
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
    if(eventName==='product_whatsapp_click' || eventName==='product_image_open' || eventName==='quote_cart_add') return String(params.product_name||'');
    if(eventName==='quote_image_submit') return String(params.request_code||'');
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
  const quoteBucket = 'quote-requests';
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

  function normalizeSpecifications(raw){
    let rows=[];
    if(Array.isArray(raw)) rows=raw;
    else if(raw && typeof raw==='object') rows=Object.entries(raw).map(([key,value])=>({key,value}));
    return rows.map((row,index)=>{
      if(!row || typeof row!=='object') return null;
      const key=String(row.key||`custom_${index+1}`).trim();
      const def=PRODUCT_SPEC_FIELDS.find(field=>field.key===key);
      const label=String(row.label||def?.label||key).trim();
      const value=String(row.value??'').trim();
      const unit=String(row.unit||def?.unit||'').trim();
      return label && value ? {key,label,value,unit,quote:row.quote===true} : null;
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
      <label class="fl-spec-quote-toggle"><input type="checkbox" data-flex-spec-quote ${spec?.quote===true?'checked':''}><span>✓ يظهر في رسالة عرض السعر</span></label>
      <button class="fl-flex-spec-remove" data-flex-spec-remove type="button" aria-label="حذف الصفة">حذف</button>
    </div>`;
  }

  function productSpecsFormHtml(prod){
    const specs=normalizeSpecifications(prod?.specifications);
    const rows=(specs.length?specs:[null]).map(spec=>productSpecEditorRowHtml(spec)).join('');
    return `<div class="fl-product-spec-section full"><div class="fl-product-spec-head"><div><strong>المواصفات الفنية</strong><small>اكتب اسم الصفة وقيمتها بنفسك، مثل: القدرة — 30W. أضف فقط المواصفات التي تحتاجها.</small></div><button class="fl-cloud-btn fl-add-spec-btn" id="flAddProductSpec" type="button">+ إضافة صفة</button></div><div id="flFlexibleSpecs" class="fl-flex-spec-list">${rows}</div></div>`;
  }

  function collectProductSpecifications(){
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
        quote:row.querySelector('[data-flex-spec-quote]')?.checked===true
      });
    });
    return specs.slice(0,30);
  }

  function imageUrl(path){
    if (!path) return EMPTY_IMAGE;
    if (/^(https?:|data:|blob:)/i.test(path)) return path;
    if (!db) return '';
    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
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
  function setImage(id,path,alt=''){
    const el=document.getElementById(id); if(!el) return;
    if(path){el.src=imageUrl(path);el.alt=alt;el.hidden=false;} else {el.removeAttribute('src');el.alt='';el.hidden=true;}
  }

  function renderPublicProfile(){
    const profile=window.FLOWER_LIGHT_PROFILE || {};
    const contacts=(Array.isArray(window.FLOWER_LIGHT_CONTACTS)?window.FLOWER_LIGHT_CONTACTS:[]).filter(c=>c.is_visible!==false && String(c.value||'').trim());
    const brand=String(profile.brand_name||'').trim();
    const company=String(profile.company_name||'').trim();
    const fullName=String(profile.full_name||'').trim();
    const jobAr=String(profile.job_title_ar||'').trim();
    const jobEn=String(profile.job_title_en||'').trim();

    setImage('siteLogo',profile.logo_path,brand||company||'Logo');
    setImage('siteWatermark',profile.logo_path,'');
    setImage('sitePortrait',profile.portrait_path,fullName||'');
    setText('siteBrandName',brand);
    setText('siteCompanyName',company);
    setText('siteFullName',fullName);
    setText('siteJobTitleAr',jobAr);
    setText('siteJobTitleEn',jobEn);

    const brandRow=document.getElementById('siteBrandRow');
    const brandText=document.getElementById('siteBrandText');
    if(brandText) brandText.hidden=!(brand||company);
    if(brandRow) brandRow.hidden=!(brand||company||profile.logo_path);
    const portraitWrap=document.getElementById('sitePortraitWrap');
    if(portraitWrap) portraitWrap.hidden=!profile.portrait_path;
    const person=document.getElementById('sitePerson');
    if(person) person.hidden=!(fullName||jobAr||jobEn);
    const identity=document.getElementById('siteIdentity');
    if(identity) identity.hidden=!(profile.portrait_path||fullName||jobAr||jobEn);
    const hero=document.getElementById('siteHero');
    if(hero) hero.classList.toggle('profile-empty',!(brand||company||profile.logo_path||profile.portrait_path||fullName||jobAr||jobEn));

    const displayName=fullName||brand||company||'Digital Business Card';
    document.title=displayName;
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
    const quoteVisible=profile.quote_service_visible!==false;
    if(note){
      const catalogName=(brand||company)?`أقسام ومنتجات ${brand||company}`:'الأقسام والمنتجات';
      note.textContent=quoteVisible?`استعرض ${catalogName} وأضف ما تريد إلى طلب عرض السعر.`:`استعرض ${catalogName}.`;
    }

    window.flApplyServiceVisibility?.();
    window.flRenderProducts?.();
  }

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
        db.from('product_images').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true})
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
  window.FLOWER_LIGHT_PRODUCTS = { catalog: [], chandeliers: [], balfon: [], extraSections: [] };
  renderPublicProfile();
  if (db) { loadPublicProfile(); loadCloudProducts(); }

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
  function requestLeadAccess(){
    if(hasLeadAccess())return Promise.resolve(true);
    if(!db || !leadGate || !leadForm)return Promise.resolve(false);
    if(leadGatePromise)return leadGatePromise;
    leadLastFocus=document.activeElement;
    leadError?.classList.remove('show');
    if(leadError)leadError.textContent='';
    leadGate.classList.add('open');leadGate.setAttribute('aria-hidden','false');document.body.classList.add('fl-lead-open');
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
    const digits=leadPhoneDigits(mobile);
    if(full_name.length<2){leadError.textContent='اكتب الاسم بشكل صحيح.';leadError.classList.add('show');return;}
    if(company_name && company_name.length<2){leadError.textContent='اكتب اسم الشركة بشكل صحيح أو اتركه فارغًا.';leadError.classList.add('show');return;}
    if(digits.length<9 || digits.length>15){leadError.textContent='اكتب رقم جوال صحيح.';leadError.classList.add('show');return;}
    leadError.classList.remove('show');leadError.textContent='';
    leadSubmit.disabled=true;leadSubmit.textContent='جاري الحفظ...';
    try{
      const {error}=await db.from('customer_leads').insert({full_name,company_name,mobile});
      if(error)throw error;
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
  if(adminTitle) adminTitle.textContent = isPrimaryAdmin ? 'لوحة المدير الأساسي' : 'لوحة المدير المساعد';
  if(adminSubtitle) adminSubtitle.textContent = isPrimaryAdmin ? 'جميع أدوات الموقع والصلاحيات' : 'إدارة الموقع';
  shell.classList.add('open'); shell.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  let view='overview'; let categories=[]; let products=[]; let productImages=[]; let profile={}; let contacts=[]; let leads=[]; let quoteRequests=[]; let selectedCategory=''; let analyticsPeriod=30;
  const adminViewItems = [
    ['analytics','الإحصائيات'],
    ['quotes','طلبات عروض الأسعار'],
    ['services','خدمات العملاء'],
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
  const allowedAdminViews = () => new Set(isPrimaryAdmin
    ? ['overview',...validPermissionKeys,'permissions']
    : ['overview',...currentAdminPermissions]);
  const normalizeAdminView = candidate => allowedAdminViews().has(candidate) ? candidate : 'overview';
  let toastTimer;
  const notify = msg => { toast.textContent=msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2600); };
  const openModal = (title, html) => { modalTitle.textContent=title; modalBody.innerHTML=html; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); };
  const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); modalBody.innerHTML=''; };
  document.getElementById('flCloudModalClose').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{ if(e.target===modal) closeModal(); });
  document.getElementById('flCloudPreview').addEventListener('click',()=>{ location.href=location.pathname; });
  logoutBtn.addEventListener('click', async()=>{ if(db) await db.auth.signOut(); renderLogin(); });

  function normalizePermissionList(value){
    const list=Array.isArray(value) ? value : (Array.isArray(value?.permissions) ? value.permissions : []);
    return [...new Set(list.map(String).filter(key=>delegatablePermissionKeys.has(key)))];
  }

  async function loadCurrentAdminAccess(){
    const {data,error}=await db.rpc('get_current_admin_access');
    if(error)throw new Error((String(error.code)==='PGRST202'||String(error.code)==='42883') ? 'شغّل ملف ADMIN_ROLES_STAGE22.txt في Supabase أولًا.' : (error.message||error));
    currentAdminRole=String(data?.role||'');
    currentAdminEmail=String(data?.email||'');
    currentAdminPermissions=new Set(normalizePermissionList(data));
    const expectedRole=isPrimaryAdmin?'owner':'subadmin';
    if(currentAdminRole!==expectedRole){
      throw new Error(isPrimaryAdmin
        ? 'هذا الرابط مخصص لحساب المدير الأساسي Owner فقط.'
        : 'هذا الرابط مخصص لحساب المدير المساعد المرتبط بـ admin=2 فقط.');
    }
    if(isPrimaryAdmin){
      const {data:settings,error:settingsError}=await db.rpc('owner_get_admin2_settings');
      if(settingsError)throw settingsError;
      managedAdmin2Email=String(settings?.email||'');
      managedAdmin2Permissions=new Set(normalizePermissionList(settings));
    }
  }

  function renderSetup(){
    logoutBtn.hidden=true;
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login fl-cloud-setup"><h2>ربط Supabase مرة واحدة</h2><p>الملف جاهز، لكن يحتاج عنوان مشروع Supabase والمفتاح العام Publishable/Anon. بعد وضعهما في أعلى ملف <b>index.html</b> يصبح الحفظ مباشرًا.</p><div class="fl-cloud-note">ابحث داخل الملف عن <b>YOUR_SUPABASE_URL</b> و <b>YOUR_SUPABASE_ANON_KEY</b> واستبدلهما بالقيمتين من Supabase → Project Settings → API.</div><code>url: 'https://YOUR_PROJECT.supabase.co'\nanonKey: 'YOUR_PUBLISHABLE_OR_ANON_KEY'</code><p>بعدها ارفع index.html مرة واحدة فقط. كل تعديل لاحق للمنتجات والصور يتم من هذه اللوحة مباشرة.</p></div></div>`;
  }

  async function getSession(){ const {data} = await db.auth.getSession(); return data.session; }
  async function renderLogin(initialMessage=''){
    logoutBtn.hidden=true;
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-login"><h2>${isPrimaryAdmin?'تسجيل دخول المدير الأساسي':'تسجيل دخول المدير المساعد'}</h2><p>استخدم البريد الإلكتروني وكلمة مرور حساب Supabase المخصص لهذه اللوحة.</p><form id="flLoginForm"><div class="fl-cloud-field"><label>البريد الإلكتروني</label><input id="flLoginEmail" type="email" autocomplete="username" required></div><div class="fl-cloud-field"><label>كلمة المرور</label><input id="flLoginPassword" type="password" autocomplete="current-password" required></div><button class="fl-cloud-btn primary" id="flLoginSubmit" type="submit">تسجيل الدخول</button></form><div id="flLoginMsg" class="fl-cloud-note bad" style="${initialMessage?'':'display:none;'}margin-top:12px">${esc(initialMessage)}</div></div></div>`;
    document.getElementById('flLoginForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const msg=document.getElementById('flLoginMsg');
      const submit=document.getElementById('flLoginSubmit');
      msg.style.display='none';
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
        msg.textContent='تعذر الدخول: '+(accessError?.message||String(accessError));
        msg.style.display='block';
      }finally{
        submit.disabled=false;submit.textContent='تسجيل الدخول';
      }
    });
  }

  async function refresh(){
    const allowed=allowedAdminViews();
    const needCatalog=allowed.has('sections') || allowed.has('products');
    const [{data:c,error:ce},{data:p,error:pe},{data:pi,error:pie},{data:pf,error:pfe},{data:ct,error:cte},{data:ld,error:lde},{data:qr,error:qre}] = await Promise.all([
      needCatalog ? db.from('categories').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}) : Promise.resolve({data:[],error:null}),
      needCatalog ? db.from('products').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}) : Promise.resolve({data:[],error:null}),
      needCatalog ? db.from('product_images').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}) : Promise.resolve({data:[],error:null}),
      allowed.has('profile')
        ? db.from('site_profile').select('*').eq('id',1).maybeSingle()
        : (allowed.has('services') ? db.rpc('get_quote_service_visibility_for_admin') : Promise.resolve({data:{},error:null})),
      allowed.has('contacts') ? db.from('contact_items').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:true}) : Promise.resolve({data:[],error:null}),
      allowed.has('leads') ? db.from('customer_leads').select('*').order('created_at',{ascending:false}) : Promise.resolve({data:[],error:null}),
      allowed.has('quotes') ? db.from('quote_requests').select('*').order('created_at',{ascending:false}).limit(500) : Promise.resolve({data:[],error:null})
    ]);
    if(ce||pe||pie||pfe||cte||lde||qre) throw ce||pe||pie||pfe||cte||lde||qre;
    categories=c||[]; products=p||[]; productImages=pi||[]; profile=pf||{}; contacts=ct||[]; leads=ld||[]; quoteRequests=qr||[];
    if(!selectedCategory && categories[0]) selectedCategory=categories[0].id;
    if(selectedCategory && !categories.some(c=>c.id===selectedCategory)) selectedCategory=categories[0]?.id||'';
  }

  function navHtml(){
    const allowed=allowedAdminViews();
    const items=[['overview','الرئيسية'],...adminViewItems.filter(([key])=>allowed.has(key))];
    if(isPrimaryAdmin)items.push(['permissions','صلاحيات admin=2']);
    return `<nav class="fl-cloud-nav">${items.map(([key,label])=>`<button data-cloud-view="${key}" class="${view===key?'active':''}">${label}</button>`).join('')}</nav>`;
  }

  function layout(content){
    body.innerHTML=`<div class="fl-cloud-wrap"><div class="fl-cloud-grid">${navHtml()}<main class="fl-cloud-main">${content}</main></div></div>`;
    body.querySelectorAll('[data-cloud-view]').forEach(button=>button.addEventListener('click',()=>{
      const nextView=normalizeAdminView(button.dataset.cloudView);
      view=nextView;
      renderApp();
    }));
  }

  function renderApp(){
    logoutBtn.hidden=false;
    view=normalizeAdminView(view);
    if(view==='analytics') renderAnalytics();
    else if(view==='quotes') renderQuoteRequests();
    else if(view==='services') renderServices();
    else if(view==='datasheet') renderDatasheetDesigner();
    else if(view==='sections') renderSections();
    else if(view==='products') renderProducts();
    else if(view==='profile') renderProfile();
    else if(view==='contacts') renderContacts();
    else if(view==='leads') renderLeads();
    else if(view==='permissions' && isPrimaryAdmin) renderPermissions();
    else renderOverview();
  }

  function renderOverview(){
    const allowed=allowedAdminViews();
    const visible=products.filter(p=>p.is_visible!==false).length;
    const profileReady=Boolean(profile.full_name||profile.brand_name||profile.company_name||profile.logo_path||profile.portrait_path);
    const newQuotes=quoteRequests.filter(item=>item.status!=='processed').length;
    const statCards=[];
    if(allowed.has('sections'))statCards.push([categories.length,'الأقسام']);
    if(allowed.has('products'))statCards.push([products.length,'إجمالي المنتجات'],[visible,'المنتجات الظاهرة']);
    if(allowed.has('quotes'))statCards.push([newQuotes,'طلبات سعر جديدة']);
    if(allowed.has('services'))statCards.push([profile.quote_service_visible!==false?'✓':'—','طلب عرض السعر']);
    if(allowed.has('datasheet'))statCards.push(['✓','صمّم داتا شيت']);
    if(allowed.has('profile'))statCards.push([profileReady?'✓':'—','بيانات البطاقة']);
    if(allowed.has('contacts'))statCards.push([contacts.length,'وسائل التواصل']);
    if(allowed.has('leads'))statCards.push([leads.length,'جهات اتصال العملاء']);
    const statsHtml=statCards.length?`<div class="fl-cloud-stats">${statCards.map(([value,label])=>`<div class="fl-cloud-stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div>`:'';
    const quickButtons=[
      ['analytics','الإحصائيات','success'],
      ['quotes',`طلبات عروض الأسعار (${quoteRequests.length})`,'primary'],
      ['services','خدمات العملاء',''],
      ['datasheet','صمّم داتا شيت','success'],
      ['sections','الأقسام',''],
      ['products','المنتجات','primary'],
      ['profile','البيانات الشخصية',''],
      ['contacts','وسائل التواصل',''],
      ['leads',`جهات اتصال العملاء (${leads.length})`,'success']
    ].filter(([key])=>allowed.has(key)).map(([key,label,style])=>`<button class="fl-cloud-btn ${style}" data-quick-view="${key}" type="button">${label}</button>`).join('');
    layout(`<div class="fl-cloud-head"><div><h2>${isPrimaryAdmin?'إدارة الموقع بالكامل':'لوحة المدير المساعد'}</h2>${isPrimaryAdmin?'<p>جميع أجزاء الموقع متاحة لك، بما فيها الأقسام والمنتجات وتحديد صلاحيات المدير المساعد.</p>':''}</div></div>
      ${statsHtml}
      <div class="fl-cloud-note ok">الحساب الحالي: <b dir="ltr">${esc(currentAdminEmail)}</b> · ${isPrimaryAdmin?'Owner':'Sub-admin'}</div>
      <div class="fl-cloud-card"><div class="fl-cloud-head"><div><h2 style="font-size:17px">البدء السريع</h2><p>${quickButtons?'انتقل مباشرة إلى الجزء الذي تريد إدارته.':'لم يمنحك المدير الأساسي أي صلاحيات بعد.'}</p></div></div><div class="fl-cloud-actions">${quickButtons}</div></div>
      ${isPrimaryAdmin?'<div class="fl-cloud-note ok">يمكنك تغيير ما يظهر في admin=2 من صفحة «صلاحيات admin=2».</div>':''}`);
    body.querySelectorAll('[data-quick-view]').forEach(button=>button.addEventListener('click',()=>{view=normalizeAdminView(button.dataset.quickView);renderApp();}));
  }

  function renderPermissions(){
    const rows=adminViewItems.filter(([key])=>delegatablePermissionKeys.has(key)).map(([key,label])=>`<label class="fl-permission-row"><span class="fl-permission-copy"><strong>${esc(label)}</strong><small>السماح لـ admin=2 بفتح وإدارة هذا الجزء</small></span><input type="checkbox" name="admin2_permission" value="${key}" ${managedAdmin2Permissions.has(key)?'checked':''}><span class="fl-permission-check" aria-hidden="true">✓</span></label>`).join('');
    layout(`<div class="fl-cloud-head"><div><h2>صلاحيات admin=2</h2><p>اربط حساب Supabase منفصلًا للمدير المساعد، ثم حدد الأجزاء التي يستطيع إدارتها. الرئيسية تبقى ظاهرة دائمًا، بينما الأقسام والمنتجات للمدير الأساسي فقط.</p></div></div>
      <div class="fl-cloud-note ok">هذه صلاحيات حقيقية داخل قاعدة البيانات، وليست مجرد إخفاء للأزرار.</div>
      <form id="flPermissionsForm" class="fl-cloud-card fl-permissions-card">
        <div class="fl-cloud-field"><label for="flAdmin2Email">بريد مستخدم admin=2 في Supabase</label><input id="flAdmin2Email" type="email" autocomplete="off" required dir="ltr" value="${esc(managedAdmin2Email)}" placeholder="example@email.com"><small>يجب إنشاء هذا البريد أولًا من Supabase → Authentication → Users، ويجب أن يختلف عن حساب admin=1.</small></div>
        <div class="fl-permission-list">${rows}</div>
        <div class="fl-cloud-actions"><button class="fl-cloud-btn primary" id="flPermissionsSave" type="submit">ربط الحساب وحفظ الصلاحيات</button></div>
      </form>`);
    document.getElementById('flPermissionsForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const save=document.getElementById('flPermissionsSave');
      const email=document.getElementById('flAdmin2Email').value.trim();
      const selected=[...body.querySelectorAll('input[name="admin2_permission"]:checked')].map(input=>input.value);
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {data,error}=await db.rpc('owner_set_admin2_settings',{p_email:email,p_permissions:selected});
        if(error)throw error;
        managedAdmin2Email=String(data?.email||email);
        managedAdmin2Permissions=new Set(normalizePermissionList(data));
        renderPermissions();notify('تم ربط حساب admin=2 وحفظ صلاحياته');
      }catch(error){
        const message=String(error?.message||error||'');
        const friendly=message.includes('No Supabase Auth user')?'لا يوجد مستخدم بهذا البريد في Supabase. أنشئه أولًا من Authentication ثم حاول مجددًا.'
          : message.includes('different Supabase Auth account')?'يجب أن يكون بريد admin=2 مختلفًا عن حساب admin=1.'
          : message.includes('Owner access required')?'هذه العملية متاحة للمدير الأساسي Owner فقط.'
          : 'تعذر حفظ الصلاحيات: '+message;
        notify(friendly);
        save.disabled=false;save.textContent='ربط الحساب وحفظ الصلاحيات';
      }
    });
  }

  function profileImagePreview(path,kind){
    if(!path) return '<div class="fl-cloud-empty" style="padding:18px 8px">لا توجد صورة</div>';
    return `<img class="${kind==='logo'?'logo-preview':''}" src="${esc(imageUrl(path))}" alt="">`;
  }

  function quoteRequestDate(value){
    try{return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Riyadh'}).format(new Date(value));}
    catch(_){return String(value||'');}
  }

  function quoteRequestPaths(request){
    const paths=Array.isArray(request?.file_paths)?request.file_paths.filter(Boolean):[];
    if(request?.image_path && !paths.includes(request.image_path))paths.unshift(request.image_path);
    return [...new Set(paths)];
  }

  function quoteRequestFileIsPdf(path){
    return /\.pdf(?:$|\?)/i.test(String(path||''));
  }

  async function showQuoteRequestFiles(id){
    const request=quoteRequests.find(item=>item.id===id);
    const paths=quoteRequestPaths(request);
    if(!paths.length){notify('لا توجد مرفقات لهذا الطلب');return;}
    const results=await Promise.all(paths.map(async path=>{
      const {data,error}=await db.storage.from(quoteBucket).createSignedUrl(path,600);
      return {path,url:data?.signedUrl||'',error};
    }));
    const ok=results.filter(row=>row.url);
    if(!ok.length){notify('تعذر فتح المرفقات');return;}
    const html=ok.map((row,index)=>{
      const pdf=quoteRequestFileIsPdf(row.path);
      return `<article class="fl-quote-file-card"><div class="fl-quote-file-head"><span>${pdf?'ملف PDF':'صورة'} ${index+1} من ${ok.length}</span><a class="fl-quote-file-open" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">فتح منفصل</a></div>${pdf?`<div class="fl-quote-pdf-view"><strong>PDF</strong><span>ملف طلب عرض السعر</span><a class="fl-quote-file-open" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">فتح ملف PDF</a></div>`:`<img src="${esc(row.url)}" alt="مرفق طلب عرض السعر ${index+1}">`}</article>`;
    }).join('');
    openModal(`مرفقات الطلب ${request.request_code||''}`,`<div class="fl-quote-files-view">${html}<div class="fl-cloud-note">الروابط مؤقتة ومخصصة للعرض من لوحة الإدارة.</div></div>`);
  }

  async function toggleQuoteRequestStatus(id){
    const request=quoteRequests.find(item=>item.id===id); if(!request)return;
    const next=request.status==='processed'?'new':'processed';
    const {error}=await db.from('quote_requests').update({status:next}).eq('id',id);
    if(error){notify('تعذر تحديث الحالة: '+error.message);return;}
    request.status=next; renderQuoteRequests(); notify(next==='processed'?'تم تعليم الطلب كمعالج':'تمت إعادة الطلب إلى جديد');
  }

  async function deleteQuoteRequest(id){
    const request=quoteRequests.find(item=>item.id===id); if(!request)return;
    if(!confirm(`حذف طلب عرض السعر ${request.request_code||''}؟`))return;
    const paths=quoteRequestPaths(request);
    const {error}=await db.from('quote_requests').delete().eq('id',id);
    if(error){notify('تعذر حذف الطلب: '+error.message);return;}
    if(paths.length){
      const {error:storageError}=await db.storage.from(quoteBucket).remove(paths);
      if(storageError) console.warn('[Quote request] attachment cleanup failed',storageError);
    }
    quoteRequests=quoteRequests.filter(item=>item.id!==id); renderQuoteRequests(); notify('تم حذف الطلب');
  }

  function renderQuoteRequests(){
    const list=quoteRequests.slice();
    const fresh=list.filter(item=>item.status!=='processed').length;
    const cards=list.map(item=>{
      const processed=item.status==='processed';
      const tel=String(item.mobile||'').replace(/[^\d+]/g,'');
      const wa=cleanWhatsApp(item.mobile||'');
      const attachmentCount=quoteRequestPaths(item).length;
      return `<article class="fl-quote-request ${processed?'processed':''}">
        <div class="fl-quote-request-head"><div><span class="fl-quote-code">${esc(item.request_code||'طلب')}</span><strong>${esc(item.full_name||'بدون اسم')}</strong><small>${esc(quoteRequestDate(item.created_at))}</small></div><span class="fl-quote-status ${processed?'done':'new'}">${processed?'تمت المعالجة':'جديد'}</span></div>
        <div class="fl-quote-request-info"><span><b>نوع الطلب:</b> ${item.customer_type==='company'?'باسم شركة':'طلب فردي'}</span><span><b>الجوال:</b> ${esc(item.mobile||'—')}</span><span><b>المرفقات:</b> ${attachmentCount}</span>${item.customer_type==='company'?`<span class="full"><b>الشركة:</b> ${esc(item.company_name||'—')}</span>`:''}${item.notes?`<span class="full"><b>الملاحظات:</b> ${esc(item.notes)}</span>`:''}</div>
        <div class="fl-cloud-actions"><button class="fl-cloud-btn primary" data-quote-files="${item.id}" type="button">عرض المرفقات (${attachmentCount})</button>${wa?`<a class="fl-cloud-btn success" href="https://wa.me/${esc(wa)}?text=${encodeURIComponent(`السلام عليكم، بخصوص طلب عرض السعر ${item.request_code||''}`)}" target="_blank" rel="noopener noreferrer">واتساب العميل</a>`:''}${tel?`<a class="fl-cloud-btn" href="tel:${esc(tel)}">اتصال</a>`:''}<button class="fl-cloud-btn" data-quote-status="${item.id}" type="button">${processed?'إعادة إلى جديد':'تمت المعالجة'}</button><button class="fl-cloud-btn danger" data-quote-delete="${item.id}" type="button">حذف</button></div>
      </article>`;
    }).join('');
    layout(`<div class="fl-cloud-head"><div><h2>طلبات عروض الأسعار</h2><p>طلبات العملاء المرفوعة كصور متعددة أو ملفات PDF. جميع المرفقات محفوظة في مساحة خاصة.</p></div><button class="fl-cloud-btn" id="flQuotesRefresh" type="button">تحديث</button></div><div class="fl-cloud-stats"><div class="fl-cloud-stat"><strong>${fresh}</strong><span>طلبات جديدة</span></div><div class="fl-cloud-stat"><strong>${list.length}</strong><span>إجمالي الطلبات</span></div></div>${cards?`<div class="fl-quote-request-list">${cards}</div>`:`<div class="fl-cloud-card"><div class="fl-cloud-empty">لا توجد طلبات عروض أسعار مرفوعة بعد.</div></div>`}`);
    document.getElementById('flQuotesRefresh')?.addEventListener('click',async()=>{await refresh();renderQuoteRequests();notify('تم التحديث');});
    body.querySelectorAll('[data-quote-files]').forEach(btn=>btn.addEventListener('click',()=>showQuoteRequestFiles(btn.dataset.quoteFiles)));
    body.querySelectorAll('[data-quote-status]').forEach(btn=>btn.addEventListener('click',()=>toggleQuoteRequestStatus(btn.dataset.quoteStatus)));
    body.querySelectorAll('[data-quote-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteQuoteRequest(btn.dataset.quoteDelete)));
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
      layout(`<div class="fl-cloud-head"><div><h2>إحصائيات الموقع</h2><p>الزيارات والتفاعل مع الموقع.</p></div></div><div class="fl-cloud-note bad">تعذر تحميل الإحصائيات. شغّل ملف <b>ANALYTICS_V5_UPGRADE.sql</b> في Supabase مرة واحدة ثم أعد المحاولة.<br><small>${esc(error.message||'')}</small></div>`);
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
        notify(String(err?.message||'تعذر إعادة تعيين الإحصائيات. شغّل ملف ANALYTICS_V5_2_RESET.sql ثم حاول مجددًا.'));
        if(resetBtn){resetBtn.disabled=false;resetBtn.textContent='إعادة تعيين الإحصائيات';}
      }
    });
    document.getElementById('flAnalyticsMetric')?.addEventListener('change',e=>{analyticsChartMetric=e.target.value;updateAnalyticsChart(a);});
  }


  function renderServices(){
    const quoteVisible=profile.quote_service_visible!==false;
    layout(`<div class="fl-cloud-head"><div><h2>خدمات العملاء</h2><p>ضع ✓ أمام الخدمة التي تريد إظهارها للعميل، وأزل العلامة لإخفائها.</p></div></div>
      <div class="fl-cloud-card">
        <form id="flServicesForm">
          <div class="fl-service-list">
            <label class="fl-service-control">
              <span class="fl-service-control-icon quote" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h5"></path></svg></span>
              <span class="fl-service-control-copy"><strong>طلب عرض سعر</strong><small>يتحكم في زر طلب السعر الرئيسي، وسلة الطلب، وأزرار الإضافة داخل المنتجات.</small></span>
              <span class="fl-service-control-action"><input id="flServiceQuote" type="checkbox" ${quoteVisible?'checked':''}><span class="fl-service-checkbox">✓</span><em data-service-state="quote">${quoteVisible?'ظاهر':'مخفي'}</em></span>
            </label>
          </div>
          <div class="fl-cloud-dialog-actions"><button class="fl-cloud-btn primary" id="flServicesSave" type="submit">حفظ ظهور الخدمة</button></div>
        </form>
      </div>
      <div class="fl-cloud-note">«صمّم داتا شيت» أصبح أداة إدارية مستقلة ولا يظهر للعملاء.</div>`);
    const quoteInput=document.getElementById('flServiceQuote');
    const syncState=(input,key)=>{const state=body.querySelector(`[data-service-state="${key}"]`);if(state)state.textContent=input.checked?'ظاهر':'مخفي';};
    quoteInput.addEventListener('change',()=>syncState(quoteInput,'quote'));
    document.getElementById('flServicesForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const save=document.getElementById('flServicesSave');
      save.disabled=true;save.textContent='جاري الحفظ...';
      try{
        const {data,error}=await db.rpc('set_quote_service_visibility',{p_quote_visible:quoteInput.checked});
        if(error){
          const missing=String(error.code)==='PGRST202'||String(error.code)==='42883';
          throw new Error(missing?'شغّل ملف ADMIN_DATASHEET_STAGE31.sql في Supabase أولًا.':(error.message||error));
        }
        profile={
          ...profile,
          quote_service_visible:data?.quote_service_visible!==false
        };
        await loadPublicProfile();
        renderServices();
        notify('تم حفظ ظهور طلب عرض السعر للعملاء');
      }catch(err){
        notify('تعذر الحفظ: '+(err.message||err));
        save.disabled=false;save.textContent='حفظ ظهور الخدمة';
      }
    });
  }

  function renderDatasheetDesigner(){
    layout(`<div class="fl-cloud-head"><div><h2>صمّم داتا شيت</h2><p>أداة إدارية خاصة ولا تظهر في واجهة العملاء.</p></div></div>
      <div class="fl-cloud-card fl-datasheet-admin-card">
        <div class="fl-datasheet-admin-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"></path><path d="M15 3v5h5"></path><path d="M9 12h7M9 16h7"></path></svg></div>
        <div><h3>مكان أداة تصميم الداتا شيت جاهز</h3><p>ستتم إضافة أداة التصميم الكاملة داخل هذا القسم في المرحلة التالية.</p></div>
      </div>
      <div class="fl-cloud-note ok">يظهر هذا القسم دائمًا للمدير الأساسي، ويظهر للمدير المساعد فقط عند تفعيل صلاحية «صمّم داتا شيت» من صفحة صلاحيات admin=2.</div>`);
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
      await refresh();await loadPublicProfile();renderProfile();notify('تم حفظ البيانات وظهرت على الموقع');
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
      closeModal();await refresh();await loadPublicProfile();renderContacts();notify('تم حفظ وسيلة التواصل');
    });
  }
  async function deleteContact(id){
    const item=contacts.find(c=>c.id===id);if(!item||!confirm(`حذف «${item.label||contactTypeName(item.type)}»؟`))return;
    const {error}=await db.from('contact_items').delete().eq('id',id);if(error){notify('تعذر الحذف: '+error.message);return;}
    await refresh();await loadPublicProfile();renderContacts();notify('تم حذف وسيلة التواصل');
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
  function renderLeads(){
    const uniqueCount=uniqueLeadsForExport(leads).length;
    layout(`<div class="fl-cloud-head"><div><h2>جهات اتصال العملاء</h2><p>هذه البيانات يسجلها العميل قبل فتح كتالوج المنتجات.</p></div><button class="fl-cloud-btn success" id="flDownloadAllLeads" type="button" ${leads.length?'':'disabled'}>تحميل الكل .VCF</button></div><div class="fl-lead-stats"><div class="fl-lead-stat"><strong>${leads.length}</strong><span>إجمالي التسجيلات</span></div><div class="fl-lead-stat"><strong>${uniqueCount}</strong><span>أرقام جوال فريدة</span></div></div><div class="fl-cloud-card">${leadRows(leads)}</div>`);
    document.getElementById('flDownloadAllLeads')?.addEventListener('click',()=>downloadLeadsVcf(leads,`flower-light-customers-${new Date().toISOString().slice(0,10)}.vcf`));
    body.querySelectorAll('[data-lead-vcf]').forEach(b=>b.addEventListener('click',()=>{const lead=leads.find(x=>x.id===b.dataset.leadVcf);if(lead){const phone=normalizeLeadPhone(lead.mobile)||String(lead.id||'').slice(0,8);downloadLeadsVcf([lead],`customer-${phone}.vcf`);}}));
    body.querySelectorAll('[data-lead-delete]').forEach(b=>b.addEventListener('click',()=>deleteLead(b.dataset.leadDelete)));
  }
  async function deleteLead(id){
    const lead=leads.find(x=>x.id===id);if(!lead||!confirm(`حذف جهة اتصال «${lead.full_name||'العميل'}»؟`))return;
    const {error}=await db.from('customer_leads').delete().eq('id',id);if(error){notify('تعذر الحذف: '+error.message);return;}
    await refresh();renderLeads();notify('تم حذف جهة اتصال العميل');
  }

  function categoryRows(list){
    if(!list.length) return `<div class="fl-cloud-empty">لا توجد أقسام بعد.</div>`;
    return `<div class="fl-cloud-list">${list.map(c=>{const count=products.filter(p=>p.category_id===c.id).length;return `<div class="fl-cloud-row"><div class="fl-cloud-row-meta"><strong>${esc(c.name)}</strong><small>${count} منتج · ${c.is_visible===false?'مخفي':'ظاهر'}</small></div><div class="fl-cloud-row-actions"><button class="fl-cloud-mini" data-cat-products="${c.id}" type="button">المنتجات</button><button class="fl-cloud-mini" data-cat-edit="${c.id}" type="button">تعديل</button><button class="fl-cloud-mini red" data-cat-delete="${c.id}" type="button">حذف</button></div></div>`}).join('')}</div>`;
  }

  function renderSections(){
    layout(`<div class="fl-cloud-head"><div><h2>الأقسام</h2><p>مثال: ثريات، بلفون، جداريات، سبوت لايت، مفاتيح وأفياش.</p></div><button class="fl-cloud-btn primary" id="flAddCategory" type="button">+ قسم جديد</button></div><div class="fl-cloud-card">${categoryRows(categories)}</div>`);
    document.getElementById('flAddCategory').addEventListener('click',()=>openCategoryForm()); bindCategoryActions();
  }
  function bindCategoryActions(){
    body.querySelectorAll('[data-cat-products]').forEach(b=>b.addEventListener('click',()=>{selectedCategory=b.dataset.catProducts;view='products';renderProducts();}));
    body.querySelectorAll('[data-cat-edit]').forEach(b=>b.addEventListener('click',()=>openCategoryForm(categories.find(c=>c.id===b.dataset.catEdit))));
    body.querySelectorAll('[data-cat-delete]').forEach(b=>b.addEventListener('click',()=>deleteCategory(b.dataset.catDelete)));
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
    if(error) throw new Error((String(error.code)==='PGRST202'||String(error.code)==='42883') ? 'شغّل ملف PRODUCT_MANAGEMENT_STAGE8.sql أولًا ثم أعد المحاولة.' : (error.message||error));
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
        await refresh();
        await loadCloudProducts();
        if(status){status.textContent='تم حفظ الترتيب';status.classList.remove('saving');status.classList.add('saved');}
        notify('تم حفظ ترتيب المنتجات');
        window.setTimeout(()=>renderProducts(),500);
      }catch(err){
        notify('تعذر حفظ الترتيب: '+(err.message||err));
        await refresh();renderProducts();
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
        specifications:normalizeSpecifications(source.specifications),
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
      await refresh();await loadCloudProducts();renderProducts();
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

  function renderProducts(){
    const opts=categories.map(c=>`<option value="${c.id}" ${c.id===selectedCategory?'selected':''}>${esc(c.name)}</option>`).join('');
    const list=categoryProductsInOrder(selectedCategory);
    const cards=list.map((p,index)=>{
      const specCount=normalizeSpecifications(p.specifications).length;
      const gallery=adminGalleryRows(p);
      const imagePath=gallery[0]?.image_path||p.image_path||p.image_url||'';
      const retailPrice=p.price!=null&&p.price!==''?`${Number(p.price).toLocaleString('en-US',{maximumFractionDigits:2})} ر.س`:'';
      const wholesalePrice=p.wholesale_price!=null&&p.wholesale_price!==''?`${Number(p.wholesale_price).toLocaleString('en-US',{maximumFractionDigits:2})} ر.س`:'';
      const wholesaleMin=Number(p.wholesale_min_qty)>=2?` من ${Number(p.wholesale_min_qty).toLocaleString('en-US')}+`:'';
      return `<article class="fl-cloud-product" data-product-id="${p.id}">
        <button class="fl-product-drag-handle" type="button" aria-label="اسحب لتغيير ترتيب ${esc(p.name||'المنتج')}" title="اسحب لتغيير الترتيب"><span>⋮⋮</span><small>${index+1}</small></button>
        <div class="fl-cloud-product-image-wrap"><img src="${esc(imageUrl(imagePath))}" alt="${esc(p.name||'منتج')}" loading="lazy"><span class="fl-admin-gallery-count">${gallery.length} / ${MAX_PRODUCT_IMAGES} صور</span></div>
        <div class="fl-cloud-product-body"><strong>${esc(p.name||'منتج بدون اسم')}</strong><small>${esc(p.model?`الكود ${p.model}`:'بدون كود')} · ${p.is_visible===false?'مخفي':'ظاهر'}${specCount?` · ${specCount} معلومات`:''}${retailPrice?` · قطاعي ${retailPrice}`:''}${wholesalePrice?` · جملة ${wholesalePrice}${wholesaleMin}`:''}${p.limited_offer===true?' · عرض محدود':''}</small>
        <div class="fl-cloud-product-actions"><button class="fl-cloud-mini" data-prod-edit="${p.id}" type="button">تعديل</button><button class="fl-cloud-mini" data-prod-copy="${p.id}" type="button">نسخ</button><button class="fl-cloud-mini red" data-prod-delete="${p.id}" type="button">حذف</button></div></div></article>`;
    }).join('');
    layout(`<div class="fl-cloud-head"><div><h2>المنتجات</h2><p>اسحب من المقبض لتغيير الترتيب. النسخ ينشئ منتجًا مستقلًا مع مواصفاته وصوره، وبحد أقصى 4 صور لكل منتج.</p></div><button class="fl-cloud-btn primary" id="flAddProduct" type="button" ${categories.length?'':'disabled'}>+ منتج جديد</button></div><div class="fl-cloud-card"><div class="fl-products-toolbar"><div class="fl-cloud-field"><label>القسم</label><select id="flCategorySelect">${opts}</select></div><div class="fl-product-order-status" id="flProductOrderStatus">اسحب المنتجات لترتيبها تلقائيًا</div></div>${cards?`<div class="fl-cloud-products">${cards}</div>`:`<div class="fl-cloud-empty">لا توجد منتجات في هذا القسم بعد.</div>`}</div>`);
    const sel=document.getElementById('flCategorySelect'); if(sel) sel.addEventListener('change',e=>{selectedCategory=e.target.value;renderProducts();});
    document.getElementById('flAddProduct')?.addEventListener('click',()=>openProductForm());
    body.querySelectorAll('[data-prod-edit]').forEach(b=>b.addEventListener('click',()=>openProductForm(products.find(p=>p.id===b.dataset.prodEdit))));
    body.querySelectorAll('[data-prod-copy]').forEach(b=>b.addEventListener('click',()=>duplicateProduct(b.dataset.prodCopy)));
    body.querySelectorAll('[data-prod-delete]').forEach(b=>b.addEventListener('click',()=>deleteProduct(b.dataset.prodDelete)));
    bindProductDragReorder();
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
      const res=cat?await db.from('categories').update(payload).eq('id',cat.id):await db.from('categories').insert(payload).select().single();
      if(res.error){
        const message=String(res.error.code)==='23505'?'تعذر الحفظ بسبب تعارض داخلي. أعد المحاولة.':res.error.message;
        notify('خطأ: '+message);save.disabled=false;save.textContent='حفظ';return;
      }
      closeModal();await refresh();await loadCloudProducts();renderApp();notify('تم حفظ القسم');
    });
  }

  async function deleteCategory(id){
    const cat=categories.find(c=>c.id===id);
    if(!cat||!confirm(`حذف قسم «${cat.name}» وكل منتجاته وصورها؟`))return;
    const productIds=new Set(products.filter(p=>p.category_id===id).map(p=>p.id));
    const candidatePaths=new Set();
    products.filter(p=>productIds.has(p.id)).forEach(p=>{if(isStoragePath(p.image_path))candidatePaths.add(p.image_path);});
    productImages.filter(row=>productIds.has(row.product_id)).forEach(row=>{if(isStoragePath(row.image_path))candidatePaths.add(row.image_path);});
    const paths=[...candidatePaths].filter(path=>{
      const usedByOtherProduct=products.some(p=>!productIds.has(p.id) && p.image_path===path) || productImages.some(row=>!productIds.has(row.product_id) && row.image_path===path);
      return !usedByOtherProduct;
    });
    const {error}=await db.from('categories').delete().eq('id',id);
    if(error){notify('تعذر الحذف: '+error.message);return;}
    if(paths.length) await db.storage.from(bucket).remove(paths);
    await refresh(); await loadCloudProducts(); renderApp(); notify('تم حذف القسم ومنتجاته');
  }

  async function fileToOptimizedBlob(file){
    if(!file) return null;
    const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>resolve(r.result);r.readAsDataURL(file);});
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onerror=reject;i.onload=()=>resolve(i);i.src=dataUrl;});
    const max=1400, scale=Math.min(1,max/Math.max(img.width,img.height)); const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)); const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
    return await new Promise(resolve=>canvas.toBlob(blob=>resolve(blob||file),'image/webp',.82));
  }
  async function uploadBlob(blob,categoryId){ const ext=(blob.type||'image/webp').includes('png')?'png':(blob.type||'').includes('jpeg')?'jpg':'webp'; const path=`${categoryId}/${crypto.randomUUID()}.${ext}`; const {error}=await db.storage.from(bucket).upload(path,blob,{contentType:blob.type||'image/webp',upsert:false,cacheControl:'31536000'}); if(error)throw error; return path; }

  function storagePathUsedByOtherProduct(path,productId){
    if(!path) return false;
    return products.some(p=>p.id!==productId && p.image_path===path)
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
      <div class="fl-cloud-field full"><label>الوصف</label><textarea id="flProdCaption" placeholder="وصف مختصر">${esc(prod?.caption||'')}</textarea></div>
      <section class="fl-pricing-editor full">
        <div class="fl-pricing-editor-head"><div><strong>الأسعار</strong><small>كل الحقول اختيارية. اكتب القطاعي والجملة وحدد أقل كمية تستحق سعر الجملة.</small></div></div>
        <div class="fl-pricing-editor-grid">
          <div class="fl-cloud-field"><label>سعر القطاعي (ر.س)</label><input id="flProdPrice" type="number" min="0" step="0.01" inputmode="decimal" value="${prod?.price==null?'':esc(prod.price)}" placeholder="مثال: 35"><small class="fl-field-help">يظهر كـ «سعر القطاعي».</small></div>
          <div class="fl-cloud-field"><label>سعر الجملة (ر.س)</label><input id="flProdWholesalePrice" type="number" min="0" step="0.01" inputmode="decimal" value="${prod?.wholesale_price==null?'':esc(prod.wholesale_price)}" placeholder="مثال: 28"><small class="fl-field-help">اتركه فارغًا إذا لم يوجد سعر جملة.</small></div>
          <div class="fl-cloud-field"><label>سعر الجملة يبدأ من كمية</label><input id="flProdWholesaleMinQty" type="number" min="2" step="1" inputmode="numeric" value="${prod?.wholesale_min_qty==null?'':esc(prod.wholesale_min_qty)}" placeholder="مثال: 10"><small class="fl-field-help">مثال: 10 = سعر الجملة من 10 قطع فأكثر.</small></div>
          <label class="fl-cloud-check fl-limited-offer-check"><input id="flProdLimitedOffer" type="checkbox" ${prod?.limited_offer===true?'checked':''}> <span><strong>عرض لفترة محدودة</strong><small>عند تفعيله تظهر شارة على زاوية صورة المنتج.</small></span></label>
        </div>
      </section>
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
        const payload={
          category_id,
          name,
          model:document.getElementById('flProdModel').value.trim(),
          caption:document.getElementById('flProdCaption').value.trim(),
          specifications:collectProductSpecifications(),
          price:(()=>{const v=String(document.getElementById('flProdPrice')?.value||'').trim();return v===''?null:Number(v);})(),
          wholesale_price:(()=>{const v=String(document.getElementById('flProdWholesalePrice')?.value||'').trim();return v===''?null:Number(v);})(),
          wholesale_min_qty:(()=>{const v=String(document.getElementById('flProdWholesaleMinQty')?.value||'').trim();return v===''?null:Math.trunc(Number(v));})(),
          limited_offer:document.getElementById('flProdLimitedOffer')?.checked===true,
          sort_order:Number(document.getElementById('flProdSort').value)||0,
          is_visible:document.getElementById('flProdVisible').checked
        };
        if(payload.wholesale_min_qty!=null && (!Number.isFinite(payload.wholesale_min_qty) || payload.wholesale_min_qty<2)) throw new Error('أقل كمية للجملة يجب أن تكون 2 أو أكثر');
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
        if(galleryError) throw new Error((String(galleryError.code)==='PGRST202'||String(galleryError.code)==='42883') ? 'شغّل ملف PRODUCT_MANAGEMENT_STAGE8.sql في Supabase أولًا.' : (galleryError.message||galleryError));
        // From this point the database save is committed; a later UI refresh failure must not roll it back.
        saveCommitted=true;
        createdProductId='';

        const removedPaths=originalRows.map(row=>row.image_path).filter(path=>path && !imagePaths.includes(path) && isStoragePath(path));
        const safeToDelete=removedPaths.filter(path=>!storagePathUsedByOtherProduct(path,savedProduct.id));
        if(safeToDelete.length) await db.storage.from(bucket).remove([...new Set(safeToDelete)]);

        selectedCategory=category_id;
        cleanupPreviewUrls();closeModal();
        await refresh();await loadCloudProducts();renderProducts();notify(`تم حفظ المنتج (${imagePaths.length} صور)`);
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
    const removable=[...paths].filter(path=>isStoragePath(path) && !storagePathUsedByOtherProduct(path,p.id));
    const {error}=await db.from('products').delete().eq('id',id);
    if(error){notify('تعذر الحذف: '+error.message);return;}
    if(removable.length) await db.storage.from(bucket).remove(removable);
    await refresh();await loadCloudProducts();renderProducts();notify('تم حذف المنتج وصوره');
  }

  (async()=>{
    if(!configured || !db){renderSetup();return;}
    const session=await getSession();
    if(!session){renderLogin();return;}
    try{
      await loadCurrentAdminAccess();
      await refresh();renderApp();
    }catch(err){
      await db.auth.signOut();
      renderLogin(err?.message||String(err));
    }
  })();
})();
