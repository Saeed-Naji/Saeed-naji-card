Flower Light - Stage 11

Changes:
1) Public card title changed to "طلب عرض سعر".
   Subtitle: "صوّر الورقة أو اختر من قائمة المنتجات".
2) Admin product specifications now include a checkbox per specification:
   "✓ يظهر في رسالة عرض السعر".
   Only checked specifications are included in WhatsApp inquiry / multi-product quote messages.
   Specifications remain fully visible on the website regardless of this checkbox.
3) Product links were removed from the multi-product WhatsApp quote message.
4) WhatsApp/Open Graph share preview image now uses the actual Flower Light company logo
   instead of the generic sun icon, with ?v=11 cache-busting.

No Supabase SQL migration is required for Stage 11.
The checkbox state is stored inside the existing products.specifications JSONB data.
