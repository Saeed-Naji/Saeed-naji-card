import assert from 'node:assert/strict';

const base = 'https://saeed-naji.github.io/Saeed-naji-card/';
const get = async (file = '') => {
  const response = await fetch(new URL(file, base), { redirect: 'follow' });
  assert.equal(response.ok, true, `${file || 'index.html'} returned ${response.status}`);
  return response;
};

const html = await (await get('')).text();
assert.match(html, /Flower Light STAGE88/);
assert.match(html, /app\.js\?v=88/);
assert.match(html, /admin\.js\?v=88/);
assert.match(html, /share-image\.jpg/);
assert.match(html, /noindex,nofollow/);
assert.match(html, /لوحة المدير \| Flower Light/);
assert.match(html, /لوحة الأدمن \| Flower Light/);

const share = await get('share-image.jpg');
assert.match(share.headers.get('content-type') || '', /image\/jpeg/i);

const admin = await (await get('admin.js?v=88')).text();
assert.match(admin, /Supabase admin controller — STAGE88/);
assert.match(admin, /createAdminDatasheetExport/);
assert.match(admin, /document\.title=isPrimaryAdmin\?'لوحة المدير \| Flower Light':'لوحة الأدمن \| Flower Light'/);
assert.doesNotMatch(admin, /createAdminDatasheetPdf|quote_service_visible|quoteModal|paperQuote/i);

const css = await (await get('style.css?v=88')).text();
assert.doesNotMatch(css, /\\n\\n/);
const responsiveQueries = [...css.matchAll(/@media\s*([^\{]+)\{/g)]
  .map(match => match[1].trim().replace(/\s+/g, ' '));
assert.deepEqual(responsiveQueries, [
  '(max-width: 760px)',
  '(max-width: 430px)',
  '(min-width: 761px)',
  '(prefers-reduced-motion: reduce)',
]);
assert.doesNotMatch(html,/share-image-v78|STAGE84|v=84/);
console.log('STAGE88_LIVE_OK');
