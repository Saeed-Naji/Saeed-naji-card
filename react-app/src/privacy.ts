import { cloudClient } from './cloud';

export type CorporatePrivacyPolicy = {
  singleton: boolean;
  controller_name: string;
  privacy_contact: string;
  purpose: string;
  recipients: string;
  rights_instructions: string;
  retention_days: number | null;
  is_published: boolean;
  approved_at: string | null;
  updated_at: string;
};
export const privacyColumns='singleton,controller_name,privacy_contact,purpose,recipients,rights_instructions,retention_days,is_published,approved_at,updated_at';

export function publicationIssues(p:CorporatePrivacyPolicy):string[] {
  const issues:string[]=[];
  if(p.controller_name.trim().length<2||p.controller_name.length>180)issues.push('أدخل اسم الجهة المسؤولة عن البيانات.');
  if(p.privacy_contact.trim().length<5||p.privacy_contact.length>180)issues.push('أدخل وسيلة صحيحة للتواصل بشأن الخصوصية.');
  if(p.purpose.trim().length<20||p.purpose.length>2500)issues.push('اشرح الغرض من جمع بيانات العملاء بوضوح.');
  if(p.recipients.trim().length<10||p.recipients.length>2500)issues.push('وضّح الجهات التي تتلقى البيانات، أو عدم مشاركتها.');
  if(p.rights_instructions.trim().length<20||p.rights_instructions.length>2500)issues.push('اشرح طريقة طلب الاطلاع أو التصحيح أو الحذف.');
  if(!Number.isInteger(p.retention_days)||p.retention_days===null||p.retention_days<1||p.retention_days>3650)
    issues.push('حدد مدة احتفاظ من يوم واحد إلى 3650 يومًا.');
  return issues;
}
export async function getPublicPrivacy():Promise<CorporatePrivacyPolicy|null>{
  if(!cloudClient)return null;
  const {data,error}=await cloudClient.from('corp_privacy_policy').select(privacyColumns)
    .eq('singleton',true).eq('is_published',true).maybeSingle();
  if(error)throw new Error('تعذر قراءة بيان الخصوصية المنشور.');
  return (data??null) as CorporatePrivacyPolicy|null;
}
