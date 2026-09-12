// Flower Light public Supabase integration.
// Loaded only on the normal public site (without ?admin=1 or ?admin=2).
// Powers public profile/products, customer lead gate and Supabase analytics.

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
  const isProductAdmin = adminPanel === '2';
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
      ['source','category','panel_id','product_name','product_category','product_model','product_reference','direction','method','label','branch','products_count','failed_images','request_code','quantity'].forEach(key=>{
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
  const customerProfileKey = 'flower_light_customer_profile_v1';
  const saveCustomerProfile = profile => {
    try {
      const previous=JSON.parse(localStorage.getItem(customerProfileKey)||'{}')||{};
      const has=(key)=>Object.prototype.hasOwnProperty.call(profile||{},key);
      localStorage.setItem(customerProfileKey, JSON.stringify({
        full_name:String(has('full_name')?profile.full_name:(previous.full_name||'')).slice(0,120),
        company_name:String(has('company_name')?profile.company_name:(previous.company_name||'')).slice(0,120),
        mobile:String(has('mobile')?profile.mobile:(previous.mobile||'')).slice(0,30)
      }));
    } catch (_) {}
  };
  const EMPTY_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="#f2f4f8"/><path d="M210 525l115-125 82 83 85-105 110 147H210z" fill="#c8d0dc"/><circle cx="310" cy="300" r="55" fill="#d8dee7"/><text x="400" y="650" text-anchor="middle" font-family="Arial" font-size="34" fill="#7b8598">No image</text></svg>')}`;
  const isExternalImage = value => /^(https?:|data:|blob:)/i.test(String(value || '').trim());
  const isStoragePath = value => Boolean(value) && !isExternalImage(value);

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
    if(note) note.textContent=(brand||company)?`استعرض أقسام ومنتجات ${brand||company}.`:'استعرض الأقسام والمنتجات.';

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

  async function compressQuoteRequestImage(file){
    if(!(file instanceof Blob)) throw new Error('اختر صورة صالحة للطلب.');
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')) throw new Error('صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP.');
    if(file.size > 10*1024*1024) throw new Error('حجم الصورة أكبر من 10MB.');
    const url=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error('تعذر قراءة الصورة.'));
        img.src=url;
      });
      const maxSide=1800;
      const scale=Math.min(1,maxSide/Math.max(image.naturalWidth||image.width||1,image.naturalHeight||image.height||1));
      const width=Math.max(1,Math.round((image.naturalWidth||image.width||1)*scale));
      const height=Math.max(1,Math.round((image.naturalHeight||image.height||1)*scale));
      const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx) throw new Error('تعذر تجهيز الصورة.');
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,width,height); ctx.drawImage(image,0,0,width,height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));
      if(!blob) throw new Error('تعذر ضغط الصورة.');
      if(blob.size > 4*1024*1024) throw new Error('الصورة ما زالت كبيرة بعد الضغط. جرّب صورة أوضح بحجم أصغر.');
      return blob;
    }finally{URL.revokeObjectURL(url);}
  }

  window.flSubmitImageQuoteRequest=async function flSubmitImageQuoteRequest(payload={}){
    if(!db) throw new Error('تعذر الاتصال بخدمة الطلبات.');
    const file=payload.file;
    const customer_type=payload.customer_type==='company'?'company':'individual';
    const full_name=String(payload.full_name||'').trim();
    const company_name=customer_type==='company'?String(payload.company_name||'').trim():'';
    const mobile=String(payload.mobile||'').trim();
    const notes=String(payload.notes||'').trim().slice(0,500);
    const digits=leadPhoneDigits(mobile);
    if(full_name.length<2 || full_name.length>120) throw new Error('اكتب الاسم بشكل صحيح.');
    if(customer_type==='company' && (company_name.length<2 || company_name.length>120)) throw new Error('اكتب اسم الشركة، أو اختر «طلب فردي».');
    if(digits.length<9 || digits.length>15) throw new Error('اكتب رقم جوال صحيح.');
    const blob=await compressQuoteRequestImage(file);
    const uuid=crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const month=new Date().toISOString().slice(0,7);
    const image_path=`incoming/${month}/${uuid}.webp`;
    const {error:uploadError}=await db.storage.from(quoteBucket).upload(image_path,blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'});
    if(uploadError) throw new Error(`تعذر رفع صورة الطلب: ${uploadError.message||uploadError}`);
    const {data,error}=await db.from('quote_requests').insert({
      request_type:'image',customer_type,full_name,company_name,mobile,notes,image_path,
      original_filename:String(file?.name||'quote-image').slice(0,180),status:'new'
    }).select('id,request_code,created_at').single();
    if(error) throw new Error(`تم رفع الصورة لكن تعذر تسجيل الطلب: ${error.message||error}`);
    saveCustomerProfile(customer_type==='company'?{full_name,company_name,mobile}:{full_name,mobile});
    return data||{};
  };

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
      saveCustomerProfile({full_name,company_name,mobile});
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


})();
