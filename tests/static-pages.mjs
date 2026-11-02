import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { Script } from 'node:vm';

const root = process.cwd();
const pages = ['index.html','about.html','services.html','projects.html','contact.html'];
const errors = [];
const htmlByPage = new Map();

for (const page of pages) {
  const filepath = join(root,page);
  if (!existsSync(filepath)) { errors.push('Missing page: '+page); continue; }
  const html = readFileSync(filepath,'utf8');
  htmlByPage.set(page,html);
  if (!/<html\s+[^>]*lang="ar"[^>]*dir="rtl"/i.test(html)) errors.push(page+': missing Arabic RTL html');
  if (!/<meta\s+name="viewport"/i.test(html)) errors.push(page+': missing viewport');
  if (!/<meta\s+name="robots"\s+content="noindex,nofollow"/i.test(html)) errors.push(page+': demo should not be indexed');
  if (!/<h1\b/i.test(html)) errors.push(page+': missing heading');
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(page+': missing title');
  if (page !== 'index.html' && !/href="pages\.css"/.test(html)) errors.push(page+': missing styles');
  if (/<form\b[^>]*action=["']https?:/i.test(html)) errors.push(page+': unexpectedly public form action');
  for (const [,href] of html.matchAll(/\bhref="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|#|javascript:|data:)/i.test(href)) continue;
    const [local,targetAnchor] = href.split('#');
    const target = (local || page).split('?')[0];
    if (target.startsWith('/') || target.includes('..')) {errors.push(page+': unsafe local link '+href);continue;}
    if (!existsSync(join(root,dirname(page),target))) {errors.push(page+': broken local link '+href);continue;}
    if (targetAnchor && target.endsWith('.html')) {
      const targetHtml = htmlByPage.get(target) || readFileSync(join(root,target),'utf8');
      if (!targetHtml.includes('id="'+targetAnchor+'"')) errors.push(page+': missing anchor '+href);
    }
  }
}
assert.ok(existsSync(join(root,'pages.css')),'Missing shared stylesheet');
const home = htmlByPage.get('index.html')||'';
const scripts = [...home.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)];
if (!scripts.length) errors.push('Homepage missing interactive script');
for (const match of scripts) {
  try { new Script(match[1],{filename:'index.html:inline'}); }
  catch (e) { errors.push('Homepage JavaScript syntax: '+e.message); }
}
for (const page of pages) {
  for (const link of ['index.html','about.html','services.html','projects.html','contact.html']) {
    if (!htmlByPage.get(page)?.includes('href="'+link+'"')) errors.push(page+': menu link missing '+link);
  }
}
if (errors.length) {
  console.error('STATIC PAGE VALIDATION FAILED\n'+errors.map((s,i)=> (i+1)+'. '+s).join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS: validated '+pages.length+' corporate pages, all local links, headings, demo indexing and JavaScript syntax.');
}
