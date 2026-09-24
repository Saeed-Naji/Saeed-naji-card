import { test, expect } from '@playwright/test';

const base=process.env.FL_SITE_URL||'http://127.0.0.1:4173/';


const supabaseMockScript=String.raw`
window.supabase={createClient(){
  const makeQuery=(table)=>{
    const q={
      select(){return q;},eq(){return q;},neq(){return q;},order(){return q;},limit(){return q;},delete(){return q;},update(){return q;},
      insert(){return Promise.resolve({data:null,error:null});},
      upsert(){return Promise.resolve({data:null,error:null});},
      single(){return Promise.resolve({data:null,error:null});},
      maybeSingle(){
        if(table==='site_settings')return Promise.resolve({data:{require_customer_lead:true},error:null});
        if(table==='site_profile')return Promise.resolve({data:{},error:null});
        if(table==='site_catalog')return Promise.resolve({data:{},error:null});
        return Promise.resolve({data:null,error:null});
      },
      then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}
    };
    return q;
  };
  return {
    auth:{
      getSession:async()=>({data:{session:null},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      signOut:async()=>({error:null}),signInWithPassword:async()=>({data:{session:null},error:null}),
      resetPasswordForEmail:async()=>({error:null}),signInWithOtp:async()=>({error:null}),updateUser:async()=>({error:null})
    },
    from:makeQuery,
    rpc:async()=>({data:null,error:null}),
    storage:{from:()=>({getPublicUrl:(path)=>({data:{publicUrl:path||''}}),remove:async()=>({error:null}),upload:async()=>({error:null})})},
    functions:{invoke:async()=>({data:null,error:null})}
  };
}};`;

async function installSupabaseMock(page){
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:supabaseMockScript}));
}

async function injectCatalogFixtures(page){
  await page.waitForFunction(()=>typeof window.flRenderProducts==='function');
  await page.evaluate(()=>{
    localStorage.setItem('flower_light_customer_access_v1','1');
    window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false};
    window.FLOWER_LIGHT_PROFILE={brand_name:'Flower Light',company_name:'بصائر الخليج'};
    window.FLOWER_LIGHT_CONTACTS=[{type:'whatsapp',value:'0570372763',is_visible:true}];
    const svg=(label,bg)=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="${bg}"/><text x="250" y="260" text-anchor="middle" font-size="38">${label}</text></svg>`)}`;
    const image1=svg('ONE','#eeeeee');
    const image2=svg('TWO','#dddddd');
    window.FLOWER_LIGHT_SITE_CATALOGS=[{id:'cat-test',name:'كتالوج تجريبي',description:'اختبار الكتالوج',pdf_url:'data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=',sort_order:20,is_visible:true}];
    window.FLOWER_LIGHT_PRODUCTS={catalog:[],chandeliers:[],balfon:[],extraSections:[{
      id:'sec-test',slug:'wall-lights',name:'جداريات',description:'قسم تجريبي',sort_order:0,items:[{
        id:'prod-test',name:'جداري تجريبي',model:'WL-TEST',caption:'منتج تجريبي',alt:'جداري تجريبي',category:'جداريات',category_id:'sec-test',category_slug:'wall-lights',
        image:image1,image_path:'one',gallery:[{image:image1,image_path:'one'},{image:image2,image_path:'two'}],
        specifications:[{key:'custom_1',label:'القدرة',value:'12W',unit:''}],price:100,wholesale_price:80,wholesale_min_qty:10,is_visible:true
      }]
    }]};
    window.flRenderProducts();
  });
}

test('customer gate can be enabled and disabled',async({page})=>{
  await installSupabaseMock(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof window.flBeforeProductsOpen==='function');
  await page.evaluate(()=>{localStorage.removeItem('flower_light_customer_access_v1');window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:true};});
  const pending=page.evaluate(()=>window.flBeforeProductsOpen());
  await expect(page.locator('#flLeadGate')).toHaveClass(/open/);
  await expect(page.locator('#flLeadName')).toBeVisible();
  await expect(page.locator('#flLeadMobile')).toBeVisible();
  await page.locator('#flLeadClose').click();
  expect(await pending).toBe(false);
  await page.evaluate(()=>{window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false};});
  expect(await page.evaluate(()=>window.flBeforeProductsOpen())).toBe(true);
  await expect(page.locator('#flLeadGate')).not.toHaveClass(/open/);
});

