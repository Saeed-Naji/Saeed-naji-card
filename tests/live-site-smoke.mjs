import assert from 'node:assert/strict';

const base = 'https://saeed-naji.github.io/Saeed-naji-card/';
const get = async (file = '') => {
  const response = await fetch(new URL(file, base), { redirect: 'follow' });
  assert.equal(response.ok, true, `${file || 'index.html'} returned ${response.status}`);
  return response;
};

const html = await (await get('')).text();
assert.match(html, /Flower Light STAGE73/);
assert.match(html, /app\.js\?v=73/);
assert.match(html, /admin\.js\?v=73/);
assert.match(html, /share-image\.jpg\?v=73/);

const share = await get('share-image.jpg?v=73');
assert.match(share.headers.get('content-type') || '', /image\/jpeg/i);

const admin = await (await get('admin.js?v=73')).text();
assert.match(admin, /Stage 73/);
assert.match(admin, /createAdminDatasheetExport/);
assert.doesNotMatch(admin, /createAdminDatasheetPdf|quote_service_visible|quoteModal|paperQuote/i);

const css = await (await get('style.css?v=73')).text();
assert.doesNotMatch(css, /\\n\\n/);
console.log('STAGE73_LIVE_OK');
