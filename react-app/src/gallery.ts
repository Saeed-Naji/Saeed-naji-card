import type { Product } from './types';

export const MAX_PRODUCT_IMAGES = 5;

type PhotoFields = Pick<Product, 'image' | 'gallery'>;

export function productImages(product: PhotoFields): string[] {
  const urls = [product.image, ...(product.gallery ?? [])];
  const unique: string[] = [];
  for (const entry of urls) {
    if (typeof entry !== 'string') continue;
    const url = entry.trim();
    if (url && !unique.includes(url)) unique.push(url);
    if (unique.length === MAX_PRODUCT_IMAGES) break;
  }
  return unique;
}

export function addProductImage(product: Product, url: string): Product {
  const next = url.trim();
  if (!next) throw new Error('رابط الصورة غير صالح');
  const images = productImages(product);
  if (images.includes(next)) return product;
  if (images.length >= MAX_PRODUCT_IMAGES) throw new Error('الحد الأقصى هو خمس صور لكل منتج.');
  return { ...product, image: images[0] ?? next, gallery: images.length ? [...images.slice(1), next] : [] };
}

export function setPrimaryImage(product: Product, url: string): Product {
  const images = productImages(product);
  if (!images.includes(url)) return product;
  const reordered = [url, ...images.filter(x => x !== url)];
  return { ...product, image: reordered[0], gallery: reordered.slice(1) };
}

export function unlinkProductImage(product: Product, url: string): Product {
  const images = productImages(product).filter(x => x !== url);
  return { ...product, image: images[0] ?? '', gallery: images.slice(1) };
}
