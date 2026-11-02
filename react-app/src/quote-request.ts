import type { CartItem } from './types';

export type QuoteSubmission = {
  customerName: string;
  contact: string;
  company: string;
  message: string;
  items: {productId:string;quantity:number}[];
  acceptedPrivacy: true;
  captchaToken: string;
};
const UUID = /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/;
export function prepareQuoteSubmission(
  name:string,contact:string,company:string,message:string,
  cart:CartItem[],accepted:boolean,token:string
):QuoteSubmission {
  const customerName=name.trim();
  const contactInfo=contact.trim();
  if(customerName.length<2||customerName.length>120)throw new Error('اكتب اسمًا من حرفين إلى 120 حرفًا.');
  if(contactInfo.length<8||contactInfo.length>160)throw new Error('اكتب رقم تواصل أو بريدًا إلكترونيًا صحيحًا.');
  const validContact=contactInfo.includes('@')?
    /^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,}$/.test(contactInfo):
    /^\+?[0-9\s()\-]{8,20}$/.test(contactInfo)&&contactInfo.replace(/\D/g,'').length>=8;
  if(!validContact)throw new Error('رقم الهاتف أو البريد الإلكتروني غير صالح.');
  if(company.trim().length>120||message.trim().length>1000)throw new Error('نص الشركة أو الملاحظات طويل جدًا.');
  if(!Array.isArray(cart)||cart.length<1||cart.length>30)throw new Error('اختر من منتج واحد إلى 30 منتجًا.');
  const unique=new Set<string>();
  const items=cart.map(({productId,quantity})=>{
    if(!UUID.test(productId)||!Number.isSafeInteger(quantity)||quantity<1||quantity>9999||unique.has(productId))
      throw new Error('قائمة المنتجات غير صالحة. حدّث الكتالوج وحاول مجددًا.');
    unique.add(productId);
    return {productId,quantity};
  });
  if(!accepted)throw new Error('يلزم الموافقة على استخدام بيانات التواصل للرد على طلبك.');
  if(token.length<20||token.length>2048)throw new Error('أكمل التحقق الأمني قبل الإرسال.');
  return {customerName,contact:contactInfo,company:company.trim(),message:message.trim(),items,acceptedPrivacy:true,captchaToken:token};
}
