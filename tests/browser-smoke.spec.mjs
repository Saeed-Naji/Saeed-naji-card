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
