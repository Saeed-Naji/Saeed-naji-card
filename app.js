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

  function customerServiceEnabled(serviceKey) {
    const profile = window.FLOWER_LIGHT_PROFILE || {};
    if (serviceKey === 'quote_request') return profile.quote_service_visible !== false;
    return false;
  }


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

  function validPriceNumber(value) {
    if (value == null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  function formatPriceNumber(value) {
    const number = validPriceNumber(value);
    if (number == null) return '';
    return `${number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;
  }

  function productPriceNumber(item) {
    return validPriceNumber(item?.price);
  }

  function productPriceText(item) {
    return formatPriceNumber(item?.price);
  }

  function productWholesalePriceNumber(item) {
    return validPriceNumber(item?.wholesale_price);
  }

  function productWholesalePriceText(item) {
    return formatPriceNumber(item?.wholesale_price);
  }

  function productWholesaleMinQty(item) {
    if (item?.wholesale_min_qty == null || item?.wholesale_min_qty === '') return null;
    const qty = Math.trunc(Number(item.wholesale_min_qty));
    return Number.isFinite(qty) && qty >= 2 ? qty : null;
  }

  function productPricingLines(item) {
    const lines = [];
    const retail = productPriceText(item);
    const wholesale = productWholesalePriceText(item);
    const minQty = productWholesaleMinQty(item);
    if (retail) lines.push({ key: 'retail', label: 'سعر القطاعي', value: retail, note: '' });
    if (wholesale) lines.push({
      key: 'wholesale',
      label: 'سعر الجملة',
      value: wholesale,
      note: minQty ? `من ${minQty.toLocaleString('en-US')} قطع فأكثر` : ''
    });
    return lines;
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
      return { key, label, value, unit, quote: row.quote === true };
    }).filter(Boolean).slice(0, 30);
  }

  function productSpecifications(item) {
    return normalizeProductSpecifications(item?.specifications);
  }

  function specificationDisplayValue(spec) {
    return `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`.trim();
  }

  function productSpecsText(item, limit = 5, { quoteOnly = false } = {}) {
    const specs = productSpecifications(item).filter(spec => !quoteOnly || spec.quote === true);
    return specs
      .slice(0, limit)
      .map(spec => `${spec.label}: ${specificationDisplayValue(spec)}`);
  }

  function createProductSpecsElement(item, { compact = false, limit = 30 } = {}) {
    const specs = productSpecifications(item).slice(0, limit);
    if (!specs.length) return null;

    if (compact) {
      const section = document.createElement('section');
      section.className = 'product-specs-carousel';
      section.setAttribute('aria-label', 'المواصفات الفنية');

      const head = document.createElement('div');
      head.className = 'product-specs-carousel-head';

      const title = document.createElement('strong');
      title.textContent = 'المواصفات الفنية';

      const nav = document.createElement('div');
      nav.className = 'product-specs-carousel-nav';
      nav.dir = 'ltr';

      // The strip starts beside the Arabic heading on the right. The left arrow
      // advances through the information toward the opposite side.
      const forward = document.createElement('button');
      forward.type = 'button';
      forward.className = 'product-specs-nav-button forward';
      forward.setAttribute('aria-label', 'المعلومة التالية');
      forward.textContent = '‹';

      const count = document.createElement('span');
      count.className = 'product-specs-count';
      count.textContent = `${specs.length} معلومات`;

      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'product-specs-nav-button back';
      back.setAttribute('aria-label', 'المعلومة السابقة');
      back.textContent = '›';

      nav.append(forward, count, back);
      head.append(title, nav);

      const track = document.createElement('div');
      track.className = 'product-specs-track';
      track.dir = 'rtl';

      specs.forEach(spec => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'product-spec product-spec-slide';
        row.setAttribute('aria-label', `${spec.label}: ${specificationDisplayValue(spec)}`);

        const label = document.createElement('span');
        label.className = 'product-spec-label';
        label.textContent = spec.label;

        const value = document.createElement('strong');
        value.className = 'product-spec-value';
        value.textContent = specificationDisplayValue(spec);

        row.append(label, value);
        track.appendChild(row);
      });

      const cards = [...track.querySelectorAll('.product-spec-slide')];
      let activeIndex = 0;
      let syncTimer = 0;

      const updateButtons = () => {
        back.disabled = activeIndex <= 0;
        forward.disabled = activeIndex >= cards.length - 1;
      };
      const goTo = (index, behavior = 'smooth') => {
        if (!cards.length) return;
        activeIndex = Math.min(Math.max(0, index), cards.length - 1);
        cards[activeIndex].scrollIntoView({ behavior, block: 'nearest', inline: activeIndex === 0 ? 'start' : 'center' });
        updateButtons();
      };
      const syncIndexFromScroll = () => {
        if (!cards.length) return;
        const trackRect = track.getBoundingClientRect();
        // In RTL, information starts at the right edge beside the heading.
        const targetX = trackRect.right - Math.min(70, trackRect.width * .18);
        let best = 0;
        let distance = Infinity;
        cards.forEach((card, index) => {
          const rect = card.getBoundingClientRect();
          const cardX = rect.right;
          const d = Math.abs(cardX - targetX);
          if (d < distance) { distance = d; best = index; }
        });
        activeIndex = best;
        updateButtons();
      };

      cards.forEach((row, index) => row.addEventListener('click', () => goTo(index)));
      forward.addEventListener('click', () => goTo(activeIndex + 1));
      back.addEventListener('click', () => goTo(activeIndex - 1));
      track.addEventListener('scroll', () => {
        window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(syncIndexFromScroll, 80);
      }, { passive: true });

      window.requestAnimationFrame(() => goTo(0, 'auto'));

      // Native touch swipe works automatically. Add mouse/pen drag for desktop/tablet.
      let dragging = false;
      let dragStartX = 0;
      let dragStartScroll = 0;
      track.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || event.button !== 0) return;
        dragging = true;
        dragStartX = event.clientX;
        dragStartScroll = track.scrollLeft;
        track.classList.add('is-dragging');
        try { track.setPointerCapture(event.pointerId); } catch (_) {}
      });
      track.addEventListener('pointermove', event => {
        if (!dragging) return;
        event.preventDefault();
        // RTL scrollLeft is negative in modern browsers, hence the + sign here.
        track.scrollLeft = dragStartScroll + (event.clientX - dragStartX);
      });
      const finishDrag = event => {
        if (!dragging) return;
        dragging = false;
        track.classList.remove('is-dragging');
        syncIndexFromScroll();
        try { track.releasePointerCapture(event.pointerId); } catch (_) {}
      };
      track.addEventListener('pointerup', finishDrag);
      track.addEventListener('pointercancel', finishDrag);

      section.append(head, track);
      return section;
    }

    const wrap = document.createElement('div');
    wrap.className = 'product-specs';
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
    if (item?.model) lines.push(`رقم المنتج / الكود: ${item.model}`);
    const specLines = productSpecsText(item, 30, { quoteOnly: true });
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

  function productPdfIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"></path><path d="M14 3v5h5"></path><path d="M9 15h6M9 18h4"></path><path d="M12 10v3M9.8 11.7 12 13.8l2.2-2.1"></path></svg>`;
  }

  function createProductPdfButton(item) {
    const button = document.createElement('button');
    button.className = 'product-download-pdf-button';
    button.type = 'button';
    button.setAttribute('aria-label', `تحميل ${productDisplayName(item)} كملف PDF أو صورة JPG عالية الدقة`);
    button.innerHTML = `${productPdfIconSvg()}<span>تحميل</span>`;
    button.addEventListener('click', async () => {
      const choice = await askExportChoice({
        title: 'تحميل المنتج',
        subtitle: 'اختر تنزيل المنتج كملف PDF أو كصورة JPG عالية الدقة.',
        pdfLabel: 'تحميل PDF',
        jpgLabel: 'تحميل JPG'
      });
      if (choice === 'jpg') return downloadProductOverviewJpg(item, button);
      if (choice === 'pdf') return downloadProductOverviewPdf(item, button);
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
    button.hidden = !customerServiceEnabled('quote_request');
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
    link.setAttribute('aria-label', `استفسار واتساب عن ${productDisplayName(item)}${item?.model ? ` كود ${item.model}` : ''}`);
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
    if (item?.limited_offer === true) {
      const offerBadge = document.createElement('span');
      offerBadge.className = 'product-limited-offer-badge';
      offerBadge.textContent = 'عرض لفترة محدودة';
      offerBadge.setAttribute('aria-label', 'عرض لفترة محدودة');
      button.appendChild(offerBadge);
    }
    if (gallery.length > 1) {
      const galleryCount = document.createElement('span');
      galleryCount.className = 'product-gallery-count';
      galleryCount.textContent = `${gallery.length} صور`;
      galleryCount.setAttribute('aria-hidden', 'true');
      button.appendChild(galleryCount);
    }
    button.dataset.cardGalleryIndex = '0';
    button.addEventListener('click', () => {
      if (button.dataset.suppressOpen === '1') {
        delete button.dataset.suppressOpen;
        return;
      }
      const startImageIndex = Math.max(0, Number(button.dataset.cardGalleryIndex) || 0);
      openImageLightbox(item, button, collection, index, startImageIndex);
    });
    return button;
  }

  function attachProductCardGalleryNavigation(thumb, imageButton, item) {
    const gallery = normalizedProductGallery(item);
    if (!thumb || !imageButton || gallery.length <= 1) return;

    const image = imageButton.querySelector('img');
    const count = imageButton.querySelector('.product-gallery-count');
    if (!image) return;

    let activeIndex = Math.max(0, Math.min(gallery.length - 1, Number(imageButton.dataset.cardGalleryIndex) || 0));
    let touchStartX = 0;
    let touchStartY = 0;

    const updateImage = (nextIndex, direction = 0, method = 'card_button') => {
      activeIndex = (nextIndex + gallery.length) % gallery.length;
      const target = gallery[activeIndex];
      if (!target?.image) return;
      imageButton.dataset.cardGalleryIndex = String(activeIndex);
      image.src = target.image;
      if (count) count.textContent = `${activeIndex + 1} / ${gallery.length}`;
      image.classList.remove('card-slide-from-left','card-slide-from-right');
      void image.offsetWidth;
      if (direction < 0) image.classList.add('card-slide-from-left');
      if (direction > 0) image.classList.add('card-slide-from-right');
      trackEvent('product_gallery_navigation', analyticsProductParams(item, {
        direction: direction < 0 ? 'previous' : 'next',
        method
      }));
    };

    if (count) count.textContent = `1 / ${gallery.length}`;

    const makeNav = (side, label, delta, svgPath) => {
      const nav = document.createElement('button');
      nav.type = 'button';
      nav.className = `product-card-gallery-nav is-${side}`;
      nav.setAttribute('aria-label', label);
      nav.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${svgPath}"></path></svg>`;
      nav.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        updateImage(activeIndex + delta, delta, 'card_button');
      });
      return nav;
    };

    const prev = makeNav('left', 'الصورة السابقة', -1, 'M15 18l-6-6 6-6');
    const next = makeNav('right', 'الصورة التالية', 1, 'M9 18l6-6-6-6');
    thumb.append(prev, next);

    thumb.addEventListener('touchstart', event => {
      const touch = event.touches?.[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    thumb.addEventListener('touchend', event => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      imageButton.dataset.suppressOpen = '1';
      updateImage(activeIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1, 'card_swipe');
      window.setTimeout(() => { if (imageButton.dataset.suppressOpen === '1') delete imageButton.dataset.suppressOpen; }, 450);
    }, { passive: true });
  }

  function createProductCard(item, type, collection, index) {
    const figure = document.createElement('figure');
    figure.className = `${type}-card`;

    const thumb = document.createElement('div');
    thumb.className = `${type}-thumb`;

    const imageButton = createZoomButton(item, 'lazy', collection, index);
    thumb.appendChild(imageButton);
    attachProductCardGalleryNavigation(thumb, imageButton, item);
    figure.appendChild(thumb);

    const details = document.createElement('figcaption');
    details.className = 'product-card-info';

    if (item?.model) {
      const codeRow = document.createElement('div');
      codeRow.className = 'product-code-row';
      const label = document.createElement('span');
      label.textContent = 'رقم المنتج / الكود';
      const value = document.createElement('strong');
      value.textContent = String(item.model);
      codeRow.append(label, value);
      details.appendChild(codeRow);
    }

    if (item?.caption) {
      const description = document.createElement('p');
      description.className = 'product-description';
      description.textContent = item.caption;
      details.appendChild(description);
    }

    const pricingLines = productPricingLines(item);
    if (pricingLines.length) {
      const pricingBlock = document.createElement('div');
      pricingBlock.className = `product-pricing-block${item?.limited_offer===true?' is-offer':''}`;
      pricingLines.forEach(price => {
        const priceRow = document.createElement('div');
        priceRow.className = `product-price-row is-${price.key}`;
        const labelWrap = document.createElement('span');
        labelWrap.className = 'product-price-label';
        const label = document.createElement('b');
        label.textContent = price.label;
        labelWrap.appendChild(label);
        if (price.note) {
          const note = document.createElement('small');
          note.textContent = price.note;
          labelWrap.appendChild(note);
        }
        const value = document.createElement('strong');
        value.textContent = price.value;
        priceRow.append(labelWrap, value);
        pricingBlock.appendChild(priceRow);
      });
      details.appendChild(pricingBlock);
    }

    if (details.childNodes.length) figure.appendChild(details);

    // Show every filled specification. The strip supports arrow clicks,
    // tapping a specification to center it, touch swipe, and mouse drag.
    const specs = createProductSpecsElement(item, { compact: true, limit: 30 });
    if (specs) figure.appendChild(specs);

    const quoteButton = createProductQuoteButton(item);
    const pdfButton = createProductPdfButton(item);
    const whatsappLink = createProductWhatsAppLink(item);
    const shareButton = createProductShareButton(item);
    const actions = document.createElement('div');
    actions.className = 'product-card-actions';
    actions.append(quoteButton, pdfButton, whatsappLink, shareButton);
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
  const MAX_PAPER_QUOTE_ATTACHMENTS = 10;
  let paperQuoteAttachments = [];

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
  const paperQuoteCamera = $('#paperQuoteCamera');
  const paperQuoteFiles = $('#paperQuoteFiles');
  const paperQuoteAttachmentsHost = $('#paperQuoteAttachments');
  const paperQuoteAttachmentCount = $('#paperQuoteAttachmentCount');
  const paperQuoteError = $('#paperQuoteError');
  const paperQuoteSubmit = $('#paperQuoteSubmit');

  function applyCustomerServiceVisibility() {
    const quoteVisible = customerServiceEnabled('quote_request');
    document.documentElement.classList.toggle('quote-service-hidden', !quoteVisible);
    if (openPaperQuoteButton) openPaperQuoteButton.hidden = !quoteVisible;
    if (openQuoteCartButton) openQuoteCartButton.hidden = !quoteVisible;
    $$('[data-quote-add]').forEach(button => { button.hidden = !quoteVisible; });
    if (!quoteVisible) {
      closeQuoteCart();
      closePaperQuote();
    }
  }

  window.flApplyServiceVisibility = applyCustomerServiceVisibility;

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
    const quoteVisible = customerServiceEnabled('quote_request');
    $$('[data-quote-add]').forEach(button => {
      button.hidden = !quoteVisible;
      if (!quoteVisible) return;
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
    if (!customerServiceEnabled('quote_request')) return;
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
      sub.textContent = [item.category, item.model ? `كود ${item.model}` : ''].filter(Boolean).join(' · ');
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
    if (!customerServiceEnabled('quote_request')) return;
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
      if (item.model) lines.push(`رقم المنتج / الكود: ${item.model}`);
      lines.push(`الكمية: ${qty}`);
      const specs = productSpecsText(item, 30, { quoteOnly: true });
      if (specs.length) lines.push(...specs.map(spec => `• ${spec}`));
      lines.push('');
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

  function paperQuoteIsSupportedFile(file) {
    const type = String(file?.type || '').toLowerCase();
    const name = String(file?.name || '').toLowerCase();
    return /^image\/(jpeg|png|webp)$/.test(type) || type === 'application/pdf' || name.endsWith('.pdf');
  }

  function paperQuoteIsPdf(file) {
    const type = String(file?.type || '').toLowerCase();
    return type === 'application/pdf' || String(file?.name || '').toLowerCase().endsWith('.pdf');
  }

  function paperQuoteFileLimit(file) {
    return paperQuoteIsPdf(file) ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
  }

  function paperQuoteRevokeAttachment(entry) {
    if (entry?.previewUrl) {
      try { URL.revokeObjectURL(entry.previewUrl); } catch (_) {}
    }
  }

  function clearPaperQuoteAttachments() {
    paperQuoteAttachments.forEach(paperQuoteRevokeAttachment);
    paperQuoteAttachments = [];
    renderPaperQuoteAttachments();
    if (paperQuoteCamera) paperQuoteCamera.value = '';
    if (paperQuoteFiles) paperQuoteFiles.value = '';
  }

  function renderPaperQuoteAttachments() {
    if (!paperQuoteAttachmentsHost) return;
    paperQuoteAttachmentsHost.replaceChildren();
    paperQuoteAttachments.forEach((entry, index) => {
      const card = document.createElement('article');
      card.className = 'paper-quote-attachment';
      const isPdf = paperQuoteIsPdf(entry.file);
      if (isPdf) {
        const pdf = document.createElement('div');
        pdf.className = 'paper-quote-pdf-icon';
        pdf.innerHTML = '<strong>PDF</strong>';
        card.appendChild(pdf);
      } else {
        const img = document.createElement('img');
        img.src = entry.previewUrl;
        img.alt = `معاينة المرفق ${index + 1}`;
        card.appendChild(img);
      }
      const meta = document.createElement('div');
      meta.className = 'paper-quote-attachment-meta';
      const title = document.createElement('strong');
      title.textContent = isPdf ? `ملف PDF ${index + 1}` : `صورة ${index + 1}`;
      const name = document.createElement('small');
      name.textContent = entry.file?.name || (isPdf ? 'request.pdf' : `image-${index + 1}`);
      meta.append(title, name);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'paper-quote-attachment-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `حذف المرفق ${index + 1}`);
      remove.addEventListener('click', () => {
        const [deleted] = paperQuoteAttachments.splice(index, 1);
        paperQuoteRevokeAttachment(deleted);
        renderPaperQuoteAttachments();
      });
      card.append(meta, remove);
      paperQuoteAttachmentsHost.appendChild(card);
    });
    const count = paperQuoteAttachments.length;
    if (paperQuoteAttachmentCount) paperQuoteAttachmentCount.textContent = `${count} ${count === 1 ? 'مرفق' : 'مرفقات'} / ${MAX_PAPER_QUOTE_ATTACHMENTS}`;
    paperQuoteAttachmentsHost.classList.toggle('empty', count === 0);
    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'paper-quote-attachments-empty';
      empty.textContent = 'لم تتم إضافة صور أو ملفات بعد.';
      paperQuoteAttachmentsHost.appendChild(empty);
    }
  }

  function addPaperQuoteFiles(fileList) {
    const incoming = [...(fileList || [])];
    if (!incoming.length) return;
    const errors = [];
    for (const file of incoming) {
      if (paperQuoteAttachments.length >= MAX_PAPER_QUOTE_ATTACHMENTS) {
        errors.push(`الحد الأقصى ${MAX_PAPER_QUOTE_ATTACHMENTS} مرفقات.`);
        break;
      }
      if (!paperQuoteIsSupportedFile(file)) {
        errors.push(`الملف ${file.name || ''} غير مدعوم.`);
        continue;
      }
      if (file.size > paperQuoteFileLimit(file)) {
        errors.push(`${file.name || 'الملف'} أكبر من الحجم المسموح.`);
        continue;
      }
      const duplicate = paperQuoteAttachments.some(row => row.file?.name === file.name && row.file?.size === file.size && row.file?.lastModified === file.lastModified);
      if (duplicate) continue;
      paperQuoteAttachments.push({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: paperQuoteIsPdf(file) ? '' : URL.createObjectURL(file)
      });
    }
    renderPaperQuoteAttachments();
    if (paperQuoteError) {
      if (errors.length) { paperQuoteError.textContent = errors[0]; paperQuoteError.classList.add('show'); }
      else { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
    }
  }

  function openPaperQuote() {
    if (!customerServiceEnabled('quote_request')) return;
    if (!paperQuoteModal) return;
    paperQuoteLastFocus = document.activeElement;
    fillQuoteCustomerFields('paperQuote');
    if (paperQuoteError) { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
    renderPaperQuoteAttachments();
    paperQuoteModal.classList.add('open');
    paperQuoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('paper-quote-open');
    trackEvent('quote_image_open', { source: 'public_card' });
    window.setTimeout(() => paperQuoteCamera?.focus(), 0);
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
  paperQuoteCamera?.addEventListener('change', () => {
    addPaperQuoteFiles(paperQuoteCamera.files);
    paperQuoteCamera.value = '';
  });
  paperQuoteFiles?.addEventListener('change', () => {
    addPaperQuoteFiles(paperQuoteFiles.files);
    paperQuoteFiles.value = '';
  });

  paperQuoteForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const files = paperQuoteAttachments.map(row => row.file).filter(Boolean);
    const customerValidation = validateQuoteCustomer('paperQuote');
    const customer = customerValidation.values || quoteCustomerValues('paperQuote');
    const customer_type = customer.customer_type;
    const full_name = customer.full_name;
    const company_name = customer.company_name;
    const mobile = customer.mobile;
    const notes = $('#paperQuoteNotes')?.value.trim() || '';
    const fail = message => { if (paperQuoteError) { paperQuoteError.textContent = message; paperQuoteError.classList.add('show'); } };
    if (!files.length) return fail('التقط صورة واحدة على الأقل أو اختر صورًا / ملف PDF من الجهاز.');
    if (files.length > MAX_PAPER_QUOTE_ATTACHMENTS) return fail(`الحد الأقصى ${MAX_PAPER_QUOTE_ATTACHMENTS} مرفقات.`);
    if (!customerValidation.ok) { customerValidation.field?.focus(); return fail(customerValidation.message); }
    if (typeof window.flSubmitImageQuoteRequest !== 'function') return fail('خدمة رفع الطلب غير جاهزة. أعد تحميل الصفحة وحاول مرة أخرى.');
    if (paperQuoteError) { paperQuoteError.textContent = ''; paperQuoteError.classList.remove('show'); }
    const oldLabel = paperQuoteSubmit?.textContent || 'رفع المرفقات والمتابعة إلى واتساب';
    if (paperQuoteSubmit) { paperQuoteSubmit.disabled = true; paperQuoteSubmit.textContent = `جاري تجهيز ورفع ${files.length} ${files.length === 1 ? 'مرفق' : 'مرفقات'}…`; }
    try {
      const result = await window.flSubmitImageQuoteRequest({ files, customer_type, full_name, company_name, mobile, notes });
      const code = result?.request_code || result?.id || '';
      trackEvent('quote_image_submit', { request_code: code, source: 'paper_quote', attachments_count: files.length });
      showPublicToast(`تم رفع طلبك بنجاح${code ? ` · ${code}` : ''}`, 4500);
      const number = primaryWhatsAppNumber();
      paperQuoteForm.reset(); syncQuoteCompanyField('paperQuote','individual'); clearPaperQuoteAttachments();
      closePaperQuote();
      if (number) {
        const msg = [
          'السلام عليكم، رفعت طلب عرض سعر من الموقع.',
          code ? `رقم الطلب: ${code}` : '',
          `عدد المرفقات: ${files.length}`,
          `الاسم: ${full_name}`,
          `الجوال: ${mobile}`,
          `نوع الطلب: ${customer_type === 'company' ? 'باسم شركة' : 'طلب فردي'}`,
          company_name ? `الشركة: ${company_name}` : '',
          notes ? `ملاحظات: ${notes}` : '',
          'المرفقات محفوظة داخل لوحة الإدارة.'
        ].filter(Boolean).join('\n');
        window.location.href = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
      }
    } catch (error) {
      console.warn('[Quote attachments] submit failed', error);
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

  function canvasWrappedLines(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
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
    return visible;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const visible = canvasWrappedLines(ctx, text, maxWidth, maxLines);
    if (!visible.length) return y;
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

  const BASE_EXPORT_PAGE_WIDTH = 1000;
  const BASE_EXPORT_PAGE_HEIGHT = 1414;
  const PDF_EXPORT_SCALE = 2;
  const JPG_EXPORT_SCALE = 3;
  const PDF_IMAGE_QUALITY = 0.94;
  const JPG_IMAGE_QUALITY = 0.94;

  function createScaledExportCanvas(scale = 1) {
    const safeScale = Math.max(1, Number(scale) || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(BASE_EXPORT_PAGE_WIDTH * safeScale);
    canvas.height = Math.round(BASE_EXPORT_PAGE_HEIGHT * safeScale);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.setTransform(safeScale, 0, 0, safeScale, 0, 0);
    return { canvas, ctx, scale: safeScale };
  }

  function exportCanvasToBlob(canvas, type = 'image/jpeg', quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('تعذر تحويل التصميم إلى ملف.'));
      }, type, quality);
    });
  }

  function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function createCatalogPdfPage(section, item, pageNumber, totalPages, { scale = 1 } = {}) {
    const { canvas, ctx } = createScaledExportCanvas(scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BASE_EXPORT_PAGE_WIDTH, BASE_EXPORT_PAGE_HEIGHT);

    // Header
    ctx.fillStyle = '#ff9f0a';
    ctx.fillRect(0, 0, BASE_EXPORT_PAGE_WIDTH, 16);
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
      ctx.fillText('تعذر تحميل صورة هذا المنتج', BASE_EXPORT_PAGE_WIDTH / 2, box.y + box.h / 2);
      ctx.textAlign = 'right';
    }

    // Product details
    let detailY = 1045;
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    if (item?.model) {
      ctx.fillStyle = '#5d554c';
      ctx.font = '600 26px Tajawal, Arial, sans-serif';
      ctx.fillText(`رقم المنتج / الكود: ${String(item.model)}`, 930, detailY, 870);
      detailY += 42;
    }
    if (item?.caption) {
      ctx.fillStyle = '#5d554c';
      ctx.font = '500 24px Tajawal, Arial, sans-serif';
      detailY = wrapCanvasText(ctx, item.caption, 930, detailY, 870, 34, 2);
    }
    const pricingLines = productPricingLines(item);
    if (pricingLines.length) {
      detailY += 12;
      ctx.fillStyle = item?.limited_offer===true ? '#c23a24' : '#9f5a00';
      ctx.font = '800 26px Tajawal, Arial, sans-serif';
      pricingLines.forEach(price => {
        if (detailY > 1290) return;
        const note = price.note ? ` — ${price.note}` : '';
        ctx.fillText(`${price.label}: ${price.value}${note}${item?.limited_offer===true?' · عرض لفترة محدودة':''}`, 930, detailY, 870);
        detailY += 36;
      });
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



  async function drawPdfContainedImage(ctx, src, box, { label = '' } = {}) {
    drawPdfImageBoxFrame(ctx, box);
    try {
      const loaded = await loadCatalogPdfImage(src);
      try {
        const img = loaded.image;
        const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
        const width = Math.max(1, img.naturalWidth * scale);
        const height = Math.max(1, img.naturalHeight * scale);
        ctx.drawImage(img, box.x + (box.w - width) / 2, box.y + (box.h - height) / 2, width, height);
      } finally {
        URL.revokeObjectURL(loaded.objectUrl);
      }
      if (label) drawPdfImageCounterChip(ctx, label, box.x + 16, box.y + 16);
      return false;
    } catch (_) {
      drawPdfImagePlaceholder(ctx, box, label || 'الصورة');
      return true;
    }
  }

  function roundRectPath(ctx, x, y, w, h, r = 18) {
    const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function fillRoundedRect(ctx, x, y, w, h, r, fill) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function strokeRoundedRect(ctx, x, y, w, h, r, stroke, lineWidth = 2) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  function normalizeDigitString(value) {
    return String(value || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  }

  function productWarrantyYears(item) {
    const directCandidates = [item?.warranty_years, item?.warrantyYears, item?.warranty];
    for (const value of directCandidates) {
      const digits = normalizeDigitString(value).match(/\d+/);
      if (digits) return Math.min(99, Math.max(1, Number(digits[0])));
    }
    const spec = productSpecifications(item).find(spec => String(spec.key || '').toLowerCase() === 'warranty' || String(spec.label || '').includes('ضمان'));
    const text = normalizeDigitString(specificationDisplayValue(spec || ''));
    const digits = text.match(/\d+/);
    if (digits) return Math.min(99, Math.max(1, Number(digits[0])));
    if (/سنتين|سنتان/.test(text)) return 2;
    if (/ثلاث/.test(text)) return 3;
    if (/خمس/.test(text)) return 5;
    if (/سنة/.test(text)) return 1;
    return null;
  }

  function catalogContactPhone() {
    const list = Array.isArray(window.FLOWER_LIGHT_CONTACTS) ? window.FLOWER_LIGHT_CONTACTS : [];
    const first = list.find(item => (item?.type === 'phone' || item?.type === 'whatsapp') && item?.is_visible !== false)?.value || '';
    return String(first || '+966 50 123 4567').trim();
  }

  function catalogWebsiteUrl() {
    const list = Array.isArray(window.FLOWER_LIGHT_CONTACTS) ? window.FLOWER_LIGHT_CONTACTS : [];
    const site = list.find(item => item?.type === 'website' && item?.is_visible !== false)?.value;
    return String(site || 'https://saeed-naji.github.io/Saeed-naji-card/').trim();
  }

  async function loadCompanyLogoImage() {
    if (window.__flCompanyLogoPromise) return window.__flCompanyLogoPromise;
    window.__flCompanyLogoPromise = loadCatalogPdfImage('company-logo.png?v=34').catch(() => null);
    return window.__flCompanyLogoPromise;
  }

  function drawPdfImageBoxFrame(ctx, box) {
    fillRoundedRect(ctx, box.x, box.y, box.w, box.h, box.r || 24, '#f6f6f4');
    strokeRoundedRect(ctx, box.x, box.y, box.w, box.h, box.r || 24, '#d9d3ca', 1.5);
  }

  function drawPdfImageCounterChip(ctx, text, x, y) {
    ctx.save();
    fillRoundedRect(ctx, x, y, 74, 34, 16, 'rgba(30,30,30,.84)');
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    ctx.fillText(String(text), x + 37, y + 18);
    ctx.restore();
  }

  function drawPdfImagePlaceholder(ctx, box, label = 'الصورة') {
    drawPdfImageBoxFrame(ctx, box);
    ctx.save();
    ctx.strokeStyle = '#bbb8b1';
    ctx.lineWidth = 4;
    roundRectPath(ctx, box.x + box.w / 2 - 32, box.y + box.h / 2 - 48, 64, 52, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(box.x + box.w / 2 - 12, box.y + box.h / 2 - 24, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(box.x + box.w / 2 - 24, box.y + box.h / 2 + 2);
    ctx.lineTo(box.x + box.w / 2 - 4, box.y + box.h / 2 - 16);
    ctx.lineTo(box.x + box.w / 2 + 24, box.y + box.h / 2 + 12);
    ctx.stroke();
    ctx.fillStyle = '#8d8b86';
    ctx.font = '700 20px Tajawal, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2 + 56);
    ctx.restore();
  }

  function productPdfImageBoxes(count, area) {
    const gap = 18;
    if (count <= 1) return [{ x: area.x, y: area.y, w: area.w, h: area.h, r: 26 }];
    if (count === 2) {
      const w = (area.w - gap) / 2;
      return [
        { x: area.x, y: area.y, w, h: area.h, r: 24 },
        { x: area.x + w + gap, y: area.y, w, h: area.h, r: 24 }
      ];
    }
    if (count === 3) {
      const rightW = Math.round(area.w * 0.36);
      const leftW = area.w - rightW - gap;
      const halfH = (area.h - gap) / 2;
      return [
        { x: area.x, y: area.y, w: leftW, h: area.h, r: 24 },
        { x: area.x + leftW + gap, y: area.y, w: rightW, h: halfH, r: 20 },
        { x: area.x + leftW + gap, y: area.y + halfH + gap, w: rightW, h: halfH, r: 20 }
      ];
    }
    const w = (area.w - gap) / 2;
    const h = (area.h - gap) / 2;
    return [
      { x: area.x, y: area.y, w, h, r: 22 },
      { x: area.x + w + gap, y: area.y, w, h, r: 22 },
      { x: area.x, y: area.y + h + gap, w, h, r: 22 },
      { x: area.x + w + gap, y: area.y + h + gap, w, h, r: 22 }
    ];
  }

  function drawCatalogTemplateBackground(ctx) {
    const pageW = BASE_EXPORT_PAGE_WIDTH;
    const pageH = BASE_EXPORT_PAGE_HEIGHT;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageW, pageH);

    ctx.save();
    ctx.fillStyle = '#f3f3f1';
    ctx.beginPath();
    ctx.moveTo(pageW * 0.54, 0);
    ctx.bezierCurveTo(pageW * 0.82, 0, pageW, 20, pageW, 150);
    ctx.lineTo(pageW, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ff9f0a';
    ctx.beginPath();
    ctx.moveTo(0, 158);
    ctx.bezierCurveTo(220, 154, 310, 190, 455, 184);
    ctx.bezierCurveTo(610, 180, 735, 148, 1000, 168);
    ctx.lineTo(1000, 194);
    ctx.lineTo(0, 194);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ff9f0a';
    ctx.beginPath();
    ctx.moveTo(0, pageH - 58);
    ctx.bezierCurveTo(145, pageH - 70, 205, pageH - 6, 356, pageH - 18);
    ctx.bezierCurveTo(575, pageH - 34, 670, pageH - 110, 1000, pageH - 30);
    ctx.lineTo(1000, pageH);
    ctx.lineTo(0, pageH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath();
    ctx.moveTo(665, pageH);
    ctx.quadraticCurveTo(820, pageH - 112, 1000, pageH - 18);
    ctx.lineTo(1000, pageH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  async function drawCatalogPageHeader(ctx, item) {
    const logoAsset = await loadCompanyLogoImage();
    if (logoAsset?.image) {
      try {
        ctx.drawImage(logoAsset.image, 42, 26, 76, 76);
      } finally {
        try { URL.revokeObjectURL(logoAsset.objectUrl); } catch (_) {}
        window.__flCompanyLogoPromise = Promise.resolve({ image: logoAsset.image, objectUrl: '' });
      }
    }

    // Keep the PDF brand deliberately simple and consistently spaced.
    const englishBrandFirst = 'Flower';
    const englishBrandRest = 'Light';

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillStyle = '#ff9f0a';
    ctx.font = '600 39px Arial, sans-serif';
    const brandX = 136;
    const firstBrandWidth = Math.min(300, ctx.measureText(englishBrandFirst).width);
    ctx.fillText(englishBrandFirst, brandX, 70, 280);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillText(englishBrandRest, brandX + firstBrandWidth + 14, 70, Math.max(110, 480 - firstBrandWidth));

    ctx.fillStyle = '#666666';
    ctx.font = '400 15px Arial, sans-serif';
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillText('Better Lighting for a Brighter Life', brandX, 116, 450);
    ctx.fillStyle = '#ff9f0a';
    ctx.fillRect(brandX, 126, 30, 3);

    const warranty = productWarrantyYears(item);
    if (warranty) {
      const cardX = 730;
      const cardY = 18;
      const cardW = 232;
      const cardH = 126;

      ctx.save();
      ctx.shadowColor = 'rgba(87, 59, 18, 0.16)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 5;
      fillRoundedRect(ctx, cardX, cardY, cardW, cardH, 24, '#ffffff');
      ctx.restore();
      strokeRoundedRect(ctx, cardX, cardY, cardW, cardH, 24, '#f2d29d', 2);

      const numberX = cardX + 14;
      const numberY = cardY + 14;
      const numberW = 70;
      const numberH = cardH - 28;
      const numberGradient = ctx.createLinearGradient(numberX, numberY, numberX, numberY + numberH);
      numberGradient.addColorStop(0, '#ffad22');
      numberGradient.addColorStop(1, '#ef8b00');
      fillRoundedRect(ctx, numberX, numberY, numberW, numberH, 18, numberGradient);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 47px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'ltr';
      ctx.fillText(String(warranty), numberX + numberW / 2, numberY + 39);
      ctx.font = '600 12px Arial, sans-serif';
      ctx.fillText('YEARS', numberX + numberW / 2, numberY + 76, numberW - 12);

      const textX = cardX + 100;
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#9b8b72';
      ctx.font = '500 12px Arial, sans-serif';
      ctx.fillText('PRODUCT', textX, cardY + 34, 112);
      ctx.fillStyle = '#28231d';
      ctx.font = '600 19px Arial, sans-serif';
      ctx.fillText('WARRANTY', textX, cardY + 59, 116);
      ctx.fillStyle = '#ff9f0a';
      ctx.fillRect(textX, cardY + 71, 36, 3);

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#5b5144';
      ctx.font = '600 16px Tajawal, Arial, sans-serif';
      const ar = warranty === 1 ? 'ضمان لمدة سنة' : warranty === 2 ? 'ضمان لمدة سنتين' : `ضمان لمدة ${warranty} سنوات`;
      ctx.fillText(ar, cardX + cardW - 16, cardY + 105, 116);
    }
  }

  function drawCatalogFooter(ctx) {
    const phone = catalogContactPhone();
    const website = catalogWebsiteUrl();
    const footerTop = 1320;

    ctx.fillStyle = '#ff9f0a';
    ctx.fillRect(0, footerTop, 1000, 1414 - footerTop);
    ctx.fillStyle = '#df8200';
    ctx.fillRect(0, footerTop, 1000, 4);

    fillRoundedRect(ctx, 40, 1341, 46, 46, 23, '#ffffff');
    ctx.fillStyle = '#f29500';
    ctx.font = '700 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☎', 63, 1365);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px Tajawal, Arial, sans-serif';
    ctx.fillText('للاستفسار والطلبات', 280, 1352, 182);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '600 19px Arial, sans-serif';
    ctx.fillText(phone, 100, 1382, 180);

    ctx.strokeStyle = '#ffc766';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(300, 1335);
    ctx.lineTo(300, 1398);
    ctx.stroke();

    fillRoundedRect(ctx, 320, 1341, 46, 46, 23, '#ffffff');
    ctx.fillStyle = '#f29500';
    ctx.font = '700 23px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('●', 343, 1365);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px Tajawal, Arial, sans-serif';
    ctx.fillText('زوروا موقعنا الإلكتروني', 695, 1352, 313);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '400 14px Arial, sans-serif';
    ctx.fillText(website, 382, 1382, 310);

    ctx.strokeStyle = '#ffc766';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(712, 1335);
    ctx.lineTo(712, 1398);
    ctx.stroke();

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px Tajawal, Arial, sans-serif';
    ctx.fillText('إضاءة ... لمستقبل أكثر إشراقاً', 962, 1353, 232);
    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff4dd';
    ctx.font = '400 12px Arial, sans-serif';
    ctx.fillText('Lighting ... for a Brighter Tomorrow', 961, 1382, 230);
  }

  function buildPdfSpecRows(item) {
    const rows = [];
    if (item?.model) rows.push({ label: 'رقم المنتج / الكود', value: String(item.model) });
    const specs = productSpecifications(item);
    specs.forEach(spec => rows.push({ label: spec.label, value: specificationDisplayValue(spec) }));
    const pricing = productPricingLines(item);
    pricing.forEach(price => rows.push({ label: price.label, value: `${price.value}${price.note ? ` (${price.note})` : ''}` }));
    return rows.filter(row => row.label && row.value).slice(0, 16);
  }

  function pdfSpecGridMetrics(rows) {
    const columns = Math.min(4, Math.max(1, rows.length));
    const headerH = 46;
    const cellH = 68;
    const rowCount = Math.ceil(rows.length / columns);
    return { columns, headerH, cellH, rowCount, totalHeight: headerH + rowCount * cellH };
  }

  function drawPdfSpecsTable(ctx, rows, topY) {
    const x = 38;
    const width = 924;
    const metrics = pdfSpecGridMetrics(rows);
    const { columns, headerH, cellH, rowCount } = metrics;
    const bodyH = rowCount * cellH;

    fillRoundedRect(ctx, x, topY, width, headerH, 14, '#ff9f0a');
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px Tajawal, Arial, sans-serif';
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillText('المواصفات الفنية', x + width - 20, topY + 31, 290);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = '600 21px Arial, sans-serif';
    ctx.fillText('Technical Specifications', x + 18, topY + 30, 270);

    const startY = topY + headerH;
    if (!rows.length) return metrics.totalHeight;
    const cellW = width / columns;
    rows.forEach((row, index) => {
      const gridRow = Math.floor(index / columns);
      const gridColumn = index % columns;
      const cellX = x + width - (gridColumn + 1) * cellW;
      const y = startY + gridRow * cellH;
      ctx.fillStyle = (gridRow + gridColumn) % 2 === 0 ? '#fafafa' : '#f3f3f1';
      ctx.fillRect(cellX, y, cellW, cellH);
      ctx.strokeStyle = '#d8d6d0';
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX, y, cellW, cellH);

      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#73706a';
      ctx.font = '600 15px Tajawal, Arial, sans-serif';
      ctx.fillText(String(row.label), cellX + cellW - 12, y + 22, cellW - 24);

      ctx.fillStyle = '#171717';
      ctx.font = '700 18px Tajawal, Arial, sans-serif';
      ctx.fillText(String(row.value), cellX + cellW - 12, y + 51, cellW - 24);
    });
    strokeRoundedRect(ctx, x, startY, width, bodyH, 0, '#d5d3cc', 1.5);
    return metrics.totalHeight;
  }

  async function createBrandedProductPdfPage(item, { images = [], singleMode = false, currentIndex = 0, totalImages = 1, scale = 1 } = {}) {
    const { canvas, ctx } = createScaledExportCanvas(scale);

    drawCatalogTemplateBackground(ctx);
    await drawCatalogPageHeader(ctx, item);

    const rows = buildPdfSpecRows(item);
    const tableHeight = pdfSpecGridMetrics(rows).totalHeight;
    const footerY = 1320;
    const tableY = footerY - tableHeight - 20;
    const productName = productDisplayName(item);
    ctx.font = '700 36px Tajawal, Arial, sans-serif';
    const nameLines = canvasWrappedLines(ctx, productName, 918, 2);
    ctx.font = '600 19px Tajawal, Arial, sans-serif';
    const captionLines = item?.caption ? canvasWrappedLines(ctx, item.caption, 918, 2) : [];
    const detailsBlockHeight = 44 + Math.max(1, nameLines.length) * 40 + (item?.model ? 32 : 0) + (captionLines.length ? 8 + captionLines.length * 27 : 0) + 10;
    const detailsTop = tableY - detailsBlockHeight - 14;
    const imageTop = 206;
    const imageBottom = detailsTop - 14;
    const imageArea = { x: 40, y: imageTop, w: 920, h: Math.max(320, imageBottom - imageTop) };

    const gallery = images.length ? images.slice(0, 4) : [{ image: item?.image || '', image_path: item?.image_path || '' }];
    const layoutBoxes = productPdfImageBoxes(Math.min(4, Math.max(1, gallery.length)), imageArea);
    let failedImages = 0;
    for (let i = 0; i < layoutBoxes.length; i += 1) {
      const row = gallery[i] || {};
      const label = singleMode ? `${currentIndex + 1}/${Math.max(1, totalImages)}` : `${i + 1}/${layoutBoxes.length}`;
      if (!row?.image) {
        drawPdfImagePlaceholder(ctx, layoutBoxes[i], singleMode ? 'الصورة الحالية' : `صورة ${i + 1}`);
        failedImages += 1;
      } else if (await drawPdfContainedImage(ctx, row.image, layoutBoxes[i], { label })) {
        failedImages += 1;
      }
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9f0a';
    ctx.font = '700 36px Tajawal, Arial, sans-serif';
    let detailsY = wrapCanvasText(ctx, productName, 956, detailsTop + 36, 918, 40, 2);

    ctx.fillStyle = '#202020';
    ctx.font = '700 21px Tajawal, Arial, sans-serif';
    const codeText = item?.model ? `رقم المنتج / الكود: ${String(item.model)}` : '';
    if (codeText) {
      ctx.fillText(codeText, 956, detailsY, 918);
      detailsY += 32;
    }

    if (item?.caption) {
      ctx.fillStyle = '#6a6a6a';
      ctx.font = '600 19px Tajawal, Arial, sans-serif';
      wrapCanvasText(ctx, item.caption, 956, detailsY + 4, 918, 27, 2);
    }

    drawPdfSpecsTable(ctx, rows, tableY);
    drawCatalogFooter(ctx);

    return { canvas, failedImages, imageCount: layoutBoxes.length };
  }

  async function createProductOverviewPdfPage(item, { scale = 1 } = {}) {
    const gallery = normalizedProductGallery(item).slice(0, 4);
    return createBrandedProductPdfPage(item, { images: gallery, singleMode: false, scale });
  }


  const exportChoiceModal = $('#exportChoiceModal');
  const exportChoiceTitle = $('#exportChoiceTitle');
  const exportChoiceSubtitle = $('#exportChoiceSubtitle');
  const exportChoicePdf = $('#exportChoicePdf');
  const exportChoiceJpg = $('#exportChoiceJpg');
  const exportChoiceClose = $('#closeExportChoice');
  let exportChoiceResolver = null;

  function closeExportChoice(choice = null) {
    if (!exportChoiceModal) return;
    exportChoiceModal.classList.remove('open');
    exportChoiceModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('export-choice-open');
    const resolver = exportChoiceResolver;
    exportChoiceResolver = null;
    if (resolver) resolver(choice);
  }

  function askExportChoice({ title = 'اختر نوع الملف', subtitle = '', pdfLabel = 'تحميل PDF', jpgLabel = 'تحميل JPG عالي الدقة' } = {}) {
    if (!exportChoiceModal || !exportChoicePdf || !exportChoiceJpg) return Promise.resolve('pdf');
    exportChoiceTitle.textContent = title;
    exportChoiceSubtitle.textContent = subtitle;
    exportChoicePdf.querySelector('span').textContent = pdfLabel;
    exportChoiceJpg.querySelector('span').textContent = jpgLabel;
    exportChoiceModal.classList.add('open');
    exportChoiceModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('export-choice-open');
    return new Promise(resolve => {
      exportChoiceResolver = resolve;
      window.requestAnimationFrame(() => exportChoicePdf.focus());
    });
  }

  exportChoicePdf?.addEventListener('click', () => closeExportChoice('pdf'));
  exportChoiceJpg?.addEventListener('click', () => closeExportChoice('jpg'));
  exportChoiceClose?.addEventListener('click', () => closeExportChoice(null));
  exportChoiceModal?.addEventListener('click', event => {
    if (event.target === exportChoiceModal) closeExportChoice(null);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && exportChoiceModal?.classList.contains('open')) closeExportChoice(null);
  });

  async function downloadCanvasAsJpg(canvas, filename, quality = JPG_IMAGE_QUALITY) {
    const blob = await exportCanvasToBlob(canvas, 'image/jpeg', quality);
    triggerBlobDownload(blob, filename);
  }

  async function downloadProductOverviewJpg(item, button) {
    const busyKey = String(item?.id || item?.model || productDisplayName(item));
    if (productOverviewPdfBusy.has(`jpg:${busyKey}`)) return;
    productOverviewPdfBusy.add(`jpg:${busyKey}`);
    const label = button?.querySelector('span');
    const originalLabel = label?.textContent || 'تحميل';
    if (button) button.disabled = true;
    if (label) label.textContent = 'جاري تجهيز JPG…';
    try {
      try {
        await document.fonts?.load('800 40px Tajawal');
        await document.fonts?.load('700 20px Tajawal');
      } catch (_) {}
      const { canvas, failedImages, imageCount } = await createProductOverviewPdfPage(item, { scale: JPG_EXPORT_SCALE });
      const fileBase = safePdfFilePart(item?.model || productDisplayName(item));
      await downloadCanvasAsJpg(canvas, `${fileBase}-product.jpg`);
      trackEvent('catalog_download', analyticsProductParams(item, { label: 'product_jpg', images_count: imageCount, failed_images: failedImages }));
      showPublicToast(failedImages ? `تم تحميل JPG عالي الدقة، وتعذر إدراج ${failedImages} صورة.` : 'تم تحميل صورة JPG عالية الدقة.', 4000);
    } catch (error) {
      console.warn('[Product JPG] generation failed', error);
      showPublicToast('تعذر تجهيز صورة JPG للمنتج. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      productOverviewPdfBusy.delete(`jpg:${busyKey}`);
      if (button) button.disabled = false;
      if (label) label.textContent = originalLabel;
    }
  }

  const productOverviewPdfBusy = new Set();
  async function downloadProductOverviewPdf(item, button) {
    const busyKey = String(item?.id || item?.model || productDisplayName(item));
    if (productOverviewPdfBusy.has(busyKey)) return;
    productOverviewPdfBusy.add(busyKey);
    const label = button?.querySelector('span');
    const originalLabel = label?.textContent || 'تحميل';
    if (button) button.disabled = true;
    if (label) label.textContent = 'جاري تجهيز PDF…';
    try {
      const JsPdf = await loadJsPdfOnDemand();
      try {
        await document.fonts?.load('800 40px Tajawal');
        await document.fonts?.load('700 20px Tajawal');
      } catch (_) {}
      const { canvas, failedImages, imageCount } = await createProductOverviewPdfPage(item, { scale: PDF_EXPORT_SCALE });
      const pdf = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', PDF_IMAGE_QUALITY), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileBase = safePdfFilePart(item?.model || productDisplayName(item));
      a.href = url;
      a.download = `${fileBase}-product.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackEvent('catalog_download', analyticsProductParams(item, { label: 'product_pdf', images_count: imageCount, failed_images: failedImages }));
      showPublicToast(failedImages ? `تم إنشاء PDF، وتعذر إدراج ${failedImages} صورة.` : `تم تحميل PDF ويحتوي ${imageCount} ${imageCount === 1 ? 'صورة' : 'صور'}.`, 4000);
    } catch (error) {
      console.warn('[Product PDF] generation failed', error);
      showPublicToast('تعذر تجهيز PDF للمنتج. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      productOverviewPdfBusy.delete(busyKey);
      if (button) button.disabled = false;
      if (label) label.textContent = originalLabel;
    }
  }

  async function createSingleProductImagePdfPage(item, imageSrc, imageIndex = 0, totalImages = 1, { scale = 1 } = {}) {
    return createBrandedProductPdfPage(item, {
      images: [{ image: imageSrc, image_path: '' }],
      singleMode: true,
      currentIndex: imageIndex,
      totalImages,
      scale
    });
  }

  function safePdfFilePart(value) {
    return String(value || 'product')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'product';
  }

  let singleImagePdfBusy = false;
  let singleImageJpgBusy = false;
  async function downloadCurrentProductImageJpg() {
    if (singleImageJpgBusy) return;
    const item = currentLightboxProduct();
    const gallery = currentLightboxGallery();
    const galleryImage = gallery[lightboxImageIndex];
    if (!item || !galleryImage?.image) return;

    singleImageJpgBusy = true;
    const button = imageLightboxDownloadPdf;
    const label = button?.querySelector('span');
    const originalLabel = label?.textContent || 'تحميل';
    if (button) button.disabled = true;
    if (label) label.textContent = 'جاري تجهيز JPG…';
    try {
      try {
        await document.fonts?.load('800 38px Tajawal');
        await document.fonts?.load('600 22px Tajawal');
      } catch (_) {}
      const { canvas, imageFailed } = await createSingleProductImagePdfPage(item, galleryImage.image, lightboxImageIndex, gallery.length, { scale: JPG_EXPORT_SCALE });
      const fileBase = safePdfFilePart(item?.model || productDisplayName(item));
      await downloadCanvasAsJpg(canvas, `${fileBase}-image-${lightboxImageIndex + 1}.jpg`);
      showPublicToast(imageFailed ? 'تم تحميل JPG لكن تعذر إدراج الصورة الأصلية.' : `تم تحميل JPG عالي الدقة للصورة ${lightboxImageIndex + 1}.`, 3600);
    } catch (error) {
      console.warn('[Product image JPG] generation failed', error);
      showPublicToast('تعذر تجهيز صورة JPG. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      singleImageJpgBusy = false;
      if (button) button.disabled = false;
      if (label) label.textContent = originalLabel;
    }
  }

  async function downloadCurrentProductImagePdf() {
    if (singleImagePdfBusy) return;
    const item = currentLightboxProduct();
    const gallery = currentLightboxGallery();
    const galleryImage = gallery[lightboxImageIndex];
    if (!item || !galleryImage?.image) return;

    singleImagePdfBusy = true;
    const button = imageLightboxDownloadPdf;
    const label = button?.querySelector('span');
    const originalLabel = label?.textContent || 'تحميل';
    if (button) button.disabled = true;
    if (label) label.textContent = 'جاري تجهيز PDF…';
    try {
      const JsPdf = await loadJsPdfOnDemand();
      try {
        await document.fonts?.load('800 38px Tajawal');
        await document.fonts?.load('600 22px Tajawal');
      } catch (_) {}
      const { canvas, imageFailed } = await createSingleProductImagePdfPage(item, galleryImage.image, lightboxImageIndex, gallery.length, { scale: PDF_EXPORT_SCALE });
      const pdf = new JsPdf({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', PDF_IMAGE_QUALITY), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const fileBase = safePdfFilePart(item?.model || productDisplayName(item));
      a.href = url;
      a.download = `${fileBase}-image-${lightboxImageIndex + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      showPublicToast(imageFailed ? 'تم إنشاء PDF لكن تعذر إدراج الصورة الأصلية.' : `تم تحميل PDF للصورة ${lightboxImageIndex + 1}.`, 3600);
    } catch (error) {
      console.warn('[Product image PDF] generation failed', error);
      showPublicToast('تعذر تجهيز PDF للصورة. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      singleImagePdfBusy = false;
      if (button) button.disabled = false;
      if (label) label.textContent = originalLabel;
    }
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

  // Reuse the exact public product-PDF renderer inside the admin datasheet tool.
  // This keeps manually designed datasheets visually identical to the approved
  // "download image with technical information" output.
  window.flDatasheetPdf = Object.freeze({
    createPage: createBrandedProductPdfPage,
    createSinglePage: createSingleProductImagePdfPage,
    loadJsPdf: loadJsPdfOnDemand,
    safeFilePart: safePdfFilePart,
    askExportChoice,
    downloadCanvasAsJpg,
    exportCanvasToBlob,
    triggerBlobDownload,
    scales: Object.freeze({ pdf: PDF_EXPORT_SCALE, jpg: JPG_EXPORT_SCALE }),
    qualities: Object.freeze({ pdf: PDF_IMAGE_QUALITY, jpg: JPG_IMAGE_QUALITY })
  });

  async function downloadCatalogJpg() {
    if (catalogPdfBusy) return;
    const entries = catalogPdfEntries();
    if (!entries.length) {
      showPublicToast('لا توجد منتجات ظاهرة لإضافتها إلى الكتالوج.');
      return;
    }
    catalogPdfBusy = true;
    if (catalogDownloadPdf) catalogDownloadPdf.disabled = true;
    const originalLabel = catalogDownloadPdfLabel?.textContent || 'تحميل الكتالوج';
    let failedImages = 0;
    try {
      try {
        await document.fonts?.load('800 42px Tajawal');
        await document.fonts?.load('500 24px Tajawal');
      } catch (_) {}
      for (let index = 0; index < entries.length; index += 1) {
        if (catalogDownloadPdfLabel) catalogDownloadPdfLabel.textContent = `جاري تجهيز JPG ${index + 1}/${entries.length}`;
        const { section, item } = entries[index];
        const { canvas, imageFailed } = await createCatalogPdfPage(section, item, index + 1, entries.length, { scale: JPG_EXPORT_SCALE });
        if (imageFailed) failedImages += 1;
        const base = safePdfFilePart(item?.model || productDisplayName(item) || `catalog-${index + 1}`);
        await downloadCanvasAsJpg(canvas, `${String(index + 1).padStart(2, '0')}-${base}.jpg`);
        await new Promise(resolve => setTimeout(resolve, 160));
      }
      trackEvent('catalog_download', { label: 'كتالوج المنتجات JPG', products_count: entries.length, failed_images: failedImages });
      showPublicToast(failedImages ? `تم تحميل صور JPG للكتالوج، وتعذر إدراج ${failedImages} صورة.` : `تم تحميل ${entries.length} صورة JPG للكتالوج.`, 4300);
    } catch (error) {
      console.warn('[Catalog JPG] generation failed', error);
      showPublicToast('تعذر تجهيز صور JPG للكتالوج. أعد المحاولة بعد التأكد من اتصال الإنترنت.', 4500);
    } finally {
      catalogPdfBusy = false;
      if (catalogDownloadPdfLabel) catalogDownloadPdfLabel.textContent = originalLabel;
      if (catalogDownloadPdf) catalogDownloadPdf.disabled = catalogPdfEntries().length === 0;
    }
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
    const originalLabel = catalogDownloadPdfLabel?.textContent || 'تحميل الكتالوج';
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
        const { canvas, imageFailed } = await createCatalogPdfPage(section, item, index + 1, entries.length, { scale: PDF_EXPORT_SCALE });
        if (imageFailed) failedImages += 1;
        if (index > 0) pdf.addPage('a4', 'portrait');
        const pageImage = canvas.toDataURL('image/jpeg', PDF_IMAGE_QUALITY);
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

  async function handleCatalogDownloadChoice() {
    const choice = await askExportChoice({
      title: 'تحميل الكتالوج',
      subtitle: 'يمكنك تنزيل الكتالوج كملف PDF واحد، أو كصور JPG عالية الدقة لكل منتج على حدة.',
      pdfLabel: 'تحميل الكتالوج PDF',
      jpgLabel: 'تحميل الكتالوج JPG'
    });
    if (choice === 'jpg') return downloadCatalogJpg();
    if (choice === 'pdf') return downloadCatalogPdf();
  }

  catalogDownloadPdf?.addEventListener('click', handleCatalogDownloadChoice);

  function renderProducts() {
    const data = window.FLOWER_LIGHT_PRODUCTS || {extraSections:[]};
    renderExtraSections(data);
    if (catalogDownloadPdf) catalogDownloadPdf.disabled = catalogPdfBusy || catalogPdfEntries().length === 0;
    applyCustomerServiceVisibility();
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
  const imageLightboxDownloadPdf = $('#imageLightboxDownloadPdf');
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
    if (imageLightboxCaption) {
      const parts = [];
      if (item?.model) parts.push(`رقم المنتج / الكود: ${item.model}`);
      if (item?.caption) parts.push(item.caption);
      productPricingLines(item).forEach(price => {
        const note = price.note ? ` (${price.note})` : '';
        parts.push(`${price.label}: ${price.value}${note}`);
      });
      if (item?.limited_offer===true && productPricingLines(item).length) parts.push('عرض لفترة محدودة');
      imageLightboxCaption.textContent = parts.join(' — ') || item.alt || '';
    }
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
        imageLightboxWhatsApp.setAttribute('aria-label', `استفسار واتساب عن ${productDisplayName(item)}${item?.model ? ` كود ${item.model}` : ''}`);
      }
    }
    if (imageLightboxQuoteAdd) {
      const quoteVisible = customerServiceEnabled('quote_request');
      imageLightboxQuoteAdd.hidden = !(isProduct && quoteVisible);
      if (isProduct && quoteVisible) {
        imageLightboxQuoteAdd.dataset.quoteAdd = String(item.id || '');
        const added = quoteHasProduct(item.id);
        imageLightboxQuoteAdd.classList.toggle('added', added);
        const quoteLabel = imageLightboxQuoteAdd.querySelector('span');
        if (quoteLabel) quoteLabel.textContent = added ? 'مضاف للطلب ✓' : 'أضف لطلب السعر';
      }
    }
    if (imageLightboxDownloadPdf) {
      imageLightboxDownloadPdf.hidden = !isProduct;
      if (isProduct) {
        const downloadLabel = imageLightboxDownloadPdf.querySelector('span');
        if (downloadLabel && !singleImagePdfBusy && !singleImageJpgBusy) downloadLabel.textContent = gallery.length > 1
          ? `تحميل الصورة ${lightboxImageIndex + 1}`
          : 'تحميل هذه الصورة';
        imageLightboxDownloadPdf.setAttribute('aria-label', `تحميل الصورة ${lightboxImageIndex + 1} من ${gallery.length} بصيغة PDF أو JPG مع المواصفات`);
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

  function openImageLightbox(item, trigger, collection = [item], index = 0, startImageIndex = 0) {
    if (!imageLightbox || !imageLightboxImage) return;
    trackEvent('product_image_open', analyticsProductParams(item));
    lightboxLastFocus = trigger || document.activeElement;
    lightboxProducts = (Array.isArray(collection) && collection.length ? collection : [item]).filter(product => product?.image);
    let exactIndex = lightboxProducts.indexOf(item);
    if (exactIndex < 0 && item?.id) exactIndex = lightboxProducts.findIndex(product => product?.id === item.id);
    lightboxProductIndex = exactIndex >= 0 ? exactIndex : Math.min(Math.max(0,index),Math.max(0,lightboxProducts.length-1));
    const openingGallery = currentLightboxGallery();
    lightboxImageIndex = Math.max(0, Math.min(Math.max(0, openingGallery.length - 1), Number(startImageIndex) || 0));
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

  imageLightboxDownloadPdf?.addEventListener('click', async () => {
    const gallery = currentLightboxGallery();
    const choice = await askExportChoice({
      title: 'تحميل الصورة الحالية',
      subtitle: `اختر تنزيل الصورة الحالية من المنتج بصيغة PDF أو JPG عالية الدقة${gallery.length > 1 ? ` — الصورة ${lightboxImageIndex + 1} من ${gallery.length}` : ''}.`,
      pdfLabel: 'تحميل PDF',
      jpgLabel: 'تحميل JPG'
    });
    if (choice === 'jpg') return downloadCurrentProductImageJpg();
    if (choice === 'pdf') return downloadCurrentProductImagePdf();
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
