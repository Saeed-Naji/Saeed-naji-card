import type { CartItem, Product } from './types';
import { clampQuantity } from './logic';

// Native XLSX writer: no CDN, network, Excel macro, or third-party runtime dependency.
// Uses inline strings to keep arbitrary product text as data (never as formulas).
const utf8 = new TextEncoder();
const xmlEsc = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function colName(index: number): string { let n=index+1, s=''; while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)} return s; }
function u16(v:number):number[]{return [v&255,(v>>>8)&255]}
function u32(v:number):number[]{return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
let crcTable: Uint32Array | null = null;
function crc32(bytes:Uint8Array):number{
  if(!crcTable){crcTable=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[i]=c>>>0}}
  let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;
}
function zip(entries: {name:string;data:string}[]):Uint8Array{
  if(entries.length>65535) throw new Error('عدد ملفات ZIP تجاوز الحد المسموح');
  const files:Uint8Array[]=[]; const centralParts:Uint8Array[]=[];
  let offset=0; let directoryLength=0;
  for(const entry of entries){
    const fileName=utf8.encode(entry.name), data=utf8.encode(entry.data), checksum=crc32(data);
    if(data.length>0xffffffff) throw new Error('ملف Excel كبير جدًا');
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(checksum),...u32(data.length),...u32(data.length),...u16(fileName.length),...u16(0)]);
    files.push(local,fileName,data);
    const central=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(checksum),...u32(data.length),...u32(data.length),...u16(fileName.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]);
    centralParts.push(central,fileName);
    const size=local.length+fileName.length+data.length;
    if(offset+size>0xffffffff) throw new Error('ملف Excel كبير جدًا');
    offset+=size;directoryLength+=central.length+fileName.length;
  }
  const count=entries.length;
  const ending=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(directoryLength),...u32(offset),...u16(0)]);
  const result=new Uint8Array(offset+directoryLength+ending.length);
  let pos=0;
  for(const part of [...files,...centralParts,ending]){result.set(part,pos);pos+=part.length;}
  return result;
}

function makeCell(value:unknown, row:number, col:number, header:boolean):string{
  const ref=`${colName(col)}${row}`;
  if(typeof value==='number' && Number.isFinite(value)) return `<c r="${ref}" s="${header?1:2}"><v>${value}</v></c>`;
  const val=String(value??'');
  return `<c r="${ref}" t="inlineStr" s="${header?1:0}"><is><t xml:space="preserve">${xmlEsc(val)}</t></is></c>`;
}
export function createWorkbook(rows: Array<Array<string|number>>, sheetName='المنتجات'):Uint8Array{
  if(!rows.length || !rows[0].length) throw new Error('البيانات فارغة');
  const nCols=Math.max(...rows.map(r=>r.length));const last=`${colName(nCols-1)}${rows.length}`;
  const sheetRows=rows.map((r,i)=>`<row r="${i+1}" ht="${i===0?32:24}" customHeight="1">${r.map((v,j)=>makeCell(v,i+1,j,i===0)).join('')}</row>`).join('');
  const widths=Array.from({length:nCols},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===0?20:25}" customWidth="1"/>`).join('');
  const sheets=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols>${widths}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${last}"/><pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.2" footer="0.2"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173447"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const entries=[
    {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(sheetName.slice(0,31).replace(/[\\/*?:\[\]]/g,''))}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/worksheets/sheet1.xml',data:sheets},
    {name:'xl/styles.xml',data:styles}
  ];return zip(entries);
}
export function exportProductsExcel(products:Product[]):Uint8Array{
  const rows:Array<Array<string|number>>=[['الكود','اسم المنتج','Product name','القسم','التركيب','الواط W','اللون K','اللومن lm','CRI','الحماية IP','الزاوية','الحالة','ظاهر','الوصف']];
  for(const p of products) rows.push([p.sku,p.name,p.nameEn,p.category,p.installation,p.watt,p.cct,p.lumens,p.cri,p.ip,p.beam,p.status,p.visible?'نعم':'لا',p.description]);
  return createWorkbook(rows,'المنتجات');
}
export function exportQuoteExcel(cart:CartItem[],products:Product[]):Uint8Array{
  const map=new Map(products.map(p=>[p.id,p])); const rows:Array<Array<string|number>>=[['كود المنتج','اسم المنتج','الكمية','الواط','درجة اللون']];
  for(const item of cart){const p=map.get(item.productId);if(p && p.visible) rows.push([p.sku,p.name,clampQuantity(item.quantity),p.watt,p.cct]);}
  return createWorkbook(rows,'طلب عرض السعر');
}
export function saveExcel(bytes:Uint8Array, filename:string):void{
  const blob=new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const objectUrl=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=objectUrl;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),3000);
}
