export type ProductStatus = 'available' | 'soon' | 'unavailable';
export type Product = {
  id: string;
  sku: string;
  name: string;
  nameEn: string;
  category: string;
  installation: string;
  watt: number;
  cct: number;
  lumens: number;
  cri: number;
  ip: string;
  beam: number;
  image: string;
  gallery?: string[]; // Up to four additional photos; image remains primary.
  description: string;
  status: ProductStatus;
  visible: boolean;
};
export type CartItem = { productId: string; quantity: number };
export type BrandSettings = { name: string; commercialRegistration: string; taxNumber: string; phone: string; whatsapp: string; showPrices: boolean; heroTitle: string; heroDescription: string };
export type Filters = { search: string; category: string; cct: string; installation: string; status: string };
