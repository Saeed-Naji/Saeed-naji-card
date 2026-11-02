import { cloudClient } from './cloud';

// Only public product photographs belong here; do not upload customer images or private files.
export const CORPORATE_IMAGE_BUCKET = 'corp-product-images';
export const MAX_CORPORATE_IMAGE_BYTES = 3 * 1024 * 1024;

function hasImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === 'image/jpeg') return bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
  if (type === 'image/png') return bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 && bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a;
  if (type === 'image/webp') return String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  return false;
}

export async function uploadCorporateProductImage(file:File):Promise<string> {
  if (!cloudClient) throw new Error('لم يتم تفعيل الاتصال بقاعدة Saeed.');
  const extensions: Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  if (!extensions[file.type]) throw new Error('الصيغ المقبولة: JPG أو PNG أو WebP فقط.');
  if (file.size===0 || file.size>MAX_CORPORATE_IMAGE_BYTES) throw new Error('حجم الصورة يجب ألا يتجاوز 3 ميغابايت.');
  const header=new Uint8Array(await file.slice(0,12).arrayBuffer());
  if (!hasImageSignature(header,file.type)) throw new Error('ملف الصورة غير صالح أو امتداده لا يطابق محتواه.');
  const path='catalog/'+crypto.randomUUID()+'.'+extensions[file.type];
  const {data,error}=await cloudClient.storage.from(CORPORATE_IMAGE_BUCKET).upload(path,file,{
    cacheControl:'3600',upsert:false,contentType:file.type
  });
  if(error || !data?.path) throw new Error('تعذر رفع الصورة. تحقق من صلاحيات حسابك وصيغة الملف.');
  const {data:url}=cloudClient.storage.from(CORPORATE_IMAGE_BUCKET).getPublicUrl(data.path);
  if(!url.publicUrl.startsWith('https://')) throw new Error('تعذر الحصول على رابط الصورة.');
  return url.publicUrl;
}
