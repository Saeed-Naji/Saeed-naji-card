// Saeed Naji Corporate only: afrvoshsiqartsketiuv.
// Public endpoint but ALWAYS requires successful Turnstile verification.
// No customer data or secret key is returned in responses.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const ALLOWED_ORIGINS = new Set([
  'https://saeed-naji.github.io',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:5173',
]);
const MAX_BODY_BYTES = 16000;
const MAX_ITEMS = 30;
const errResponse = (code:string,status:number,cors:Record<string,string>) =>
  new Response(JSON.stringify({ok:false,code}),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});

async function readSmallJson(req:Request):Promise<unknown> {
  if(!req.body) throw new Error('empty body');
  const reader=req.body.getReader();
  const buffers:Uint8Array[]=[];
  let size=0;
  try {
    while(true){
      const part=await reader.read();
      if(part.done)break;
      if(!(part.value instanceof Uint8Array))throw new Error('invalid data');
      size+=part.value.byteLength;
      if(size>MAX_BODY_BYTES)throw new Error('too big');
      buffers.push(part.value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of buffers){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
function stringField(input:unknown,max:number,min=0):string|null {
  if(typeof input!=='string') return null;
  const out=input.trim();
  if(out.length<min||out.length>max||/[\u0000-\u001f\u007f]/.test(out))return null;
  return out;
}
function parseItems(input:unknown):{productId:string;quantity:number}[]|null {
  if(!Array.isArray(input)||input.length<1||input.length>MAX_ITEMS)return null;
  const found=new Set<string>(),result:{productId:string;quantity:number}[]=[];
  for(const item of input){
    if(!item||typeof item!=='object'||Array.isArray(item))return null;
    const row=item as Record<string,unknown>;
    if(typeof row.productId!=='string'||!(/^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/).test(row.productId))return null;
    if(typeof row.quantity!=='number'||!Number.isSafeInteger(row.quantity)||row.quantity<1||row.quantity>9999)return null;
    const productId=row.productId.toLowerCase();
    if(found.has(productId))return null;
    found.add(productId);result.push({productId,quantity:row.quantity});
  }
  return result;
}
function contactValid(contact:string):boolean {
  if(contact.includes('@'))return /^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,}$/u.test(contact);
  return /^\+?[0-9\s()\-]{8,20}$/.test(contact)&&contact.replace(/\D/g,'').length>=8;
}
async function contactDigest(contact:string,secret:string):Promise<string> {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const input=new TextEncoder().encode(contact.replace(/[\s()-]/g,'').toLowerCase());
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,input));
  return Array.from(sig,x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('origin')??'';
  const cors:Record<string,string>={
    'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Vary':'Origin'
  };
  if(!ALLOWED_ORIGINS.has(origin))return new Response('Forbidden',{status:403});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='GET'&&req.method!=='POST')return errResponse('method_not_allowed',405,cors);

  // Do not leak secret values or accept customer data until the REAL Turnstile secret is set.
  const turnstileSecret=Deno.env.get('TURNSTILE_SECRET_KEY')??'';
  const projectUrl=Deno.env.get('SUPABASE_URL')??'';
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
  const expectedProject=projectUrl==='https://afrvoshsiqartsketiuv.supabase.co' ||
    projectUrl==='https://afrvoshsiqartsketiuv.supabase.co/';
  const configured=Boolean(turnstileSecret&&serviceKey&&expectedProject);
  // Operational readiness only. This does NOT prove a configured Turnstile secret is valid.
  if(req.method==='GET')return new Response(JSON.stringify({configured}),{
    status:200,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}
  });
  if(!configured)return errResponse('not_configured',503,cors);
  if(!(req.headers.get('content-type')??'').toLowerCase().startsWith('application/json'))
    return errResponse('invalid_input',415,cors);
  let body:unknown;
  try{body=await readSmallJson(req);}catch{return errResponse('invalid_input',400,cors);}
  if(!body||typeof body!=='object'||Array.isArray(body))return errResponse('invalid_input',400,cors);
  const data=body as Record<string,unknown>;
  const name=stringField(data.customerName,120,2);
  const contact=stringField(data.contact,160,8);
  const company=stringField(data.company,120);
  const message=stringField(data.message,1000);
  const captcha=stringField(data.captchaToken,2048,20);
  const items=parseItems(data.items);
  if(!name||!contact||!contactValid(contact)||company===null||message===null||!captcha||!items||data.acceptedPrivacy!==true)
    return errResponse('invalid_input',400,cors);

  try{
    const challenge=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret:turnstileSecret,response:captcha}),
      signal:AbortSignal.timeout(8500)
    });
    if(!challenge.ok)return errResponse('verification_failed',400,cors);
    const result=await challenge.json() as {success?:boolean;hostname?:string;action?:string};
    const expectedHostname=new URL(origin).hostname;
    if(result.success!==true||result.hostname!==expectedHostname||result.action!=='quote_submit')
      return errResponse('verification_failed',400,cors);

    const supabase=createClient(projectUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const fingerprint=await contactDigest(contact,serviceKey);
    const {data:quoteId,error}=await supabase.rpc('corp_submit_quote_secure',{
      p_customer_name:name,p_customer_contact:contact,p_company_name:company,
      p_message:message,p_items:items,p_contact_fingerprint:fingerprint
    });
    if(error||typeof quoteId!=='string'){
      if(error?.message?.includes('hourly quote limit'))return errResponse('rate_limited',429,cors);
      if(error?.message?.includes('unavailable')||error?.message?.includes('invalid'))return errResponse('invalid_input',400,cors);
      return errResponse('server_error',503,cors);
    }
    return new Response(JSON.stringify({ok:true}),{status:201,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
  }catch{
    return errResponse('server_error',503,cors);
  }
});
