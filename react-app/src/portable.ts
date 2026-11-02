import type { BrandSettings, Product } from './types';
import { defaultSettings, isProduct, validateProduct } from './logic';
import { productImages } from './gallery';

const SIGNATURE = 'flower-light-corporate-independent-v1';
export function makeSnapshot(products: Product[], settings: BrandSettings): string {
  return JSON.stringify({ format: SIGNATURE, exportedAt: new Date().toISOString(), products, settings }, null, 2);
}
export function parseSnapshot(text: string): { products: Product[]; settings: BrandSettings } {
  if (text.length > 5_000_000) throw new Error('حجم الملف يتجاوز الحد المسموح (5MB)');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('ملف JSON غير صالح'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('صيغة النسخة غير صحيحة');
  const obj = data as Record<string, unknown>;
  if (obj.format !== SIGNATURE) throw new Error('هذا الملف ليس نسخة بيانات للمشروع المؤسسي المستقل');
  if (!Array.isArray(obj.products) || obj.products.length > 5000) throw new Error('عدد المنتجات غير صالح (الحد 5000)');
  const products: Product[] = [];
  const ids = new Set<string>();
  for (const item of obj.products) {
    if (!isProduct(item)) throw new Error('بيانات منتج غير صحيحة في الملف');
    if (ids.has(item.id) || !item.id.trim()) throw new Error('معرف منتج مكرر أو فارغ');
    const issues = validateProduct(item, products);
    if (issues.length) throw new Error(`${item.sku || 'منتج'}: ${issues.join('، ')}`);
    // Copy known keys rather than retaining arbitrary imported properties.
    products.push({id:item.id,sku:item.sku,name:item.name,nameEn:item.nameEn,category:item.category,
      installation:item.installation,watt:item.watt,cct:item.cct,lumens:item.lumens,cri:item.cri,
      ip:item.ip,beam:item.beam,image:item.image,gallery:productImages(item).slice(1),description:item.description,status:item.status,visible:item.visible});
    ids.add(item.id);
  }
  if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings)) throw new Error('إعدادات المنشأة غير صحيحة');
  const incoming = obj.settings as Record<string, unknown>;
  const settings: BrandSettings = {...defaultSettings};
  for (const key of Object.keys(defaultSettings) as (keyof BrandSettings)[]) {
    const current = incoming[key];
    if (typeof current !== typeof defaultSettings[key]) throw new Error(`إعداد غير صالح: ${key}`);
    (settings as unknown as Record<string,unknown>)[key] = current;
  }
  return {products,settings};
}
export function downloadSnapshot(contents: string, filename='flower-light-corporate-local-data.json'): void {
  const blob = new Blob([contents], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href=url; anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 3000);
}
