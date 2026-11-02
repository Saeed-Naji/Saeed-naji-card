import { createWorkbook } from './export';

export type QuoteStatus = 'new'|'in_review'|'responded'|'closed';
export type QuoteRow = {
  id:string;customer_name:string;customer_contact:string;company_name:string;
  message:string;items:unknown;status:QuoteStatus;created_at:string
};
export type QuoteProduct = { sku:string;name:string;quantity:number };
export const quoteLabels:Record<QuoteStatus,string> = {
  new:'جديد',in_review:'قيد المراجعة',responded:'تم الرد',closed:'مغلق'
};
export const quoteStatuses:QuoteStatus[]=['new','in_review','responded','closed'];

// The DB contains server-validated snapshots, but older rows might use a different shape.
// Parse unknown JSON defensively, never interpolate customer text into HTML.
export function quoteProducts(input:unknown):QuoteProduct[] {
  if (!Array.isArray(input))return [];
  const result:QuoteProduct[]=[];
  for(const value of input.slice(0,30)){
    if(!value||typeof value!=='object'||Array.isArray(value))continue;
    const r=value as Record<string,unknown>;
    const name=typeof r.name==='string'?r.name.slice(0,180):'منتج';
    const sku=typeof r.sku==='string'?r.sku.slice(0,100):'—';
    const quantity=typeof r.quantity==='number'&&Number.isSafeInteger(r.quantity)&&r.quantity>0&&r.quantity<=9999
      ?r.quantity:0;
    if(quantity>0)result.push({name,sku,quantity});
  }
  return result;
}
export function filterQuotes(rows:QuoteRow[],status:QuoteStatus|'all',search:string):QuoteRow[]{
  const query=search.trim().toLocaleLowerCase();
  return rows.filter(q=>{
    if(status!=='all'&&q.status!==status)return false;
    if(!query)return true;
    const haystack=[q.customer_name,q.customer_contact,q.company_name,q.id,
      ...quoteProducts(q.items).flatMap(item=>[item.name,item.sku])]
      .join(' ').toLocaleLowerCase();
    return haystack.includes(query);
  });
}
export function exportAdminQuotes(rows:QuoteRow[]):Uint8Array {
  const out:Array<Array<string|number>>=[[
    'رقم الطلب','التاريخ','العميل','التواصل','المنشأة','الحالة','كود المنتج','اسم المنتج','الكمية','ملاحظات العميل'
  ]];
  for(const q of rows){
    const items=quoteProducts(q.items);
    if(!items.length){
      out.push([q.id,q.created_at,q.customer_name,q.customer_contact,q.company_name,quoteLabels[q.status]??q.status,'','','',q.message]);
      continue;
    }
    for(const item of items)
      out.push([q.id,q.created_at,q.customer_name,q.customer_contact,q.company_name,quoteLabels[q.status]??q.status,
        item.sku,item.name,item.quantity,q.message]);
  }
  return createWorkbook(out,'طلبات الأسعار');
}
