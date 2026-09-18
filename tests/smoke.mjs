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

assert.match(index, /Flower Light STAGE73/);
assert.doesNotMatch(index, /\?v=70/);
assert.match(index, /share-image\.jpg\?v=73/);
assert.match(admin, /createAdminDatasheetExport/);
assert.match(admin, /flDatasheetDesignerForm.*createAdminDatasheetExport/);
assert.doesNotMatch(admin, /createAdminDatasheetPdf/);
assert.doesNotMatch(app, /requestAnimationFrame\(\(\)=>renderSiteCatalogPages/);
assert.doesNotMatch(`${index}\n${app}\n${admin}\n${sync}`, /quote_service_visible|quoteModal|paperQuote|عرض عرض سعر|طلب عرض سعر|flSubmitImageQuoteRequest|quoteBucket/i);
assert.doesNotMatch(css, /\\n\\n/);
assert.ok(fs.statSync(path.join(root, 'share-image.jpg')).size > 1000, 'share image is missing or empty');
assert.ok(fs.existsSync(path.join(root, 'supabase/functions/manage-admin-account/index.ts')));
assert.doesNotMatch(manageAdmin, /['"]quotes['"]|['"]services['"]/i);

for (const file of ['index.html', 'app.js', 'admin.js', 'public-sync.js']) {
  execFileSync(process.execPath, file === 'index.html' ? ['--check', 'tests/smoke.mjs'] : ['--check', file], { cwd: root, stdio: 'ignore' });
}
execFileSync(process.execPath, ['--experimental-strip-types', '--check', 'supabase/functions/manage-admin-account/index.ts'], { cwd: root, stdio: 'ignore' });

console.log('STAGE73_SMOKE_OK');
