import assert from 'node:assert/strict';

const url = process.env.VITE_CORP_SUPABASE_URL?.trim();
const key = process.env.VITE_CORP_SUPABASE_PUBLISHABLE_KEY?.trim();
assert.match(url || '', /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i, 'Corporate Supabase URL missing');
assert.match(key || '', /^sb_publishable_[a-zA-Z0-9_-]+$/, 'Publishable key missing');
assert.equal(new URL(url).hostname, 'afrvoshsiqartsketiuv.supabase.co', 'Wrong Supabase project. STOP.');

const headers = {'apikey': key, 'Authorization': 'Bearer ' + key, 'Accept': 'application/json'};
async function getTable(table, search='') {
  const response = await fetch(new URL('/rest/v1/' + table + search, url), {headers, signal:AbortSignal.timeout(15000)});
  return {status:response.status,body:await response.json()};
}
const products = await getTable('corp_products','?select=id,sku,name_ar,visible,gallery_images&visible=eq.true');
assert.equal(products.status,200,'Public corporate products are not readable');
assert.ok(Array.isArray(products.body),'Expected an array of products');
assert.ok(products.body.length >= 1,'No corporate sample products; check seed or database');
assert.ok(products.body.every(p => p.visible === true),'Hidden product leaked to public client');
assert.ok(products.body.every(p=>Array.isArray(p.gallery_images) && p.gallery_images.length<=4),'Gallery data invalid or unavailable');
console.log('PASS: public catalog loaded from Saeed corporate Supabase', products.body.length, 'visible products.');

const business = await getTable('corp_business_info','?select=singleton,company_name,is_published');
assert.equal(business.status,200,'Public company settings are not readable');
assert.ok(Array.isArray(business.body));
assert.ok(business.body.every(row => row.is_published === true),'Unpublished company information leaked');
console.log('PASS: unpublished company records inaccessible.');

const quotes = await getTable('corp_quote_requests','?select=id');
assert.ok([401,403].includes(quotes.status) || (quotes.status===200 && Array.isArray(quotes.body) && quotes.body.length===0),
  'Public API unexpectedly exposed quote requests');
console.log('PASS: no public quote request access.');

const privacy = await getTable('corp_privacy_policy','?select=singleton,is_published,controller_name,retention_days');
assert.equal(privacy.status,200,'Public privacy notice endpoint is not readable');
assert.ok(Array.isArray(privacy.body),'Expected privacy policy list');
assert.ok(privacy.body.every(p=>p.is_published===true && p.retention_days>=1),
  'Unpublished or incomplete privacy record leaked to public user');
console.log('PASS: unpublished privacy drafts are hidden by RLS');
