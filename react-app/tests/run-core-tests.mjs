import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=join(root,'tests','.compiled');
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const compiled=spawnSync('tsc',['--strict','--skipLibCheck','--target','es2022','--lib','es2022,dom','--module','commonjs','--moduleResolution','node','--rootDir','src','--outDir',out,'src/logic.ts','src/export.ts','src/types.ts','src/portable.ts','src/gallery.ts','src/quote-request.ts,'src/quote-admin.ts'],{cwd:root,encoding:'utf8'});
if(compiled.status!==0){console.error(compiled.stdout,compiled.stderr);process.exit(1);}
writeFileSync(join(out,'package.json'),'{'+'"type":"commonjs"}');
const require=createRequire(import.meta.url);
const logic=require(join(out,'logic.js'));
const exported=require(join(out,'export.js'));
const portable=require(join(out,'portable.js'));
const gallery=require(join(out,'gallery.js'));
const quoteRequest=require(join(out,'quote-request.js'));
const quoteAdmin=require(join(out,'quote-admin.js'));


const all=logic.demoProducts;
const same=logic.filterProducts(all,{...logic.EMPTY_FILTERS,category:'داون لايت'});
assert.equal(same.length,1);assert.equal(same[0].sku,'FL-DL-12');
assert.deepEqual(logic.filterOptions(all,{...logic.EMPTY_FILTERS,category:'داون لايت'},'cct'),['3000']);
assert.equal(logic.filterProducts(all,{...logic.EMPTY_FILTERS,search:'FL-SP-20'}).length,1);
assert.equal(logic.normalizeText('إِضَاءَة'), 'إضاءة');
assert.equal(logic.clampQuantity(100000),9999);
assert.equal(logic.clampQuantity(NaN),1);
const cart=logic.updateCart([],all[0].id,3);assert.equal(cart[0].quantity,3);
assert.equal(logic.updateCart(cart,all[0].id,0).length,0);
const msg=logic.makeWhatsAppMessage(cart,all,logic.defaultSettings);
assert.ok(msg.includes('FL-DL-12 × 3'));assert.ok(!msg.includes('× 0'));
assert.equal(logic.validateProduct({...all[0],id:'new-product'},all).includes('كود المنتج مكرر'),true);
assert.equal(logic.sanitizeCart([{productId:all[0].id,quantity:4},{productId:'deleted',quantity:2}],all).length,1);
assert.deepEqual(logic.safelyParseJson('{bad json'),null);
const good=exported.exportProductsExcel(all);
assert.deepEqual(Array.from(good.slice(0,2)),[80,75]);
const quote=exported.exportQuoteExcel(cart,all);
assert.deepEqual(Array.from(quote.slice(0,2)),[80,75]);
const excelOut=join(root,'tests','_verification.xlsx');
writeFileSync(excelOut,good);
const quoteOut=join(root,'tests','_quote_verification.xlsx');writeFileSync(quoteOut,quote);
console.log('PASS: 12 core assertions and 2 native XLSX exports');

assert.equal(logic.parseQuantityInput(''),null);
assert.equal(logic.parseQuantityInput('١٢'),12);
assert.equal(logic.parseQuantityInput('۴۲'),42);
assert.equal(logic.parseQuantityInput('999999'),9999);
assert.equal(logic.parseQuantityInput('1abc'),null);
const full=Array.from({length:30},(_,i)=>({productId:`a-${i}`,quantity:1}));
assert.deepEqual(logic.updateCart(full,'new',1),full,'adding the 31st product must never silently drop an old item');
assert.equal(logic.updateCart(full,'a-0',8).find(x=>x.productId==='a-0').quantity,8);
const saved=portable.makeSnapshot(all,logic.defaultSettings);
const restored=portable.parseSnapshot(saved);
assert.equal(restored.products.length,4);
assert.equal(restored.settings.name,logic.defaultSettings.name);
assert.throws(()=>portable.parseSnapshot('{bad'),/JSON/);
assert.throws(()=>portable.parseSnapshot(JSON.stringify({format:'wrong',products:[],settings:logic.defaultSettings})),/ليس نسخة/);
assert.throws(()=>portable.parseSnapshot(portable.makeSnapshot([all[0], {...all[0],id:'dup'}],logic.defaultSettings)),/مكرر/);
console.log('PASS: 12 additional regression assertions: numeric input, 30-item limit and portable data');

const photoSample = {...all[0],image:'https://example.com/a.webp',gallery:[]};
const addSecond = gallery.addProductImage(photoSample,'https://example.com/b.webp');
assert.deepEqual(gallery.productImages(addSecond),['https://example.com/a.webp','https://example.com/b.webp']);
const promoted = gallery.setPrimaryImage(addSecond,'https://example.com/b.webp');
assert.equal(promoted.image,'https://example.com/b.webp');
assert.deepEqual(promoted.gallery,['https://example.com/a.webp']);
const unlinked = gallery.unlinkProductImage(promoted,'https://example.com/b.webp');
assert.equal(unlinked.image,'https://example.com/a.webp');
assert.deepEqual(unlinked.gallery,[]);
let filled=photoSample;
for(let n=2;n<=5;n++) filled=gallery.addProductImage(filled,'https://example.com/'+n+'.webp');
assert.equal(gallery.productImages(filled).length,5);
assert.throws(()=>gallery.addProductImage(filled,'https://example.com/6.webp'),/خمس صور/);
assert.equal(gallery.productImages(filled).length,5);
assert.equal(gallery.productImages({...filled,gallery:[...filled.gallery,filled.image]}).length,5);
console.log('PASS: gallery five-image cap, deduplication, primary selection and safe unlink');

const productId='10000000-0000-4000-8000-000000000001';
const quoteSample=quoteRequest.prepareQuoteSubmission('   طالب عرض  ','+966 555 111 222','شركة تجريبية','ملاحظات',
  [{productId,quantity:3}],true,'verylong-valid-captcha-token-0123456789');
assert.equal(quoteSample.customerName,'طالب عرض');
assert.deepEqual(quoteSample.items,[{productId,quantity:3}]);
assert.equal(quoteSample.acceptedPrivacy,true);
assert.throws(()=>quoteRequest.prepareQuoteSubmission('A','0555555555','','',[{productId,quantity:1}],true,'valid-token-that-is-long-enough'),/اسمًا/);
assert.throws(()=>quoteRequest.prepareQuoteSubmission('شركة','0555555555','','',[{productId,quantity:1}],false,'valid-token-that-is-long-enough'),/الموافقة/);
assert.throws(()=>quoteRequest.prepareQuoteSubmission('شركة','0555555555','','',[{productId,quantity:0}],true,'valid-token-that-is-long-enough'),/غير صالحة/);
assert.throws(()=>quoteRequest.prepareQuoteSubmission('شركة','0555555555','','',[{productId,quantity:1}],true,''),/التحقق الأمني/);
assert.throws(()=>quoteRequest.prepareQuoteSubmission('شركة','0555555555','','',[{productId,quantity:1},{productId,quantity:2}],true,'valid-token-that-is-long-enough'),/غير صالحة/);
console.log('PASS: quote validation, consent, product quantities and duplicate prevention');

const demoQuote={
  id:'11111111-2222-4333-8444-555555555555',
  customer_name:'عميل تجريبي',
  customer_contact:'customer@example.com',
  company_name:'شركة اختبار',
  message:'الرجاء إرسال الأسعار',
  items:[{productId:'10000000-0000-4000-8000-000000000001',sku:'FL-DL-12',name:'داون لايت',quantity:4}],
  status:'new',created_at:'2026-11-02T12:00:00Z'
};
assert.deepEqual(quoteAdmin.quoteProducts(demoQuote.items),[{sku:'FL-DL-12',name:'داون لايت',quantity:4}]);
assert.deepEqual(quoteAdmin.quoteProducts([{sku:'A',name:'a',quantity:0},null,'bad']),[]);
assert.equal(quoteAdmin.filterQuotes([demoQuote],'new','FL-DL-12').length,1);
assert.equal(quoteAdmin.filterQuotes([demoQuote],'responded','FL-DL-12').length,0);
assert.equal(quoteAdmin.filterQuotes([demoQuote],'all','customer@example.com').length,1);
assert.equal(quoteAdmin.filterQuotes([demoQuote],'all','missing item').length,0);
const quotesXlsx=quoteAdmin.exportAdminQuotes([demoQuote]);
assert.deepEqual(Array.from(quotesXlsx.slice(0,2)),[80,75]);
assert.ok(quotesXlsx.length>1000);
console.log('PASS: private quote product details, status filter, search and native XLSX export');
