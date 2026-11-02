import { createClient } from '@supabase/supabase-js';
import type { BrandSettings, Product, ProductStatus } from './types';
import { defaultSettings } from './logic';

// Only a NEW, independent project's browser-safe publishable key belongs here.
// With no configuration, the site keeps the previous demonstration catalog.
const url = (import.meta.env.VITE_CORP_SUPABASE_URL ?? '').trim();
const key = (import.meta.env.VITE_CORP_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
export const cloudEnabled = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) && /^sb_publishable_[a-zA-Z0-9_-]+$/.test(key);
export const cloudClient = cloudEnabled ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;

export type ProductRow = {
  id: string; sku: string; name_ar: string; name_en: string; category: string;
  installation: string; power_w: number; cct_k: number; lumens: number; cri: number;
  ip_rating: string; beam_degrees: number; image_path: string; description: string;
  stock_status: ProductStatus; visible: boolean;
};
export type BusinessRow = {
  singleton: true; company_name: string; registration_number: string; tax_number: string;
  contact_phone: string; whatsapp_phone: string; hero_title: string; hero_description: string;
  show_prices: boolean; is_published: boolean;
};
export const productColumns = 'id,sku,name_ar,name_en,category,installation,power_w,cct_k,lumens,cri,ip_rating,beam_degrees,image_path,description,stock_status,visible';
export const businessColumns = 'singleton,company_name,registration_number,tax_number,contact_phone,whatsapp_phone,hero_title,hero_description,show_prices,is_published';

export function fromProductRow(r: ProductRow): Product {
  return { id:r.id, sku:r.sku, name:r.name_ar, nameEn:r.name_en, category:r.category,
    installation:r.installation, watt:Number(r.power_w), cct:Number(r.cct_k),
    lumens:Number(r.lumens), cri:Number(r.cri), ip:r.ip_rating, beam:Number(r.beam_degrees),
    image:r.image_path, description:r.description, status:r.stock_status, visible:r.visible };
}
export function toProductRow(p: Product): ProductRow {
  return { id:p.id, sku:p.sku, name_ar:p.name, name_en:p.nameEn, category:p.category,
    installation:p.installation, power_w:p.watt, cct_k:p.cct, lumens:p.lumens,
    cri:p.cri, ip_rating:p.ip, beam_degrees:p.beam, image_path:p.image,
    description:p.description, stock_status:p.status, visible:p.visible };
}
export function fromBusinessRow(r: BusinessRow): BrandSettings {
  return { name:r.company_name, commercialRegistration:r.registration_number, taxNumber:r.tax_number,
    phone:r.contact_phone, whatsapp:r.whatsapp_phone, heroTitle:r.hero_title || defaultSettings.heroTitle,
    heroDescription:r.hero_description || defaultSettings.heroDescription, showPrices:r.show_prices };
}
export function toBusinessRow(s: BrandSettings, published: boolean): BusinessRow {
  return { singleton:true, company_name:s.name, registration_number:s.commercialRegistration,
    tax_number:s.taxNumber, contact_phone:s.phone, whatsapp_phone:s.whatsapp,
    hero_title:s.heroTitle, hero_description:s.heroDescription, show_prices:s.showPrices,
    is_published:published };
}
export async function readPublicCatalog(): Promise<{products:Product[]; settings:BrandSettings}> {
  if (!cloudClient) throw new Error('Cloud database is not configured');
  const [p,b] = await Promise.all([
    cloudClient.from('corp_products').select(productColumns).eq('visible',true).order('sku').limit(1000),
    cloudClient.from('corp_business_info').select(businessColumns).eq('singleton',true).maybeSingle()
  ]);
  if (p.error || b.error) throw new Error('تعذر تحميل الكتالوج من الخادم');
  return { products:((p.data ?? []) as ProductRow[]).map(fromProductRow),
    settings: b.data ? fromBusinessRow(b.data as BusinessRow) : defaultSettings };
}