test('main catalog, product actions, lightbox navigation and catalog tab work',async({page})=>{
  await installSupabaseMock(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await injectCatalogFixtures(page);
  await page.locator('#openProducts').click();
  await expect(page.locator('#catalogModal')).toHaveClass(/open/);
  await expect(page.locator('.extra-section-tab').filter({hasText:'جداريات'})).toBeVisible();
  await expect(page.locator('.chandelier-card')).toHaveCount(1);

  const whatsapp=page.locator('.product-whatsapp-button');
  await expect(whatsapp).toBeVisible();
  await expect(whatsapp).toHaveAttribute('href',/^https:\/\/wa\.me\/966570372763\?text=/);

  await page.locator('.product-download-pdf-button').click();
  await expect(page.locator('#exportChoiceModal')).toHaveClass(/open/);
  await expect(page.locator('#exportChoicePdf')).toBeVisible();
  await expect(page.locator('#exportChoiceJpg')).toBeVisible();
  await page.locator('#closeExportChoice').click();

  await page.locator('.category-download-button').click();
  await expect(page.locator('#exportChoiceModal')).toHaveClass(/open/);
  await page.locator('#closeExportChoice').click();

  await page.locator('.product-image-button').click();
  await expect(page.locator('#imageLightbox')).toHaveClass(/open/);
  await expect(page.locator('#imageLightboxCounter')).toContainText('1 / 2');
  await page.locator('#imageLightboxNext').click();
  await expect(page.locator('#imageLightboxCounter')).toContainText('2 / 2');
  await page.locator('#imageLightboxPrev').click();
  await expect(page.locator('#imageLightboxCounter')).toContainText('1 / 2');
  await page.locator('#closeImageLightbox').click();
  await expect(page.locator('#imageLightbox')).not.toHaveClass(/open/);

  const catalogTab=page.locator('.site-catalog-tab').filter({hasText:'كتالوج تجريبي'});
  await expect(catalogTab).toBeVisible();
  await catalogTab.click();
  await expect(page.locator('.site-catalog-panel.active .site-catalog-download')).toHaveAttribute('href',/^data:application\/pdf/);

  await page.locator('#closeProducts').click();
  await expect(page.locator('#catalogModal')).not.toHaveClass(/open/);
});


test('laptop product dialog and lightbox stay inside the viewport',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await installSupabaseMock(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});

  await page.evaluate(()=>{
    const modal=document.getElementById('flCloudModal');
    const dialog=modal?.querySelector('.fl-cloud-dialog');
    const body=document.getElementById('flCloudModalBody');
    dialog?.classList.add('fl-product-dialog');
    if(body) body.innerHTML=`<form id="flProductForm"><div class="fl-cloud-form">
      <div class="fl-cloud-field"><label>القسم</label><select><option>كشافات</option></select></div>
      <div class="fl-cloud-field"><label>الترتيب</label><input value="0"></div>
      <section class="fl-pricing-editor full"><div class="fl-price-tier-list"><div class="fl-price-tier-row" data-price-tier-row>
        <div class="fl-cloud-field"><label>نوع السعر</label><select><option>جملة</option></select></div>
        <div class="fl-cloud-field"><label>السعر</label><input value="35"></div>
        <div class="fl-price-tier-range"><div class="fl-cloud-field"><label>الأدنى</label><input value="10"></div><div class="fl-cloud-field"><label>الأعلى</label><input value="49"></div></div>
        <button class="fl-price-tier-remove" type="button">حذف</button>
      </div></div></section></div></form>`;
    modal?.classList.add('open');
  });

  const dialogBox=await page.locator('.fl-cloud-dialog.fl-product-dialog').boundingBox();
  const priceBox=await page.locator('.fl-price-tier-row').boundingBox();
  expect(dialogBox).toBeTruthy();
  expect(priceBox).toBeTruthy();
  expect(dialogBox.width).toBeGreaterThan(850);
  expect(dialogBox.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox.x+dialogBox.width).toBeLessThanOrEqual(1366);
  expect(priceBox.x).toBeGreaterThanOrEqual(dialogBox.x-1);
  expect(priceBox.x+priceBox.width).toBeLessThanOrEqual(dialogBox.x+dialogBox.width+1);

  await page.evaluate(()=>{
    document.getElementById('flCloudModal')?.classList.remove('open');
    const box=document.getElementById('imageLightbox');
    const image=document.getElementById('imageLightboxImage');
    const specs=document.getElementById('imageLightboxSpecs');
    const actions=box?.querySelector('.image-lightbox-actions');
    if(image) image.src=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900"><rect width="700" height="900" fill="white"/><rect x="10" y="10" width="680" height="880" fill="none" stroke="orange" stroke-width="20"/><text x="350" y="70" text-anchor="middle" font-size="44">TOP</text></svg>')}`;
    if(specs){specs.hidden=false;specs.innerHTML='<div class="product-spec">قدرة 200W</div><div class="product-spec">لون 6500K</div><div class="product-spec">IP66</div>';}
    actions?.querySelectorAll('[hidden]').forEach(el=>el.hidden=false);
    box?.classList.add('open');
    if(box){box.scrollTop=0;box.scrollLeft=0;}
  });
  await page.locator('#imageLightboxImage').evaluate(img=>img.complete ? true : new Promise(resolve=>img.addEventListener('load',()=>resolve(true),{once:true})));
  const imageBox=await page.locator('#imageLightboxImage').boundingBox();
  expect(imageBox).toBeTruthy();
  expect(imageBox.y).toBeGreaterThanOrEqual(0);
  expect(imageBox.y).toBeLessThan(80);
  expect(imageBox.y+imageBox.height).toBeLessThanOrEqual(768);
  expect(await page.locator('#imageLightbox').evaluate(el=>el.scrollTop)).toBe(0);
});

