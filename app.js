// Flower Light public application
// Extracted from index.html without changing runtime behavior.

// Google Analytics 4 configuration for Flower Light.
// Replace G-XXXXXXXXXX with the Measurement ID from your GA4 Web data stream.
window.FLOWER_LIGHT_ANALYTICS_CONFIG = {
  measurementId: 'G-XXXXXXXXXX',
  debug: false
};

(() => {
  'use strict';

  const config = window.FLOWER_LIGHT_ANALYTICS_CONFIG || {};
  const measurementId = String(config.measurementId || '').trim();
  const validMeasurementId = /^G-[A-Z0-9]+$/i.test(measurementId) && measurementId.toUpperCase() !== 'G-XXXXXXXXXX';

  // Always expose a safe tracking function so the rest of the site never breaks
  // if Analytics is not configured or is blocked by the browser.
  window.flTrack = function flTrack(eventName, params = {}) {
    if (!eventName) return;
    if (!validMeasurementId || typeof window.gtag !== 'function') {
      if (config.debug) console.info('[Flower Light analytics]', eventName, params);
      return;
    }
    try {
      window.gtag('event', eventName, {
        ...params,
        transport_type: 'beacon'
      });
    } catch (error) {
      if (config.debug) console.warn('[Flower Light analytics] event failed', error);
    }
  };

  if (!validMeasurementId) {
    if (config.debug) console.info('[Flower Light analytics] Add a GA4 Measurement ID in FLOWER_LIGHT_ANALYTICS_CONFIG');
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.referrerPolicy = 'strict-origin-when-cross-origin';
  document.head.appendChild(script);

})();

// Product/catalog data. Add, remove, or reorder items here without editing index.html.
window.FLOWER_LIGHT_PRODUCTS = { catalog: [], chandeliers: [], balfon: [], extraSections: [] };

(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));


  function trackEvent(eventName, params = {}) {
    if (typeof window.flTrack === 'function') window.flTrack(eventName, params);
  }

  function analyticsProductParams(item, extra = {}) {
    return {
      product_name: productDisplayName(item),
      product_category: item?.category || (String(item?.caption || '').startsWith('صفحة') ? 'الكتالوج' : 'غير مصنف'),
      product_model: item?.model || '',
      product_reference: item?.caption || '',
      ...extra
    };
  }

  function productDisplayName(item) {
    return item?.name || item?.caption || item?.alt || 'منتج';
  }

  const PRODUCT_SPEC_LABELS = {
    sku: 'كود المنتج',
    wattage: 'القدرة',
    lumens: 'اللومن',
    cct: 'حرارة اللون',
    cri: 'CRI',
    voltage: 'الفولت',
    ip_rating: 'درجة الحماية',
    dimensions: 'المقاس',
    color: 'اللون',
    material: 'الخامة',
    beam_angle: 'زاوية الإضاءة',
    frequency: 'التردد',
    warranty: 'الضمان',
    bulb_base: 'قاعدة اللمبة',
    bulb_count: 'عدد اللمبات'
  };

  function normalizeProductSpecifications(raw) {
    let rows = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && typeof raw === 'object') {
      rows = Object.entries(raw).map(([key, value]) => ({ key, value }));
    }
    return rows.map((row, index) => {
      if (!row || typeof row !== 'object') return null;
      const key = String(row.key || `custom_${index + 1}`).trim();
      const label = String(row.label || PRODUCT_SPEC_LABELS[key] || key).trim();
      const value = String(row.value ?? '').trim();
      const unit = String(row.unit || '').trim();
      if (!label || !value) return null;
      return { key, label, value, unit };
    }).filter(Boolean).slice(0, 30);
  }

  function productSpecifications(item) {
    return normalizeProductSpecifications(item?.specifications);
  }

  function specificationDisplayValue(spec) {
    return `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`.trim();
  }

  function productSpecsText(item, limit = 5) {
    return productSpecifications(item)
      .slice(0, limit)
      .map(spec => `${spec.label}: ${specificationDisplayValue(spec)}`);
  }

  function createProductSpecsElement(item, { compact = false, limit = compact ? 4 : 30 } = {}) {
    const specs = productSpecifications(item).slice(0, limit);
    if (!specs.length) return null;
    const wrap = document.createElement('div');
    wrap.className = compact ? 'product-specs product-specs-compact' : 'product-specs';
    specs.forEach(spec => {
      const row = document.createElement('div');
      row.className = 'product-spec';
      const label = document.createElement('span');
      label.className = 'product-spec-label';
      label.textContent = spec.label;
      const value = document.createElement('strong');
      value.className = 'product-spec-value';
      value.textContent = specificationDisplayValue(spec);
      row.append(label, value);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function normalizeWhatsAppNumber(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
    if (/^5\d{8}$/.test(digits)) return `966${digits}`;
    if (/^96605\d{8}$/.test(digits)) return `966${digits.slice(4)}`;
    return digits;
  }
  window.flNormalizeWhatsAppNumber = normalizeWhatsAppNumber;

  function primaryWhatsAppNumber() {
    const list = Array.isArray(window.FLOWER_LIGHT_CONTACTS) ? window.FLOWER_LIGHT_CONTACTS : [];
    const value = list.find(item => item?.type === 'whatsapp' && item?.is_visible !== false)?.value || '';
    return normalizeWhatsAppNumber(value);
  }

  function productWhatsAppMessage(item) {
    const profile = window.FLOWER_LIGHT_PROFILE || {};
    const brand = profile.brand_name || profile.company_name || '';
    const lines = [
      brand ? `السلام عليكم، أريد الاستفسار عن منتج من ${brand}:` : 'السلام عليكم، أريد الاستفسار عن منتج:',
      `المنتج: ${productDisplayName(item)}`
    ];
    if (item?.model) lines.push(`الموديل: ${item.model}`);
    else if (item?.category) lines.push(`المرجع: ${item.caption || productDisplayName(item)}`);
    const specLines = productSpecsText(item, 5);
    if (specLines.length) {
      lines.push('المواصفات:');
      specLines.forEach(line => lines.push(`• ${line}`));
    }
    lines.push('هل يمكن تزويدي بالتفاصيل والسعر؟');
    return lines.join('\n');
  }

  function productWhatsAppUrl(item) {
    const number = primaryWhatsAppNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(productWhatsAppMessage(item))}` : '#';
  }

  function isAdminUrl() {
    const panel = new URLSearchParams(window.location.search).get('admin');
    return panel === '1' || panel === '2';
  }

  function buildPublicShareUrl(params = {}) {
    const url = new URL(window.location.href);
    url.hash = '';
    ['admin','category','product'].forEach(key => url.searchParams.delete(key));
    Object.entries(params).forEach(([key, value]) => {
      const clean = String(value || '').trim();
      if (clean) url.searchParams.set(key, clean);
    });
    return url.toString();
  }

  function categoryKey(section) {
    return String(section?.slug || section?.id || '').trim();
  }

  function categoryShareUrl(section) {
    return buildPublicShareUrl({ category: categoryKey(section) });
  }

  function productShareUrl(item) {
    return buildPublicShareUrl({ product: item?.id || '' });
  }

  async function copyText(value) {
    const text = String(value || '');
    if (!text) return false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function shareLink({ title = '', text = '', url = '', copiedMessage = 'تم نسخ الرابط' } = {}) {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    const copied = await copyText(url);
    showPublicToast(copied ? copiedMessage : 'تعذر النسخ. انسخ الرابط من شريط العنوان.');
  }

  function shareIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.9 7.5-4.5M8.2 13.1l7.5 4.5"></path></svg>`;
  }

  function createProductShareButton(item) {
    const button = document.createElement('button');
    button.className = 'product-share-button';
    button.type = 'button';
    button.setAttribute('aria-label', `مشاركة ${productDisplayName(item)}`);
    button.innerHTML = `${shareIconSvg()}<span>مشاركة المنتج</span>`;
    button.addEventListener('click', async () => {
      await shareLink({
        title: productDisplayName(item),
        text: item?.model ? `${productDisplayName(item)} - ${item.model}` : productDisplayName(item),
        url: productShareUrl(item),
        copiedMessage: 'تم نسخ رابط المنتج'
      });
    });
    return button;
  }

  function createCategoryShareButton(section) {
    const button = document.createElement('button');
    button.className = 'category-share-button';
    button.type = 'button';
    button.setAttribute('aria-label', `مشاركة قسم ${section?.name || 'المنتجات'}`);
    button.innerHTML = `${shareIconSvg()}<span>مشاركة القسم</span>`;
    button.addEventListener('click', async () => {
      await shareLink({
        title: section?.name || 'قسم المنتجات',
        text: `منتجات قسم ${section?.name || 'المنتجات'}`,
        url: categoryShareUrl(section),
        copiedMessage: 'تم نسخ رابط القسم'
      });
    });
    return button;
  }

  function createProductQuoteButton(item) {
    const button = document.createElement('button');
    button.className = 'product-quote-button';
    button.type = 'button';
    button.dataset.quoteAdd = String(item?.id || '');
    button.setAttribute('aria-label', `أضف ${productDisplayName(item)} إلى طلب عرض السعر`);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h5"></path><path d="M18 16v5M15.5 18.5h5"></path></svg><span>أضف لطلب السعر</span>`;
    button.addEventListener('click', () => addQuoteProduct(item));
    return button;
  }

  function createProductWhatsAppLink(item, className = 'product-whatsapp-button') {
    const link = document.createElement('a');
    link.className = className;
    const whatsAppUrl = productWhatsAppUrl(item);
    link.href = whatsAppUrl;
    link.hidden = whatsAppUrl === '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `استفسار واتساب عن ${productDisplayName(item)}${item?.model ? ` موديل ${item.model}` : ''}`);
    link.addEventListener('click', () => {
      trackEvent('product_whatsapp_click', analyticsProductParams(item, { source: 'product_card' }));
    });
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.9 6.988c-.002 5.45-4.436 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.055 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.689 1.448h.005c6.557 0 11.893-5.335 11.896-11.893a11.82 11.82 0 0 0-3.488-8.413Z"></path>
      </svg>
      <span>استفسار عبر واتساب</span>
    `;
    return link;
  }

  function normalizedProductGallery(item) {
    const rows = Array.isArray(item?.gallery) ? item.gallery : [];
    const result = [];
    const seen = new Set();
    const add = (image, imagePath = '') => {
      const src = String(image || '').trim();
      const path = String(imagePath || '').trim();
      const key = path || src;
      if (!src || !key || seen.has(key) || result.length >= 4) return;
      seen.add(key);
      result.push({ image: src, image_path: path });
    };
    add(item?.image, item?.image_path);
    rows.forEach(row => add(row?.image, row?.image_path));
    return result;
  }

  function createZoomButton(item, imageLoading = 'lazy', collection = [item], index = 0) {
    const button = document.createElement('button');
    button.className = 'product-image-button';
    button.type = 'button';
    const gallery = normalizedProductGallery(item);
    button.setAttribute('aria-label', gallery.length > 1
      ? `فتح ${gallery.length} صور لـ ${item.caption || item.alt || 'المنتج'}`
      : `تكبير صورة ${item.caption || item.alt || 'المنتج'}`);

    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.alt;
    image.loading = imageLoading;

    const badge = document.createElement('span');
    badge.className = 'image-zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path><path d="M11 8v6M8 11h6"></path></svg>';

    button.append(image, badge);
    if (gallery.length > 1) {
      const galleryCount = document.createElement('span');
      galleryCount.className = 'product-gallery-count';
      galleryCount.textContent = `${gallery.length} صور`;
      galleryCount.setAttribute('aria-hidden', 'true');
      button.appendChild(galleryCount);
    }
    button.addEventListener('click', () => openImageLightbox(item, button, collection, index));
    return button;
  }

  function createProductCard(item, type, collection, index) {
    const figure = document.createElement('figure');
    figure.className = `${type}-card`;

    const thumb = document.createElement('div');
    thumb.className = `${type}-thumb`;

    const imageButton = createZoomButton(item, 'lazy', collection, index);

    const caption = document.createElement('figcaption');
    caption.textContent = item.caption;

    const specs = createProductSpecsElement(item, { compact: true, limit: 4 });
    const quoteButton = createProductQuoteButton(item);
    const whatsappLink = createProductWhatsAppLink(item);
    const shareButton = createProductShareButton(item);
    const actions = document.createElement('div');
    actions.className = 'product-card-actions';
    actions.append(quoteButton, whatsappLink, shareButton);

    thumb.appendChild(imageButton);
    figure.append(thumb, caption);
    if (specs) figure.appendChild(specs);
    figure.appendChild(actions);
    return figure;
  }

  function renderExtraSections(data) {
    const tabsHost = $('.catalog-tabs');
    const sheet = $('.catalog-sheet');
    const empty = $('#dynamicCatalogEmpty');
    if (!tabsHost || !sheet) return;

    tabsHost.replaceChildren();
    $$('.extra-section-panel', sheet).forEach((node) => node.remove());

    const sections = Array.isArray(data.extraSections) ? data.extraSections : [];
    if (empty) empty.style.display = sections.length ? 'none' : 'block';

    sections.forEach((section, sectionIndex) => {
      const safeId = `extraSectionPanel${sectionIndex}`;
      const tab = document.createElement('button');
      tab.className = `catalog-tab extra-section-tab${sectionIndex===0?' active':''}`;
      tab.type = 'button';
      tab.dataset.target = safeId;
      tab.dataset.categoryKey = categoryKey(section);
      tab.setAttribute('aria-pressed', sectionIndex===0 ? 'true' : 'false');
      tab.innerHTML = `<strong></strong><small></small>`;
      tab.querySelector('strong').textContent = section.name || 'قسم';
      tab.querySelector('small').textContent = `${Array.isArray(section.items) ? section.items.length : 0} منتج`;
      tab.addEventListener('click', () => {
        setCatalogPanel(safeId);
        updatePublicUrl({ category: categoryKey(section) });
        trackEvent('product_category_view', { category: section.name || 'قسم', panel_id: safeId });
      });
      tabsHost.appendChild(tab);

      const panel = document.createElement('section');
      panel.className = `catalog-panel extra-section-panel${sectionIndex===0?' active':''}`;
      panel.id = safeId;

      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'extra-section-head';

      const intro = document.createElement('p');
      intro.className = 'extra-section-intro';
      intro.textContent = section.description || `منتجات قسم ${section.name || 'القسم'}`;

      const categoryShareButton = createCategoryShareButton(section);
      sectionHeader.append(intro, categoryShareButton);

      const grid = document.createElement('div');
      grid.className = 'extra-section-grid';
      grid.dir = 'rtl';
      const items = Array.isArray(section.items) ? section.items : [];
      const fragment = document.createDocumentFragment();
      items.forEach((item, index) => fragment.appendChild(createProductCard(item, 'chandelier', items, index)));
      grid.appendChild(fragment);
      panel.append(sectionHeader, grid);
      sheet.appendChild(panel);
    });
  }

  const catalogDownloadPdf = $('#catalogDownloadPdf');
  const catalogDownloadPdfLabel = $('#catalogDownloadPdfLabel');
  let catalogPdfBusy = false;
  let publicToastTimer = 0;

  function showPublicToast(message, duration = 3000) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(publicToastTimer);
    publicToastTimer = window.setTimeout(() => toast.classList.remove('show'), duration);
  }

  // -------------------------------------------------------------------------
  // Multi-product quotation cart + handwritten/paper quotation image request.
  // -------------------------------------------------------------------------
  const QUOTE_CART_KEY = 'flower_light_quote_cart_v1';
  const CUSTOMER_PROFILE_KEY = 'flower_light_customer_profile_v1';
  let quoteCart = loadQuoteCart();
  let quoteLastFocus = null;
  let paperQuoteLastFocus = null;
  let paperQuotePreviewUrl = '';

  const quoteModal = $('#quoteModal');
  const quoteList = $('#quoteList');
  const quoteEmpty = $('#quoteEmpty');
  const quoteCartCount = $('#quoteCartCount');
  const quoteUniqueCount = $('#quoteUniqueCount');
  const quoteTotalQuantity = $('#quoteTotalQuantity');
  const openQuoteCartButton = $('#openQuoteCart');
  const closeQuoteCartButton = $('#closeQuoteCart');
  const quoteSendWhatsApp = $('#quoteSendWhatsApp');
  const quoteClearButton = $('#quoteClear');
  const quoteCustomerError = $('#quoteCustomerError');

  const paperQuoteModal = $('#paperQuoteModal');
  const openPaperQuoteButton = $('#openPaperQuote');
  const closePaperQuoteButton = $('#closePaperQuote');
  const paperQuoteForm = $('#paperQuoteForm');
  const paperQuoteFile = $('#paperQuoteFile');
  const paperQuotePreview = $('#paperQuotePreview');
  const paperQuoteUploadCopy = $('#paperQuoteUploadCopy');
  const paperQuoteError = $('#paperQuoteError');
  const paperQuoteSubmit = $('#paperQuoteSubmit');

  function loadQuoteCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(QUOTE_CART_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.map(row => ({ id: String(row?.id || ''), qty: Math.min(9999, Math.max(1, Number(row?.qty) || 1)) })).filter(row => row.id);
    } catch (_) { return []; }
  }

  function saveQuoteCart() {
    try { localStorage.setItem(QUOTE_CART_KEY, JSON.stringify(quoteCart)); } catch (_) {}
  }

  function customerProfile() {
    try {
      const value = JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) { return {}; }
  }

  function allPublicProducts() {
    const data = window.FLOWER_LIGHT_PRODUCTS || { extraSections: [] };
    const sections = Array.isArray(data.extraSections) ? data.extraSections : [];
    return sections.flatMap(section => (Array.isArray(section.items) ? section.items : []));
  }

  function quoteResolvedItems() {
    const products = allPublicProducts();
    if (!products.length) return [];
    const byId = new Map(products.map(item => [String(item?.id || ''), item]));
    let changed = false;
    const resolved = [];
    quoteCart.forEach(row => {
      const item = byId.get(row.id);
      if (!item) { changed = true; return; }
      resolved.push({ item, qty: Math.min(9999, Math.max(1, Number(row.qty) || 1)) });
    });
    if (changed) {
      quoteCart = resolved.map(row => ({ id: String(row.item.id), qty: row.qty }));
      saveQuoteCart();
    }
    return resolved;
  }

  function quoteHasProduct(id) {
    const key = String(id || '');
    return quoteCart.some(row => row.id === key);
  }

  function updateQuoteButtons() {
    $$('[data-quote-add]').forEach(button => {
      const added = quoteHasProduct(button.dataset.quoteAdd);
      button.classList.toggle('added', added);
      const label = button.querySelector('span');
      if (label) label.textContent = added ? 'مضاف للطلب ✓' : 'أضف لطلب السعر';
      button.setAttribute('aria-pressed', added ? 'true' : 'false');
    });
  }

  function updateQuoteBadge() {
    const rows = quoteResolvedItems();
    const productsLoaded = allPublicProducts().length > 0;
    const unique = productsLoaded ? rows.length : quoteCart.length;
    const total = productsLoaded ? rows.reduce((sum, row) => sum + row.qty, 0) : quoteCart.reduce((sum, row) => sum + (Number(row.qty)||1), 0);
    if (quoteCartCount) quoteCartCount.textContent = String(unique);
    if (quoteUniqueCount) quoteUniqueCount.textContent = String(unique);
    if (quoteTotalQuantity) quoteTotalQuantity.textContent = String(total);
    if (quoteSendWhatsApp) quoteSendWhatsApp.disabled = unique === 0;
    if (quoteClearButton) quoteClearButton.disabled = unique === 0;
    updateQuoteButtons();
  }

  function addQuoteProduct(item) {
    if (!item?.id) return;
    const id = String(item.id);
    const existing = quoteCart.find(row => row.id === id);
    if (existing) {
      openQuoteCart();
      return;
    }
    quoteCart.push({ id, qty: 1 });
    saveQuoteCart();
    updateQuoteBadge();
    renderQuoteCart();
    showPublicToast('تمت إضافة المنتج إلى طلب عرض السعر');
    trackEvent('quote_cart_add', analyticsProductParams(item, { source: 'product_card' }));
  }

  function setQuoteQuantity(id, qty) {
    const row = quoteCart.find(item => item.id === String(id));
    if (!row) return;
    row.qty = Math.min(9999, Math.max(1, Number(qty) || 1));
    saveQuoteCart();
    renderQuoteCart();
  }

  function removeQuoteProduct(id) {
    quoteCart = quoteCart.filter(row => row.id !== String(id));
    saveQuoteCart();
    renderQuoteCart();
    updateQuoteBadge();
  }

  function renderQuoteCart() {
    if (!quoteList) return;
    const rows = quoteResolvedItems();
    quoteList.replaceChildren();
    if (quoteEmpty) quoteEmpty.hidden = rows.length > 0;
    rows.forEach(({ item, qty }) => {
      const row = document.createElement('article');
      row.className = 'quote-item';
      const image = document.createElement('img');
      image.src = item.image || '';
      image.alt = item.alt || productDisplayName(item);
      image.loading = 'lazy';
      const meta = document.createElement('div');
      meta.className = 'quote-item-meta';
      const name = document.createElement('strong');
      name.textContent = productDisplayName(item);
      const sub = document.createElement('small');
      sub.textContent = [item.category, item.model ? `موديل ${item.model}` : ''].filter(Boolean).join(' · ');
      meta.append(name, sub);
      const controls = document.createElement('div');
      controls.className = 'quote-item-controls';
      const minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'إنقاص الكمية');
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number'; qtyInput.min = '1'; qtyInput.max = '9999'; qtyInput.inputMode = 'numeric'; qtyInput.value = String(qty); qtyInput.setAttribute('aria-label', 'الكمية');
      const plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'زيادة الكمية');
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'quote-item-remove'; remove.textContent = 'حذف';
      minus.addEventListener('click', () => setQuoteQuantity(item.id, qty - 1));
      plus.addEventListener('click', () => setQuoteQuantity(item.id, qty + 1));
      qtyInput.addEventListener('change', () => setQuoteQuantity(item.id, qtyInput.value));
      remove.addEventListener('click', () => removeQuoteProduct(item.id));
      controls.append(minus, qtyInput, plus, remove);
      row.append(image, meta, controls);
      quoteList.appendChild(row);
    });
    updateQuoteBadge();
  }

  function quoteTypeRadioName(prefix) {
    return prefix === 'paperQuote' ? 'paperQuoteCustomerType' : 'quoteCustomerType';
  }

  function selectedQuoteCustomerType(prefix = 'quoteCustomer') {
    const name = quoteTypeRadioName(prefix);
    return document.querySelector(`input[name="${name}"]:checked`)?.value === 'company' ? 'company' : 'individual';
  }

  function syncQuoteCompanyField(prefix = 'quoteCustomer', preferredType = '') {
    const radioName = quoteTypeRadioName(prefix);
    if (preferredType) {
      const wanted = document.querySelector(`input[name="${radioName}"][value="${preferredType}"]`);
      if (wanted) wanted.checked = true;
    }
    const type = selectedQuoteCustomerType(prefix);
    const wrap = $(`#${prefix}CompanyWrap`);
    const company = $(`#${prefix}Company`);
    if (wrap) wrap.hidden = type !== 'company';
    if (company) company.required = type === 'company';
    return type;
  }

  function fillQuoteCustomerFields(prefix = 'quoteCustomer') {
    const p = customerProfile();
    const name = $(`#${prefix}Name`), company = $(`#${prefix}Company`), mobile = $(`#${prefix}Mobile`);
    if (name && !name.value) name.value = p.full_name || '';
    if (company && !company.value) company.value = p.company_name || '';
    if (mobile && !mobile.value) mobile.value = p.mobile || '';
    syncQuoteCompanyField(prefix, (p.company_name || '').trim() ? 'company' : selectedQuoteCustomerType(prefix));
  }

  function quoteCustomerValues(prefix = 'quoteCustomer') {
    const customer_type = selectedQuoteCustomerType(prefix);
    const full_name = $(`#${prefix}Name`)?.value.trim() || '';
    const rawCompany = $(`#${prefix}Company`)?.value.trim() || '';
    const company_name = customer_type === 'company' ? rawCompany : '';
    const mobile = $(`#${prefix}Mobile`)?.value.trim() || '';
    return { customer_type, full_name, company_name, mobile };
  }

  function validateQuoteCustomer(prefix = 'quoteCustomer') {
    const values = quoteCustomerValues(prefix);
    const digits = values.mobile.replace(/\D/g,'');
    if (values.full_name.length < 2 || values.full_name.length > 120) return { ok:false, message:'اكتب الاسم بشكل صحيح.', field:$(`#${prefix}Name`) };
    if (digits.length < 9 || digits.length > 15) return { ok:false, message:'اكتب رقم جوال صحيح.', field:$(`#${prefix}Mobile`) };
    if (values.customer_type === 'company' && (values.company_name.length < 2 || values.company_name.length > 120)) {
      return { ok:false, message:'اكتب اسم الشركة، أو اختر «طلب فردي».', field:$(`#${prefix}Company`) };
    }
    return { ok:true, values };
  }

  ['quoteCustomerType','paperQuoteCustomerType'].forEach(name => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
      input.addEventListener('change', () => {
        syncQuoteCompanyField(name === 'paperQuoteCustomerType' ? 'paperQuote' : 'quoteCustomer');
        if (name === 'quoteCustomerType' && quoteCustomerError) {
          quoteCustomerError.textContent = '';
          quoteCustomerError.classList.remove('show');
        }
      });
    });
  });
  syncQuoteCompanyField('quoteCustomer');
  syncQuoteCompanyField('paperQuote');

  function openQuoteCart() {
    if (!quoteModal) return;
    quoteLastFocus = document.activeElement;
    fillQuoteCustomerFields('quoteCustomer');
    if (quoteCustomerError) { quoteCustomerError.textContent = ''; quoteCustomerError.classList.remove('show'); }
    renderQuoteCart();
    quoteModal.classList.add('open');
    quoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quote-open');
    trackEvent('quote_cart_open', { products_count: quoteResolvedItems().length });
    window.setTimeout(() => closeQuoteCartButton?.focus(), 0);
  }

  function closeQuoteCart() {
    if (!quoteModal?.classList.contains('open')) return;
    quoteModal.classList.remove('open');
    quoteModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quote-open');
    if (quoteLastFocus && typeof quoteLastFocus.focus === 'function') quoteLastFocus.focus();
  }

  function quoteCartMessage() {
    const rows = quoteResolvedItems();
    const profile = window.FLOWER_LIGHT_PROFILE || {};
    const brand = profile.brand_name || profile.company_name || 'Flower Light';
    const customer = quoteCustomerValues('quoteCustomer');
    const name = customer.full_name;
    const company = customer.company_name;
    const mobile = customer.mobile;
    const notes = $('#quoteCustomerNotes')?.value.trim() || '';
    const lines = [`السلام عليكم، أطلب عرض سعر من ${brand} للمنتجات التالية:`, ''];
    rows.forEach(({ item, qty }, index) => {
      lines.push(`${index + 1}) ${productDisplayName(item)}`);
      if (item.model) lines.push(`الموديل: ${item.model}`);
      lines.push(`الكمية: ${qty}`);
      const specs = productSpecsText(item, 3);
      if (specs.length) lines.push(...specs.map(spec => `• ${spec}`));
      lines.push(`الرابط: ${productShareUrl(item)}`, '');
    });
    lines.push('بيانات العميل:');
    lines.push(`الاسم: ${name}`);
    lines.push(`الجوال: ${mobile}`);
    lines.push(`نوع الطلب: ${customer.customer_type === 'company' ? 'باسم شركة' : 'طلب فردي'}`);
    if (company) lines.push(`الشركة: ${company}`);
    if (notes) lines.push(`ملاحظات: ${notes}`);
    lines.push('', 'يرجى تزويدي بالأسعار والتوفر.');
    return lines.join('\n');
  }

  openQuoteCartButton?.addEventListener('click', openQuoteCart);
  closeQuoteCartButton?.addEventListener('click', closeQuoteCart);
  quoteModal?.addEventListener('click', event => { if (event.target === quoteModal) closeQuoteCart(); });
  quoteClearButton?.addEventListener('click', () => {
    if (!quoteCart.length) return;
    quoteCart = []; saveQuoteCart(); renderQuoteCart(); showPublicToast('تم تفريغ طلب عرض السعر');
  });
  quoteSendWhatsApp?.addEventListener('click', () => {
    const rows = quoteResolvedItems();
    if (!rows.length) return;
    const validation = validateQuoteCustomer('quoteCustomer');
    if (!validation.ok) {
      if (quoteCustomerError) { quoteCustomerError.textContent = validation.message; quoteCustomerError.classList.add('show'); }
      validation.field?.focus();
      return;
    }
    if (quoteCustomerError) { quoteCustomerError.textContent = ''; quoteCustomerError.classList.remove('show'); }
    const number = primaryWhatsAppNumber();
    if (!number) { showPublicToast('رقم واتساب غير متوفر حاليًا'); return; }
    trackEvent('quote_whatsapp_submit', {
      products_count: rows.length,
      quantity: rows.reduce((s, row) => s + row.qty, 0),
      customer_type: validation.values.customer_type
    });
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(quoteCartMessage())}`, '_blank', 'noopener,noreferrer');
  });

  function revokePaperPreview() {
    if (paperQuotePreviewUrl) { URL.revokeObjectURL(paperQuotePreviewUrl); paperQuotePreviewUrl = ''; }
  }

  function openPaperQuote() {
    if (!paperQuoteModal) return;
    paperQuoteLastFocus = document.activeElement;
    fillQuoteCustomerFields('paperQuote');
    if (paperQuoteError) { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
    paperQuoteModal.classList.add('open');
    paperQuoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('paper-quote-open');
    trackEvent('quote_image_open', { source: 'public_card' });
    window.setTimeout(() => paperQuoteFile?.focus(), 0);
  }

  function closePaperQuote() {
    if (!paperQuoteModal?.classList.contains('open')) return;
    paperQuoteModal.classList.remove('open');
    paperQuoteModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('paper-quote-open');
    if (paperQuoteLastFocus && typeof paperQuoteLastFocus.focus === 'function') paperQuoteLastFocus.focus();
  }

  openPaperQuoteButton?.addEventListener('click', openPaperQuote);
  closePaperQuoteButton?.addEventListener('click', closePaperQuote);
  paperQuoteModal?.addEventListener('click', event => { if (event.target === paperQuoteModal) closePaperQuote(); });
  paperQuoteFile?.addEventListener('change', () => {
    revokePaperPreview();
    const file = paperQuoteFile.files?.[0];
    if (!file) {
      paperQuotePreview?.setAttribute('hidden','');
      paperQuoteUploadCopy?.removeAttribute('hidden');
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || '') || file.size > 10 * 1024 * 1024) {
      paperQuoteFile.value = '';
      if (paperQuoteError) { paperQuoteError.textContent = 'اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 10MB.'; paperQuoteError.classList.add('show'); }
      return;
    }
    paperQuotePreviewUrl = URL.createObjectURL(file);
    if (paperQuotePreview) { paperQuotePreview.src = paperQuotePreviewUrl; paperQuotePreview.hidden = false; }
    if (paperQuoteUploadCopy) paperQuoteUploadCopy.hidden = true;
    if (paperQuoteError) { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
  });

  paperQuoteForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const file = paperQuoteFile?.files?.[0];
    const customerValidation = validateQuoteCustomer('paperQuote');
    const customer = customerValidation.values || quoteCustomerValues('paperQuote');
    const customer_type = customer.customer_type;
    const full_name = customer.full_name;
    const company_name = customer.company_name;
    const mobile = customer.mobile;
    const notes = $('#paperQuoteNotes')?.value.trim() || '';
    const fail = message => { if (paperQuoteError) { paperQuoteError.textContent = message; paperQuoteError.classList.add('show'); } };
    if (!file) return fail('التقط صورة الطلب أو اختر صورة من الجهاز.');
    if (!customerValidation.ok) { customerValidation.field?.focus(); return fail(customerValidation.message); }
    if (typeof window.flSubmitImageQuoteRequest !== 'function') return fail('خدمة رفع الطلب غير جاهزة. أعد تحميل الصفحة وحاول مرة أخرى.');
    if (paperQuoteError) { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
    const oldLabel = paperQuoteSubmit?.textContent || 'رفع الطلب والمتابعة إلى واتساب';
    if (paperQuoteSubmit) { paperQuoteSubmit.disabled = true; paperQuoteSubmit.textContent = 'جاري ضغط الصورة ورفع الطلب…'; }
    try {
      const result = await window.flSubmitImageQuoteRequest({ file, customer_type, full_name, company_name, mobile, notes });
      const code = result?.request_code || result?.id || '';
      trackEvent('quote_image_submit', { request_code: code, source: 'paper_quote' });
      showPublicToast(`تم رفع طلبك بنجاح${code ? ` · ${code}` : ''}`, 4500);
      const number = primaryWhatsAppNumber();
      paperQuoteForm.reset(); syncQuoteCompanyField('paperQuote','individual'); revokePaperPreview();
      if (paperQuotePreview) { paperQuotePreview.hidden = true; paperQuotePreview.removeAttribute('src'); }
      if (paperQuoteUploadCopy) paperQuoteUploadCopy.hidden = false;
      closePaperQuote();
      if (number) {
        const msg = [
          'السلام عليكم، رفعت صورة طلب عرض سعر من الموقع.',
          code ? `رقم الطلب: ${code}` : '',
          `الاسم: ${full_name}`,
          `الجوال: ${mobile}`,
          `نوع الطلب: ${customer_type === 'company' ? 'باسم شركة' : 'طلب فردي'}`,
          company_name ? `الشركة: ${company_name}` : '',
          notes ? `ملاحظات: ${notes}` : '',
          'الصورة محفوظة داخل لوحة الإدارة.'
        ].filter(Boolean).join('\n');
        window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
      }
    } catch (error) {
      console.warn('[Quote image] submit failed', error);
      fail(error?.message || 'تعذر رفع الطلب الآن. تحقق من الاتصال وحاول مرة أخرى.');
    } finally {
      if (paperQuoteSubmit) { paperQuoteSubmit.disabled = false; paperQuoteSubmit.textContent = oldLabel; }
    }
  });

  updateQuoteBadge();

  function catalogPdfEntries() {
    const data = window.FLOWER_LIGHT_PRODUCTS || {extraSections:[]};
    const sections = Array.isArray(data.extraSections) ? data.extraSections : [];
    return sections.flatMap(section => {
      const items = Array.isArray(section.items) ? section.items : [];
      return items.filter(item => item?.image).map(item => ({ section, item }));
    });
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return y;
    const lines = [];
    let line = '';
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) line = test;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = `${last}…`;
    }
    visible.forEach((part, index) => ctx.fillText(part, x, y + index * lineHeight, maxWidth));
    return y + visible.length * lineHeight;
  }

  async function loadCatalogPdfImage(src) {
    const response = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = objectUrl;
      });
      return { image, objectUrl };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  async function createCatalogPdfPage(section, item, pageNumber, totalPages) {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1414;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#ff9f0a';
    ctx.fillRect(0, 0, canvas.width, 16);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8a5400';
    ctx.font = '700 30px Tajawal, Arial, sans-serif';
    ctx.fillText(String(section?.name || 'القسم'), 930, 72, 870);
    ctx.fillStyle = '#171717';
    ctx.font = '800 42px Tajawal, Arial, sans-serif';
    wrapCanvasText(ctx, productDisplayName(item), 930, 124, 870, 48, 2);

    // Product image area
    const box = { x: 65, y: 205, w: 870, h: 780 };
    ctx.fillStyle = '#f7f6f3';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    let imageFailed = false;
    try {
      const loaded = await loadCatalogPdfImage(item.image);
      try {
        const img = loaded.image;
        const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
        const width = Math.max(1, img.naturalWidth * scale);
        const height = Math.max(1, img.naturalHeight * scale);
        const x = box.x + (box.w - width) / 2;
        const y = box.y + (box.h - height) / 2;
        ctx.drawImage(img, x, y, width, height);
      } finally {
        URL.revokeObjectURL(loaded.objectUrl);
      }
    } catch (error) {
      imageFailed = true;
      ctx.fillStyle = '#8a8178';
      ctx.font = '600 28px Tajawal, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('تعذر تحميل صورة هذا المنتج', canvas.width / 2, box.y + box.h / 2);
      ctx.textAlign = 'right';
    }

    // Product details
    let detailY = 1045;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    if (item?.model) {
      ctx.fillStyle = '#5d554c';
      ctx.font = '600 26px Tajawal, Arial, sans-serif';
      ctx.fillText(`الموديل: ${String(item.model)}`, 930, detailY, 870);
      detailY += 42;
    }
    if (item?.caption) {
      ctx.fillStyle = '#5d554c';
      ctx.font = '500 24px Tajawal, Arial, sans-serif';
      detailY = wrapCanvasText(ctx, item.caption, 930, detailY, 870, 34, 2);
    }

    const specs = productSpecifications(item).slice(0, 7);
    if (specs.length) {
      detailY += 12;
      ctx.fillStyle = '#8a5400';
      ctx.font = '700 22px Tajawal, Arial, sans-serif';
      ctx.fillText('المواصفات', 930, detailY, 870);
      detailY += 32;
      ctx.fillStyle = '#4f4942';
      ctx.font = '500 20px Tajawal, Arial, sans-serif';
      specs.forEach(spec => {
        if (detailY > 1300) return;
        ctx.fillText(`${spec.label}: ${specificationDisplayValue(spec)}`, 930, detailY, 870);
        detailY += 27;
      });
    }

    // Footer / page number
    ctx.strokeStyle = '#eee8df';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, 1338);
    ctx.lineTo(935, 1338);
    ctx.stroke();
    ctx.fillStyle = '#9a9188';
    ctx.font = '500 20px Tajawal, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(`${pageNumber} / ${totalPages}`, 65, 1378);
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    const profile = window.FLOWER_LIGHT_PROFILE || {};
    const brand = String(profile.brand_name || profile.company_name || 'Flower Light').trim();
    ctx.fillText(brand, 935, 1378, 600);

    return { canvas, imageFailed };
  }

  const JSPDF_CDN_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  let jsPdfLoadPromise = null;

  function loadJsPdfOnDemand() {
    if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfLoadPromise) return jsPdfLoadPromise;

    jsPdfLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-fl-jspdf]');
      const finish = () => {
        const JsPdf = window.jspdf?.jsPDF;
        if (JsPdf) resolve(JsPdf);
        else reject(new Error('jsPDF loaded but the constructor is unavailable.'));
      };
      const fail = () => reject(new Error('Unable to load jsPDF from CDN.'));

      if (existing) {
        existing.addEventListener('load', finish, { once: true });
        existing.addEventListener('error', fail, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = JSPDF_CDN_URL;
      script.async = true;
      script.dataset.flJspdf = '1';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      document.head.appendChild(script);
    }).catch(error => {
      jsPdfLoadPromise = null;
      document.querySelector('script[data-fl-jspdf]')?.remove();
      throw error;
    });

    return jsPdfLoadPromise;
  }

  async function downloadCatalogPdf() {
    if (catalogPdfBusy) return;
    const entries = catalogPdfEntries();
    if (!entries.length) {
      showPublicToast('لا توجد منتجات ظاهرة لإضافتها إلى الكتالوج.');
      return;
    }
    catalogPdfBusy = true;
    if (catalogDownloadPdf) catalogDownloadPdf.disabled = true;
    const originalLabel = catalogDownloadPdfLabel?.textContent || 'تحميل الكتالوج PDF';
    let failedImages = 0;
    try {
      if (catalogDownloadPdfLabel) catalogDownloadPdfLabel.textContent = 'جاري تحميل أداة PDF…';
      const JsPdf = await loadJsPdfOnDemand();
      try {
        await document.fonts?.load('800 42px Tajawal');
        await document.fonts?.load('500 24px Tajawal');
      } catch (_) {}

      const pdf = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      for (let index = 0; index < entries.length; index += 1) {
        if (catalogDownloadPdfLabel) catalogDownloadPdfLabel.textContent = `جاري التجهيز ${index + 1}/${entries.length}`;
        const { section, item } = entries[index];
        const { canvas, imageFailed } = await createCatalogPdfPage(section, item, index + 1, entries.length);
        if (imageFailed) failedImages += 1;
        if (index > 0) pdf.addPage('a4', 'portrait');
        const pageImage = canvas.toDataURL('image/jpeg', 0.80);
        pdf.addImage(pageImage, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        await new Promise(resolve => window.requestAnimationFrame(resolve));
      }

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flower-light-catalog.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackEvent('catalog_download', { label: 'كتالوج المنتجات PDF', products_count: entries.length, failed_images: failedImages });
      showPublicToast(failedImages ? `تم تجهيز الكتالوج، وتعذر إدراج ${failedImages} صورة.` : `تم تحميل الكتالوج: ${entries.length} منتج.` , 4200);
    } catch (error) {
      console.warn('[Catalog PDF] generation failed', error);
      showPublicToast('تعذر تجهيز ملف PDF. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      catalogPdfBusy = false;
      if (catalogDownloadPdfLabel) catalogDownloadPdfLabel.textContent = originalLabel;
      if (catalogDownloadPdf) catalogDownloadPdf.disabled = catalogPdfEntries().length === 0;
    }
  }

  catalogDownloadPdf?.addEventListener('click', downloadCatalogPdf);

  function renderProducts() {
    const data = window.FLOWER_LIGHT_PRODUCTS || {extraSections:[]};
    renderExtraSections(data);
    if (catalogDownloadPdf) catalogDownloadPdf.disabled = catalogPdfBusy || catalogPdfEntries().length === 0;
    updateQuoteBadge();
    if (quoteModal?.classList.contains('open')) renderQuoteCart();
    scheduleDeepLinkResolution();
  }

  window.flRenderProducts = renderProducts;


  const imageLightbox = $('#imageLightbox');
  const imageLightboxImage = $('#imageLightboxImage');
  const imageLightboxCaption = $('#imageLightboxCaption');
  const imageLightboxSpecs = $('#imageLightboxSpecs');
  const imageLightboxCounter = $('#imageLightboxCounter');
  const imageLightboxWhatsApp = $('#imageLightboxWhatsApp');
  const imageLightboxQuoteAdd = $('#imageLightboxQuoteAdd');
  const imageLightboxShare = $('#imageLightboxShare');
  const imageLightboxStage = $('#imageLightboxStage');
  const closeImageLightboxButton = $('#closeImageLightbox');
  const prevImageLightboxButton = $('#imageLightboxPrev');
  const nextImageLightboxButton = $('#imageLightboxNext');
  let lightboxLastFocus = null;
  let lightboxProducts = [];
  let lightboxProductIndex = 0;
  let lightboxImageIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function normalizeLightboxProductIndex(index) {
    if (!lightboxProducts.length) return 0;
    return (index + lightboxProducts.length) % lightboxProducts.length;
  }

  function currentLightboxProduct() {
    return lightboxProducts[normalizeLightboxProductIndex(lightboxProductIndex)] || null;
  }

  function currentLightboxGallery() {
    const product = currentLightboxProduct();
    return product ? normalizedProductGallery(product) : [];
  }

  function lightboxNavigationAvailable() {
    return lightboxProducts.length > 1 || currentLightboxGallery().length > 1;
  }

  function neighborLightboxImage(direction) {
    if (!lightboxProducts.length) return '';
    let pIndex = lightboxProductIndex;
    let iIndex = lightboxImageIndex;
    let gallery = normalizedProductGallery(lightboxProducts[pIndex]);
    if (direction > 0) {
      if (iIndex < gallery.length - 1) iIndex += 1;
      else {
        pIndex = normalizeLightboxProductIndex(pIndex + 1);
        gallery = normalizedProductGallery(lightboxProducts[pIndex]);
        iIndex = 0;
      }
    } else {
      if (iIndex > 0) iIndex -= 1;
      else {
        pIndex = normalizeLightboxProductIndex(pIndex - 1);
        gallery = normalizedProductGallery(lightboxProducts[pIndex]);
        iIndex = Math.max(0, gallery.length - 1);
      }
    }
    return gallery[iIndex]?.image || '';
  }

  function preloadLightboxNeighbors() {
    if (!lightboxNavigationAvailable()) return;
    [neighborLightboxImage(-1), neighborLightboxImage(1)].forEach(src => {
      if (!src) return;
      const image = new Image();
      image.src = src;
    });
  }

  function showLightboxState(direction = 0) {
    if (!imageLightboxImage || !lightboxProducts.length) return;
    lightboxProductIndex = normalizeLightboxProductIndex(lightboxProductIndex);
    const item = currentLightboxProduct();
    const gallery = currentLightboxGallery();
    if (!item || !gallery.length) return;
    lightboxImageIndex = Math.min(Math.max(0, lightboxImageIndex), gallery.length - 1);
    const galleryImage = gallery[lightboxImageIndex];

    if (direction) {
      imageLightboxImage.classList.remove('slide-from-left', 'slide-from-right');
      void imageLightboxImage.offsetWidth;
      imageLightboxImage.classList.add(direction > 0 ? 'slide-from-right' : 'slide-from-left');
    }

    imageLightboxImage.src = galleryImage.image;
    imageLightboxImage.alt = item.alt || item.caption || 'صورة المنتج';
    if (imageLightboxCaption) imageLightboxCaption.textContent = item.caption || item.alt || '';
    if (imageLightboxSpecs) {
      const specsElement = createProductSpecsElement(item, { compact: false, limit: 30 });
      imageLightboxSpecs.replaceChildren(...(specsElement ? Array.from(specsElement.childNodes) : []));
      imageLightboxSpecs.hidden = !specsElement;
    }
    if (imageLightboxCounter) {
      const imagePart = gallery.length > 1 ? `صورة ${lightboxImageIndex + 1} / ${gallery.length}` : '';
      const productPart = lightboxProducts.length > 1 ? `منتج ${lightboxProductIndex + 1} / ${lightboxProducts.length}` : '';
      imageLightboxCounter.textContent = [imagePart, productPart].filter(Boolean).join(' · ') || '1 / 1';
    }

    const isProduct = Boolean(item?.id && (item?.category || item?.model || item?.name));
    if (imageLightboxWhatsApp) {
      const hasWhatsApp = Boolean(primaryWhatsAppNumber());
      imageLightboxWhatsApp.hidden = !(isProduct && hasWhatsApp);
      if (isProduct && hasWhatsApp) {
        imageLightboxWhatsApp.href = productWhatsAppUrl(item);
        imageLightboxWhatsApp.setAttribute('aria-label', `استفسار واتساب عن ${productDisplayName(item)}${item?.model ? ` موديل ${item.model}` : ''}`);
      }
    }
    if (imageLightboxQuoteAdd) {
      imageLightboxQuoteAdd.hidden = !isProduct;
      if (isProduct) {
        imageLightboxQuoteAdd.dataset.quoteAdd = String(item.id || '');
        const added = quoteHasProduct(item.id);
        imageLightboxQuoteAdd.classList.toggle('added', added);
        const quoteLabel = imageLightboxQuoteAdd.querySelector('span');
        if (quoteLabel) quoteLabel.textContent = added ? 'مضاف للطلب ✓' : 'أضف لطلب السعر';
      }
    }
    if (imageLightboxShare) {
      imageLightboxShare.hidden = !isProduct;
      if (isProduct) imageLightboxShare.setAttribute('aria-label', `مشاركة ${productDisplayName(item)}`);
    }
    if (isProduct) updatePublicUrl({ product: item.id });

    const hasMultiple = lightboxNavigationAvailable();
    prevImageLightboxButton?.toggleAttribute('hidden', !hasMultiple);
    nextImageLightboxButton?.toggleAttribute('hidden', !hasMultiple);
    preloadLightboxNeighbors();
  }

  function openImageLightbox(item, trigger, collection = [item], index = 0) {
    if (!imageLightbox || !imageLightboxImage) return;
    trackEvent('product_image_open', analyticsProductParams(item));
    lightboxLastFocus = trigger || document.activeElement;
    lightboxProducts = (Array.isArray(collection) && collection.length ? collection : [item]).filter(product => product?.image);
    let exactIndex = lightboxProducts.indexOf(item);
    if (exactIndex < 0 && item?.id) exactIndex = lightboxProducts.findIndex(product => product?.id === item.id);
    lightboxProductIndex = exactIndex >= 0 ? exactIndex : Math.min(Math.max(0,index),Math.max(0,lightboxProducts.length-1));
    lightboxImageIndex = 0;
    showLightboxState();
    imageLightbox.classList.add('open');
    imageLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('image-lightbox-open');
    window.setTimeout(() => closeImageLightboxButton?.focus(), 0);
  }

  function showPreviousLightboxItem(method = 'button_or_keyboard') {
    if (!lightboxNavigationAvailable()) return;
    let gallery = currentLightboxGallery();
    if (lightboxImageIndex > 0) {
      lightboxImageIndex -= 1;
    } else {
      lightboxProductIndex = normalizeLightboxProductIndex(lightboxProductIndex - 1);
      gallery = currentLightboxGallery();
      lightboxImageIndex = Math.max(0, gallery.length - 1);
    }
    showLightboxState(-1);
    const item = currentLightboxProduct();
    if (item) trackEvent('product_gallery_navigation', analyticsProductParams(item, { direction: 'previous', method }));
  }

  function showNextLightboxItem(method = 'button_or_keyboard') {
    if (!lightboxNavigationAvailable()) return;
    const gallery = currentLightboxGallery();
    if (lightboxImageIndex < gallery.length - 1) {
      lightboxImageIndex += 1;
    } else {
      lightboxProductIndex = normalizeLightboxProductIndex(lightboxProductIndex + 1);
      lightboxImageIndex = 0;
    }
    showLightboxState(1);
    const item = currentLightboxProduct();
    if (item) trackEvent('product_gallery_navigation', analyticsProductParams(item, { direction: 'next', method }));
  }

  function closeImageLightbox() {
    if (!imageLightbox?.classList.contains('open')) return;
    const currentItem = currentLightboxProduct();
    imageLightbox.classList.remove('open');
    imageLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('image-lightbox-open');
    imageLightboxImage?.removeAttribute('src');
    imageLightboxImage?.classList.remove('slide-from-left', 'slide-from-right');
    lightboxProducts = [];
    lightboxProductIndex = 0;
    lightboxImageIndex = 0;
    if (catalogModal?.classList.contains('open') && currentItem?.category_slug) {
      updatePublicUrl({ category: currentItem.category_slug });
    } else if (!catalogModal?.classList.contains('open')) {
      updatePublicUrl({});
    }
    if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') lightboxLastFocus.focus();
  }

  if (closeImageLightboxButton) closeImageLightboxButton.addEventListener('click', closeImageLightbox);
  prevImageLightboxButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    showPreviousLightboxItem('button');
  });
  nextImageLightboxButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    showNextLightboxItem('button');
  });

  imageLightboxWhatsApp?.addEventListener('click', () => {
    const item = currentLightboxProduct();
    if (item) trackEvent('product_whatsapp_click', analyticsProductParams(item, { source: 'image_lightbox' }));
  });

  imageLightboxQuoteAdd?.addEventListener('click', () => {
    const item = currentLightboxProduct();
    if (item) addQuoteProduct(item);
    showLightboxState();
  });

  imageLightboxShare?.addEventListener('click', async () => {
    const item = currentLightboxProduct();
    if (!item?.id) return;
    await shareLink({
      title: productDisplayName(item),
      text: item?.model ? `${productDisplayName(item)} - ${item.model}` : productDisplayName(item),
      url: productShareUrl(item),
      copiedMessage: 'تم نسخ رابط المنتج'
    });
  });

  if (imageLightbox) {
    imageLightbox.addEventListener('click', (event) => {
      if (event.target === imageLightbox) closeImageLightbox();
    });
  }

  if (imageLightboxStage) {
    imageLightboxStage.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    imageLightboxStage.addEventListener('touchend', (event) => {
      if (!event.changedTouches.length || !lightboxNavigationAvailable()) return;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      const deltaY = event.changedTouches[0].clientY - touchStartY;
      const horizontalSwipe = Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15;
      if (!horizontalSwipe) return;
      if (deltaX < 0) showNextLightboxItem('swipe');
      else showPreviousLightboxItem('swipe');
    }, { passive: true });
  }

  const catalogModal = $('#catalogModal');
  const openProducts = $('#openProducts');
  const closeProducts = $('#closeProducts');
  let catalogLastFocus = null;

  let deepLinkTimer = 0;
  let deepLinkBusy = false;
  let lastAutoDeepLink = '';

  function updatePublicUrl(params = {}) {
    if (isAdminUrl()) return;
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('category');
    url.searchParams.delete('product');
    Object.entries(params).forEach(([key, value]) => {
      const clean = String(value || '').trim();
      if (clean) url.searchParams.set(key, clean);
    });
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function resolveDeepLinkTarget() {
    if (isAdminUrl()) return null;
    const params = new URLSearchParams(window.location.search);
    const productId = String(params.get('product') || '').trim();
    const categoryToken = String(params.get('category') || '').trim();
    if (!productId && !categoryToken) return null;

    const data = window.FLOWER_LIGHT_PRODUCTS || { extraSections: [] };
    const sections = Array.isArray(data.extraSections) ? data.extraSections : [];
    if (!sections.length) return null;

    if (productId) {
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
        const section = sections[sectionIndex];
        const items = Array.isArray(section.items) ? section.items : [];
        const itemIndex = items.findIndex(item => String(item?.id || '') === productId);
        if (itemIndex >= 0) {
          return {
            kind: 'product',
            key: `product:${productId}`,
            panelId: `extraSectionPanel${sectionIndex}`,
            section,
            items,
            item: items[itemIndex],
            itemIndex
          };
        }
      }
      return null;
    }

    const sectionIndex = sections.findIndex(section => {
      const slug = String(section?.slug || '');
      const id = String(section?.id || '');
      return slug === categoryToken || id === categoryToken;
    });
    if (sectionIndex < 0) return null;
    const section = sections[sectionIndex];
    return {
      kind: 'category',
      key: `category:${categoryToken}`,
      panelId: `extraSectionPanel${sectionIndex}`,
      section,
      items: Array.isArray(section.items) ? section.items : []
    };
  }

  async function ensureProductsAccess() {
    if (typeof window.flBeforeProductsOpen !== 'function') return true;
    try {
      return Boolean(await window.flBeforeProductsOpen());
    } catch (error) {
      console.warn('[Site] Products access check failed.', error);
      return false;
    }
  }

  async function openCatalogToPanel(panelId = '', source = 'button') {
    if (!catalogModal) return false;
    const allowed = await ensureProductsAccess();
    if (!allowed) return false;

    catalogLastFocus = document.activeElement;
    const targetTab = panelId
      ? $$('.catalog-tab').find(tab => tab.dataset.target === panelId)
      : $('.catalog-tab');
    if (targetTab?.dataset.target) {
      setCatalogPanel(targetTab.dataset.target);
      const key = targetTab.dataset.categoryKey;
      if (key) updatePublicUrl({ category: key });
    }
    catalogModal.classList.add('open');
    catalogModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('catalog-open');
    trackEvent('products_open', source === 'deep_link' ? { source: 'deep_link' } : {});
    window.setTimeout(() => closeProducts?.focus(), 0);
    return true;
  }

  async function openResolvedDeepLink(target, automatic = false) {
    if (!target || deepLinkBusy) return false;
    deepLinkBusy = true;
    try {
      const opened = await openCatalogToPanel(target.panelId, automatic ? 'deep_link' : 'button');
      if (!opened) return false;
      if (target.kind === 'product' && target.item) {
        openImageLightbox(target.item, null, target.items, target.itemIndex);
      }
      return true;
    } finally {
      deepLinkBusy = false;
    }
  }

  function scheduleDeepLinkResolution() {
    if (isAdminUrl()) return;
    window.clearTimeout(deepLinkTimer);
    deepLinkTimer = window.setTimeout(async () => {
      const target = resolveDeepLinkTarget();
      if (!target || target.key === lastAutoDeepLink) return;
      const opened = await openResolvedDeepLink(target, true);
      if (opened) lastAutoDeepLink = target.key;
    }, 40);
  }

  function setCatalogPanel(panelId) {
    const tabs = $$('.catalog-tab');
    const panels = $$('.catalog-panel', catalogModal || document);
    tabs.forEach(tab => {
      const active = tab.dataset.target === panelId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    panels.forEach(panel => panel.classList.toggle('active', panel.id === panelId));
  }

  async function openCatalog() {
    const target = resolveDeepLinkTarget();
    if (target) {
      await openResolvedDeepLink(target, false);
      return;
    }
    await openCatalogToPanel('', 'button');
  }

  function closeCatalog() {
    if (!catalogModal?.classList.contains('open')) return;
    catalogModal.classList.remove('open');
    catalogModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('catalog-open');
    updatePublicUrl({});
    lastAutoDeepLink = '';
    if (catalogLastFocus && typeof catalogLastFocus.focus === 'function') catalogLastFocus.focus();
  }

  openProducts?.addEventListener('click', () => openCatalog());
  closeProducts?.addEventListener('click', closeCatalog);
  catalogModal?.addEventListener('click', event => {
    if (event.target === catalogModal) closeCatalog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (paperQuoteModal?.classList.contains('open')) closePaperQuote();
      else if (quoteModal?.classList.contains('open')) closeQuoteCart();
      else if (imageLightbox?.classList.contains('open')) closeImageLightbox();
      else if (catalogModal?.classList.contains('open')) closeCatalog();
    }
  });

  renderProducts();
})();
