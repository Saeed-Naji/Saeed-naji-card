import type { BrandSettings, CartItem, Filters, Product } from './types';

export const PRODUCTS_KEY = 'fl_corporate_independent_products_v1';
export const CART_KEY = 'fl_corporate_independent_quote_v1';
export const SETTINGS_KEY = 'fl_corporate_independent_settings_v1';
export const EMPTY_FILTERS: Filters = { search: '', category: '', cct: '', installation: '', status: '' };
export const defaultSettings: BrandSettings = {
  name: 'FLOWER LIGHT — DEMO', commercialRegistration: '', taxNumber: '',
  phone: '', whatsapp: '', showPrices: false,
  heroTitle: 'الضوء الذي يمنح المكان هويته',
  heroDescription: 'حلول إنارة معمارية تجمع الأداء والجمال في كل تفصيلة. تصفح المنتجات واطلب عرض سعر يناسب مشروعك.'
};
export const demoProducts: Product[] = [
  { id:'demo-1',sku:'FL-DL-12',name:'داون لايت معماري',nameEn:'Architectural Downlight',category:'داون لايت',installation:'سقفي غاطس',watt:12,cct:3000,lumens:1080,cri:90,ip:'IP44',beam:36,image:'',description:'إضاءة دقيقة للمساحات الداخلية.',status:'available',visible:true },
  { id:'demo-2',sku:'FL-SP-20',name:'سبوت لايت احترافي',nameEn:'Professional Spotlight',category:'سبوت لايت',installation:'سكة إضاءة',watt:20,cct:4000,lumens:1850,cri:90,ip:'IP20',beam:24,image:'',description:'توجيه مرن للضوء وإبراز التفاصيل.',status:'available',visible:true },
  { id:'demo-3',sku:'FL-LN-16',name:'إنارة خطية',nameEn:'Linear Light',category:'إنارة خطية',installation:'معلق',watt:16,cct:6500,lumens:1700,cri:80,ip:'IP20',beam:110,image:'',description:'خطوط ضوء متجانسة للمكاتب والمساحات المفتوحة.',status:'soon',visible:true },
  { id:'demo-4',sku:'FL-OD-10',name:'وحدة إضاءة خارجية',nameEn:'Outdoor Wall Light',category:'إنارة خارجية',installation:'جداري',watt:10,cct:3000,lumens:760,cri:80,ip:'IP65',beam:60,image:'',description:'حل عملي للواجهات والممرات الخارجية.',status:'available',visible:true }
];

export const normalizeText = (value: string) => String(value || '').toLocaleLowerCase('ar').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '').trim();
export const clampQuantity = (value: number) => Number.isFinite(value) ? Math.max(1, Math.min(9999, Math.trunc(value))) : 1;
// Preserve the field contents until blur/Enter so clearing a quantity doesn't delete its product.
export function parseQuantityInput(input: string): number | null {
  const normalized = input.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0));
  if (!/^\d+$/.test(normalized)) return null;
  return clampQuantity(Number(normalized));
}
export const visibleProducts = (items: Product[]) => items.filter(p => p.visible);
export function filterProducts(items: Product[], filters: Filters): Product[] {
  const term = normalizeText(filters.search);
  return items.filter(p => p.visible && (!term || [p.name,p.nameEn,p.sku,p.description,p.category].some(v => normalizeText(v).includes(term)))
    && (!filters.category || p.category === filters.category)
    && (!filters.cct || String(p.cct) === filters.cct)
    && (!filters.installation || p.installation === filters.installation)
    && (!filters.status || p.status === filters.status));
}
export function filterOptions(items: Product[], filters: Filters, dimension: keyof Filters): string[] {
  if (dimension === 'search') return [];
  const copy = { ...filters, [dimension]: '' };
  const values = filterProducts(items, copy).map(p => String(p[dimension]));
  return [...new Set(values)].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true}));
}
export function updateCart(cart: CartItem[], productId: string, quantity: number): CartItem[] {
  const qty = Math.max(0, Math.min(9999, Math.trunc(Number.isFinite(quantity) ? quantity : 0)));
  const rest = cart.filter(c => c.productId !== productId);
  return qty ? (rest.length >= 30 ? cart : [...rest, {productId, quantity:qty}]) : rest;
}
export function sanitizeCart(cart: unknown, products: Product[]): CartItem[] {
  if (!Array.isArray(cart)) return [];
  const valid = new Set(products.filter(p => p.visible).map(p => p.id));
  const map = new Map<string, number>();
  for (const item of cart) {
    if (item && typeof item.productId === 'string' && valid.has(item.productId) && Number.isFinite(Number(item.quantity))) {
      map.set(item.productId, clampQuantity(Number(item.quantity)));
    }
  }
  return [...map.entries()].slice(0,30).map(([productId, quantity]) => ({productId, quantity}));
}
export function makeWhatsAppMessage(cart: CartItem[], products: Product[], settings: BrandSettings): string {
  const byId = new Map(products.filter(p => p.visible).map(p => [p.id,p]));
  const lines = cart.map(c => { const p = byId.get(c.productId); return p ? `• ${p.sku} × ${clampQuantity(c.quantity)} — ${p.name.slice(0,80)}` : ''; }).filter(Boolean);
  return [`مرحبًا، أرجو تزويدي بعرض سعر للمنتجات التالية:`, ...lines, '', `الجهة: ${settings.name}`, 'شكرًا لكم.'].join('\n');
}
export function validateProduct(input: Product, existing: Product[]): string[] {
  const issues: string[] = [];
  if (!input.name.trim()) issues.push('اسم المنتج مطلوب');
  if (!input.sku.trim()) issues.push('كود المنتج مطلوب');
  if (existing.some(p=>p.id!==input.id && normalizeText(p.sku)===normalizeText(input.sku))) issues.push('كود المنتج مكرر');
  if (!input.category.trim()) issues.push('القسم مطلوب');
  if (![input.watt,input.lumens,input.cri,input.cct,input.beam].every(n=>Number.isFinite(n) && n>=0)) issues.push('تحقق من المواصفات الرقمية');
  if (!['available','soon','unavailable'].includes(input.status)) issues.push('حالة المنتج غير صحيحة');
  return issues;
}
export function safelyParseJson(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}
export function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const p=value as Record<string,unknown>;
  return ['id','sku','name','nameEn','category','installation','ip','image','description'].every(k=>typeof p[k]==='string')
    && ['watt','cct','lumens','cri','beam'].every(k=>typeof p[k]==='number' && Number.isFinite(p[k]))
    && typeof p.visible==='boolean' && ['available','soon','unavailable'].includes(String(p.status));
}
