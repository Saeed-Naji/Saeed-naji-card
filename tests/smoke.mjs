import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const app = read('app.js');
const admin = read('admin.js');
const sync = read('public-sync.js');
const css = read('style.css');
const manageAdmin = read('supabase/functions/manage-admin-account/index.ts');

assert.match(index, /Flower Light STAGE84/);
assert.doesNotMatch(index, /\?v=70/);
assert.doesNotMatch(index, /\?v=78/);
assert.doesNotMatch(index, /\?v=79/);
assert.match(index, /style\.css\?v=84/);
assert.match(index, /share-image\.jpg/);
assert.match(index, /<meta id="robotsMeta" name="robots" content="index,follow,max-image-preview:large"/);
assert.match(index, /'1': 'لوحة المدير \| Flower Light'/);
assert.match(index, /'2': 'لوحة الأدمن \| Flower Light'/);
assert.match(index, /setAttribute\('content', 'noindex,nofollow'\)/);
assert.match(admin, /document\.title=isPrimaryAdmin\?'لوحة المدير \| Flower Light':'لوحة الأدمن \| Flower Light'/);
assert.doesNotMatch(admin, /document\.title=displayName/);
assert.match(sync, /document\.title=displayName/);

const seoScript = index.match(/<script>\s*([\s\S]*?noindex,nofollow[\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(seoScript, 'admin SEO script was not found');
const evaluateSeo = search => {
  let robots = 'index,follow,max-image-preview:large';
  const document = {
    title: 'Flower Light | منتجات وكتالوج الإنارة',
    getElementById: id => id === 'robotsMeta'
      ? { setAttribute: (name, value) => { if (name === 'content') robots = value; } }
      : null,
  };
  vm.runInNewContext(seoScript, { document, location: { search }, URLSearchParams });
  return { title: document.title, robots };
};
assert.deepEqual(evaluateSeo(''), {
  title: 'Flower Light | منتجات وكتالوج الإنارة',
  robots: 'index,follow,max-image-preview:large',
});
assert.deepEqual(evaluateSeo('?admin=1'), {
  title: 'لوحة المدير | Flower Light',
  robots: 'noindex,nofollow',
});
assert.deepEqual(evaluateSeo('?admin=2'), {
  title: 'لوحة الأدمن | Flower Light',
  robots: 'noindex,nofollow',
});
assert.match(admin, /createAdminDatasheetExport/);
assert.match(admin, /flDatasheetDesignerForm.*createAdminDatasheetExport/);
assert.doesNotMatch(admin, /createAdminDatasheetPdf/);
assert.doesNotMatch(app, /requestAnimationFrame\(\(\)=>renderSiteCatalogPages/);
assert.doesNotMatch(`${index}\n${app}\n${admin}\n${sync}`, /quote_service_visible|quoteModal|paperQuote|عرض عرض سعر|طلب عرض سعر|flSubmitImageQuoteRequest|quoteBucket/i);
assert.doesNotMatch(css, /\\n\\n/);
const responsiveQueries = [...css.matchAll(/@media\s*([^\{]+)\{/g)]
  .map(match => match[1].trim().replace(/\s+/g, ' '));
assert.deepEqual(responsiveQueries, [
  '(max-width: 760px)',
  '(max-width: 430px)',
  '(min-width: 761px)',
  '(prefers-reduced-motion: reduce)',
]);
assert.match(css, /Consolidated responsive architecture/);
assert.match(app, /actions\.append\(pdfButton, shareButton, whatsappLink\)/);
assert.match(css, /\.product-card-actions \.product-whatsapp-button\{[\s\S]*?grid-column:1\/-1!important;/);
assert.match(css, /\.image-lightbox-actions \.image-lightbox-whatsapp\{[\s\S]*?grid-column:1\/-1!important;/);
assert.match(index, /imageLightboxDownloadPdf[\s\S]*imageLightboxShare[\s\S]*imageLightboxWhatsApp/);
assert.ok(fs.statSync(path.join(root, 'share-image.jpg')).size > 1000, 'share image is missing or empty');
assert.ok(fs.existsSync(path.join(root, 'supabase/functions/manage-admin-account/index.ts')));
assert.doesNotMatch(manageAdmin, /['"]quotes['"]|['"]services['"]/i);

for (const file of ['index.html', 'app.js', 'admin.js', 'public-sync.js']) {
  execFileSync(process.execPath, file === 'index.html' ? ['--check', 'tests/smoke.mjs'] : ['--check', file], { cwd: root, stdio: 'ignore' });
}
execFileSync(process.execPath, ['--experimental-strip-types', '--check', 'supabase/functions/manage-admin-account/index.ts'], { cwd: root, stdio: 'ignore' });


assert.match(app, /اسم المنتج:/);
assert.match(app, /رقم المنتج \/ الكود:/);
assert.match(app, /الوصف:/);
assert.match(app, /المواصفات الفنية:/);

assert.match(admin, /flProdWhatsAppShowDescription/);
assert.match(admin, /flProdWhatsAppShowSpecs/);
assert.match(app, /WHATSAPP_META_SHOW_DESCRIPTION/);
assert.match(app, /WHATSAPP_META_SHOW_SPECS/);
assert.match(app, /showDescription && description/);
assert.match(app, /if \(showSpecs\)/);
assert.match(admin, /flAddPriceTier/);
assert.match(admin, /جملة الجملة/);
assert.match(admin, /data-price-tier-min/);
assert.match(admin, /data-price-tier-max/);
assert.match(app, /سعر جملة الجملة/);
assert.match(app, /priceTierRangeNote/);
assert.match(app, /url\.searchParams\.set\('v', '84'\)/);
assert.match(index, /flLeadWebsite/);
assert.match(sync, /leadSubmitCooldownMs=30000/);
assert.match(admin, /leadSubmitCooldownMs=30000/);
assert.match(read('FINAL_SQL_STAGE84.sql'), /suppress_recent_duplicate_customer_lead/);
assert.match(read('FINAL_SQL_STAGE84.sql'), /create table if not exists public\.site_settings/);
assert.match(read('FINAL_SQL_STAGE84.sql'), /require_customer_lead boolean not null default true/);
assert.match(admin, /flCustomerLeadGateSettingsForm/);
assert.match(admin, /flRequireCustomerLead/);
assert.match(sync, /FLOWER_LIGHT_SITE_SETTINGS/);
assert.match(sync, /require_customer_lead===false/);


// STAGE84: Admin 2 permissions must be identical across UI, SQL and Edge Function.
assert.match(admin, /delegatablePermissionKeys = new Set\(\[\.\.\.validPermissionKeys\]\.filter\(key=>!\['sections','products'\]\.includes\(key\)\)\)/);
assert.match(admin, /currentAdminPermissions=new Set\(normalizePermissionList\(data\)\)/);
assert.match(index, /if \(adminPanel === '2'\) document\.getElementById\('flCloudPrimaryAdmin'\)\?\.remove\(\)/);
const edgeAdmin=read('supabase/functions/manage-admin-account/index.ts');
const edgeAllowed=edgeAdmin.match(/const allowedPermissions = new Set\(\[([\s\S]*?)\]\)/)?.[1]||'';
for(const permission of ['analytics','profile','contacts','leads','datasheet']) assert.match(edgeAllowed,new RegExp(`['\"]${permission}['\"]`));
for(const forbidden of ['sections','products','quotes','services']) assert.doesNotMatch(edgeAllowed,new RegExp(`['\"]${forbidden}['\"]`));
const sql=read('FINAL_SQL_STAGE84.sql');
const hardening=sql.slice(sql.lastIndexOf('STAGE84 ADMIN=2 FINAL PERMISSION HARDENING'));
for(const permission of ['analytics','profile','contacts','leads','datasheet']) assert.match(hardening,new RegExp(`['\"]${permission}['\"]`));
for(const forbidden of ['sections','products','quotes','services']) assert.doesNotMatch(hardening,new RegExp(`['\"]${forbidden}['\"]`));
assert.match(hardening,/where a\.role='subadmin'/);

// STAGE84: every local static reference resolves to a real release file.
const refs=[];
for(const match of index.matchAll(/(?:src|href)=["']([^"']+)["']/g)) refs.push(match[1]);
for(const match of css.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g)) refs.push(match[1]);
for(const raw of refs){
  const value=String(raw||'').trim();
  if(!value || /^(?:https?:|data:|blob:|mailto:|tel:|#)/i.test(value)) continue;
  const clean=value.split(/[?#]/)[0].replace(/^\.\//,'');
  if(!clean || clean.startsWith('/')) continue;
  assert.ok(fs.existsSync(path.join(root,clean)),`missing local asset: ${clean}`);
}
for(const asset of ['app.js','admin.js','public-sync.js','style.css','company-logo.png','favicon-32.png','favicon-192.png','apple-touch-icon.png','favicon.ico','share-image.jpg']){
  assert.ok(fs.existsSync(path.join(root,asset)),`required release asset missing: ${asset}`);
}

// STAGE84: release contains only the canonical social preview asset and no obsolete stage files.
assert.ok(fs.existsSync(path.join(root,'share-image.jpg')));
assert.equal(fs.existsSync(path.join(root,'share-image-v78.jpg')),false);
const releaseNames=fs.readdirSync(root);
assert.equal(releaseNames.some(name=>/^README_STAGE(?!84)/i.test(name)),false);
assert.equal(releaseNames.some(name=>/^FINAL_SQL_STAGE(?!84)/i.test(name)),false);
const textBundle=[index,app,admin,sync,css,read('README_STAGE84.txt'),read('FINAL_SQL_STAGE84.sql')].join('\n');
assert.doesNotMatch(textBundle,/STAGE(?:7[0-9]|8[0-3])|FINAL_SQL_STAGE(?:7[0-9]|8[0-3])|share-image-v78/i);

console.log('STAGE84_SMOKE_OK');
