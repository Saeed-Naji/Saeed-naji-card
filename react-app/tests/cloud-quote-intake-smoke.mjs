import assert from 'node:assert/strict';

const url=process.env.VITE_CORP_SUPABASE_URL?.trim();
const key=process.env.VITE_CORP_SUPABASE_PUBLISHABLE_KEY?.trim();
assert.equal(new URL(url||'https://invalid.example').hostname,'afrvoshsiqartsketiuv.supabase.co');
assert.match(key||'',/^sb_publishable_/);
const endpoint=new URL('/functions/v1/corp-submit-quote',url);
const common={origin:'https://saeed-naji.github.io',apikey:key,'content-type':'application/json'};
const opts=await fetch(endpoint,{method:'OPTIONS',headers:common,signal:AbortSignal.timeout(15000)});
assert.equal(opts.status,204,'Expected CORS preflight for official Saeed website');
assert.equal(opts.headers.get('access-control-allow-origin'),'https://saeed-naji.github.io');
const get=await fetch(endpoint,{method:'GET',headers:common,signal:AbortSignal.timeout(15000)});
assert.equal(get.status,405,'Only POST is allowed');
const denied=await fetch(endpoint,{method:'POST',headers:common,body:JSON.stringify({}),signal:AbortSignal.timeout(15000)});
assert.ok([400,503].includes(denied.status),`Invalid quote unexpectedly accepted: ${denied.status}`);
const obj=await denied.json();
assert.equal(obj.ok,false);
console.log('PASS: production quote Edge Function CORS, method restrictions and rejection of unauthenticated/invalid submission');
