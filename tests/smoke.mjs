import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const app = read('app.js');
const admin = read('admin.js');
const sync = read('public-sync.js');
const css = read('style.css');
const manageAdmin = read('supabase/functions/manage-admin-account/index.ts');

assert.match(index, /Flower Light STAGE77/);
assert.doesNotMatch(index, /\?v=70/);
assert.match(index, /share-image\.jpg\?v=77/);
assert.match(admin, /createAdminDatasheetExport/);
assert.match(admin, /flDatasheetDesignerForm.*createAdminDatasheetExport/);
assert.doesNotMatch(admin, /createAdminDatasheetPdf/);
assert.doesNotMatch(app, /requestAnimationFrame\(\(\)=>renderSiteCatalogPages/);
assert.doesNotMatch(`${index}\n${app}\n${admin}\n${sync}`, /quote_service_visible|quoteModal|paperQuote|عرض عرض سعر|طلب عرض سعر|flSubmitImageQuoteRequest|quoteBucket/i);
assert.doesNotMatch(css, /\\n\\n/);
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
console.log('STAGE77_SMOKE_OK');
