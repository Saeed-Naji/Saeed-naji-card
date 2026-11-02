import type { Product } from './types';
export type CatalogSort = 'newest'|'name'|'power_asc'|'power_desc';
export const CATALOG_PAGE_SIZE=12;
export function sortCatalogProducts(items:Product[],sort:CatalogSort):Product[]{
  const next=[...items];
  if(sort==='name')return next.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
  if(sort==='power_asc')return next.sort((a,b)=>a.watt-b.watt||a.name.localeCompare(b.name,'ar'));
  if(sort==='power_desc')return next.sort((a,b)=>b.watt-a.watt||a.name.localeCompare(b.name,'ar'));
  return next;
}
export function catalogPath(category?:string):string {
  return './?catalog=1'+(category?'&category='+encodeURIComponent(category):'');
}
