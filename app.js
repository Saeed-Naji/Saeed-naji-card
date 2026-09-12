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
    lines.push('هل يمكن تزويدي بالتفاصيل والسعر؟');
    return lines.join('\n');
  }

  function productWhatsAppUrl(item) {
    const number = primaryWhatsAppNumber();
    return number ? `https://wa.me/${number}?text=${encodeURIComponent(productWhatsAppMessage(item))}` : '#';
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

  function createZoomButton(item, imageLoading = 'lazy', collection = [item], index = 0) {
    const button = document.createElement('button');
    button.className = 'product-image-button';
    button.type = 'button';
    button.setAttribute('aria-label', `تكبير صورة ${item.caption || item.alt || 'المنتج'}`);

    const image = document.createElement('img');
    image.src = item.image;
    image.alt = item.alt;
    image.loading = imageLoading;

    const badge = document.createElement('span');
    badge.className = 'image-zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path><path d="M11 8v6M8 11h6"></path></svg>';

    button.append(image, badge);
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

    const whatsappLink = createProductWhatsAppLink(item);

    thumb.appendChild(imageButton);
    figure.append(thumb, caption, whatsappLink);
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
      tab.setAttribute('aria-pressed', sectionIndex===0 ? 'true' : 'false');
      tab.innerHTML = `<strong></strong><small></small>`;
      tab.querySelector('strong').textContent = section.name || 'قسم';
      tab.querySelector('small').textContent = `${Array.isArray(section.items) ? section.items.length : 0} منتج`;
      tab.addEventListener('click', () => {
        setCatalogPanel(safeId);
        trackEvent('product_category_view', { category: section.name || 'قسم', panel_id: safeId });
      });
      tabsHost.appendChild(tab);

      const panel = document.createElement('section');
      panel.className = `catalog-panel extra-section-panel${sectionIndex===0?' active':''}`;
      panel.id = safeId;

      const intro = document.createElement('p');
      intro.className = 'extra-section-intro';
      intro.textContent = section.description || `منتجات قسم ${section.name || 'القسم'}`;

      const grid = document.createElement('div');
      grid.className = 'extra-section-grid';
      grid.dir = 'rtl';
      const items = Array.isArray(section.items) ? section.items : [];
      const fragment = document.createDocumentFragment();
      items.forEach((item, index) => fragment.appendChild(createProductCard(item, 'chandelier', items, index)));
      grid.appendChild(fragment);
      panel.append(intro, grid);
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
    const box = { x: 65, y: 205, w: 870, h: 870 };
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
    let detailY = 1135;
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
      detailY = wrapCanvasText(ctx, item.caption, 930, detailY, 870, 34, 3);
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

  async function downloadCatalogPdf() {
    if (catalogPdfBusy) return;
    const entries = catalogPdfEntries();
    if (!entries.length) {
      showPublicToast('لا توجد منتجات ظاهرة لإضافتها إلى الكتالوج.');
      return;
    }
    const JsPdf = window.jspdf?.jsPDF;
    if (!JsPdf) {
      showPublicToast('تعذر تحميل أداة PDF. تحقق من الاتصال ثم أعد المحاولة.', 4200);
      return;
    }

    catalogPdfBusy = true;
    if (catalogDownloadPdf) catalogDownloadPdf.disabled = true;
    const originalLabel = catalogDownloadPdfLabel?.textContent || 'تحميل الكتالوج PDF';
    let failedImages = 0;
    try {
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
  }

  window.flRenderProducts = renderProducts;


  const imageLightbox = $('#imageLightbox');
  const imageLightboxImage = $('#imageLightboxImage');
  const imageLightboxCaption = $('#imageLightboxCaption');
  const imageLightboxCounter = $('#imageLightboxCounter');
  const imageLightboxWhatsApp = $('#imageLightboxWhatsApp');
  const imageLightboxStage = $('#imageLightboxStage');
  const closeImageLightboxButton = $('#closeImageLightbox');
  const prevImageLightboxButton = $('#imageLightboxPrev');
  const nextImageLightboxButton = $('#imageLightboxNext');
  let lightboxLastFocus = null;
  let lightboxItems = [];
  let lightboxIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  function normalizeLightboxIndex(index) {
    if (!lightboxItems.length) return 0;
    return (index + lightboxItems.length) % lightboxItems.length;
  }

  function preloadLightboxNeighbors() {
    if (lightboxItems.length < 2) return;
    const prev = lightboxItems[normalizeLightboxIndex(lightboxIndex - 1)];
    const next = lightboxItems[normalizeLightboxIndex(lightboxIndex + 1)];
    [prev, next].forEach((item) => {
      if (!item?.image) return;
      const image = new Image();
      image.src = item.image;
    });
  }

  function showLightboxItem(index, direction = 0) {
    if (!imageLightboxImage || !lightboxItems.length) return;
    lightboxIndex = normalizeLightboxIndex(index);
    const item = lightboxItems[lightboxIndex];

    if (direction) {
      imageLightboxImage.classList.remove('slide-from-left', 'slide-from-right');
      // Force reflow so consecutive swipes replay the animation.
      void imageLightboxImage.offsetWidth;
      imageLightboxImage.classList.add(direction > 0 ? 'slide-from-right' : 'slide-from-left');
    }

    imageLightboxImage.src = item.image;
    imageLightboxImage.alt = item.alt || item.caption || 'صورة المنتج';
    if (imageLightboxCaption) imageLightboxCaption.textContent = item.caption || item.alt || '';
    if (imageLightboxCounter) imageLightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
    if (imageLightboxWhatsApp) {
      const isProduct = Boolean(item?.category || item?.model);
      const hasWhatsApp = Boolean(primaryWhatsAppNumber());
      imageLightboxWhatsApp.hidden = !(isProduct && hasWhatsApp);
      if (isProduct && hasWhatsApp) {
        imageLightboxWhatsApp.href = productWhatsAppUrl(item);
        imageLightboxWhatsApp.setAttribute(
          'aria-label',
          `استفسار واتساب عن ${productDisplayName(item)}${item?.model ? ` موديل ${item.model}` : ''}`
        );
      }
    }

    const hasMultiple = lightboxItems.length > 1;
    prevImageLightboxButton?.toggleAttribute('hidden', !hasMultiple);
    nextImageLightboxButton?.toggleAttribute('hidden', !hasMultiple);
    preloadLightboxNeighbors();
  }

  function openImageLightbox(item, trigger, collection = [item], index = 0) {
    if (!imageLightbox || !imageLightboxImage) return;
    trackEvent('product_image_open', analyticsProductParams(item));
    lightboxLastFocus = trigger || document.activeElement;
    lightboxItems = Array.isArray(collection) && collection.length ? collection : [item];
    const exactIndex = lightboxItems.indexOf(item);
    lightboxIndex = exactIndex >= 0 ? exactIndex : index;
    showLightboxItem(lightboxIndex);
    imageLightbox.classList.add('open');
    imageLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('image-lightbox-open');
    window.setTimeout(() => closeImageLightboxButton?.focus(), 0);
  }

  function showPreviousLightboxItem(method = 'button_or_keyboard') {
    if (lightboxItems.length < 2) return;
    showLightboxItem(lightboxIndex - 1, -1);
    const item = lightboxItems[lightboxIndex];
    if (item) trackEvent('product_gallery_navigation', analyticsProductParams(item, { direction: 'previous', method }));
  }

  function showNextLightboxItem(method = 'button_or_keyboard') {
    if (lightboxItems.length < 2) return;
    showLightboxItem(lightboxIndex + 1, 1);
    const item = lightboxItems[lightboxIndex];
    if (item) trackEvent('product_gallery_navigation', analyticsProductParams(item, { direction: 'next', method }));
  }

  function closeImageLightbox() {
    if (!imageLightbox?.classList.contains('open')) return;
    imageLightbox.classList.remove('open');
    imageLightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('image-lightbox-open');
    imageLightboxImage?.removeAttribute('src');
    imageLightboxImage?.classList.remove('slide-from-left', 'slide-from-right');
    lightboxItems = [];
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
    const item = lightboxItems[lightboxIndex];
    if (item) trackEvent('product_whatsapp_click', analyticsProductParams(item, { source: 'image_lightbox' }));
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
      if (!event.changedTouches.length || lightboxItems.length < 2) return;
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
    if (!catalogModal) return;
    if (typeof window.flBeforeProductsOpen === 'function') {
      try {
        const allowed = await window.flBeforeProductsOpen();
        if (!allowed) return;
      } catch (error) {
        console.warn('[Site] Products access check failed.', error);
        return;
      }
    }
    catalogLastFocus = document.activeElement;
    const firstTab = $('.catalog-tab');
    if (firstTab?.dataset.target) setCatalogPanel(firstTab.dataset.target);
    catalogModal.classList.add('open');
    catalogModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('catalog-open');
    trackEvent('products_open', {});
    window.setTimeout(() => closeProducts?.focus(), 0);
  }

  function closeCatalog() {
    if (!catalogModal?.classList.contains('open')) return;
    catalogModal.classList.remove('open');
    catalogModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('catalog-open');
    if (catalogLastFocus && typeof catalogLastFocus.focus === 'function') catalogLastFocus.focus();
  }

  openProducts?.addEventListener('click', openCatalog);
  closeProducts?.addEventListener('click', closeCatalog);
  catalogModal?.addEventListener('click', event => {
    if (event.target === catalogModal) closeCatalog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (imageLightbox?.classList.contains('open')) closeImageLightbox();
      else if (catalogModal?.classList.contains('open')) closeCatalog();
    }
  });

  renderProducts();
})();