test('master barcode appears in the shared datasheet template only when configured',async({page})=>{
  await installSupabaseMock(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.flDatasheetPdf?.createPage);
  const result=await page.evaluate(async()=>{
    const productImage=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#eeeeee"/></svg>')}`;
    const barcode=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180"><rect width="400" height="180" fill="#ff0000"/></svg>')}`;
    const item={name:'منتج اختبار',model:'BAR-1',caption:'',image:productImage,image_path:'',gallery:[{image:productImage,image_path:''}],specifications:[{key:'custom_1',label:'القدرة',value:'20W',unit:''}]};
    window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false,master_barcode_path:'test',master_barcode_url:barcode};
    const redPixels=canvas=>{
      const data=canvas.getContext('2d').getImageData(45,850,220,350).data;
      let count=0;
      for(let i=0;i<data.length;i+=4)if(data[i]>220&&data[i+1]<80&&data[i+2]<80&&data[i+3]>0)count++;
      return count;
    };
    const withBarcode=await window.flDatasheetPdf.createPage(item,{images:item.gallery,scale:1});
    const withCount=redPixels(withBarcode.canvas);
    window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false,master_barcode_path:'',master_barcode_url:''};
    const withoutBarcode=await window.flDatasheetPdf.createPage(item,{images:item.gallery,scale:1});
    const withoutCount=redPixels(withoutBarcode.canvas);
    return {withCount,withoutCount};
  });
  expect(result.withCount).toBeGreaterThan(1000);
  expect(result.withoutCount).toBe(0);
});

test('design footer label and number replace website URL and hide when empty',async({page})=>{
  await installSupabaseMock(page);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.flDatasheetPdf?.createPage);
  const result=await page.evaluate(async()=>{
    const productImage=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#eeeeee"/></svg>')}`;
    const item={name:'منتج اختبار',model:'FOOT-1',caption:'',image:productImage,image_path:'',gallery:[{image:productImage,image_path:''}],specifications:[]};
    const original=CanvasRenderingContext2D.prototype.fillText;
    const captured=[];
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){captured.push(String(text));return original.call(this,text,...args);};
    try{
      window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false,master_barcode_path:'',master_barcode_url:'',design_footer_number:'+966500001111',design_footer_label:'مندوب الجملة'};
      await window.flDatasheetPdf.createPage(item,{images:item.gallery,scale:1});
      const withNumber=captured.slice();
      captured.length=0;
      window.FLOWER_LIGHT_SITE_SETTINGS={require_customer_lead:false,master_barcode_path:'',master_barcode_url:'',design_footer_number:'',design_footer_label:''};
      await window.flDatasheetPdf.createPage(item,{images:item.gallery,scale:1});
      return {withNumber,withoutNumber:captured.slice()};
    }finally{CanvasRenderingContext2D.prototype.fillText=original;}
  });
  expect(result.withNumber).toContain('+966500001111');
  expect(result.withNumber).toContain('رقم التواصل');
  expect(result.withNumber.some(text=>text.includes('saeed-naji.github.io'))).toBeFalsy();
  expect(result.withoutNumber).not.toContain('+966500001111');
  expect(result.withoutNumber).not.toContain('رقم التواصل');
});

test('admin routes are isolated and noindex',async({page})=>{
  await installSupabaseMock(page);
  await page.goto(new URL('?admin=1',base).href,{waitUntil:'domcontentloaded'});
  await expect(page).toHaveTitle('لوحة المدير | Flower Light');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
  await expect(page.locator('#flCloudPrimaryAdmin')).toHaveCount(1);
  await expect(page.locator('#flCloudAssistantAdmin')).toHaveCount(1);

  await page.goto(new URL('?admin=2',base).href,{waitUntil:'domcontentloaded'});
  await expect(page).toHaveTitle('لوحة الأدمن | Flower Light');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
  await expect(page.locator('#flCloudPrimaryAdmin')).toHaveCount(0);
  await expect(page.locator('#flCloudAssistantAdmin')).toHaveCount(1);
});
