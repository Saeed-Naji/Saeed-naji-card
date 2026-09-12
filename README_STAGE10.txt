Flower Light · Stage 10
=======================

Changes in this stage
---------------------
1) Product catalog entry gate:
   - Name: required.
   - Mobile: required.
   - Company name: optional.

2) Quotation cart:
   - Customer name: required.
   - Mobile: required.
   - Customer chooses: Individual Request / Company Request.
   - Company name appears and becomes required only for Company Request.
   - WhatsApp quotation message includes the selected customer type.

3) Paper / handwritten quotation image request:
   - Same customer rules as the quotation cart.
   - customer_type is saved in Supabase.
   - Admin panel displays "طلب فردي" or "باسم شركة".

4) Existing Stage 9 quote requests are preserved.
   - Old requests that already contain a company name are migrated to customer_type='company'.

INSTALLATION
------------
A) Supabase
Run STAGE10_SUPABASE_UPGRADE.sql in Supabase > SQL Editor.
It is cumulative for the Stage 8/9 database features in this project and can be re-run safely.
It also updates customer_leads so company_name is optional.

B) GitHub Pages
Upload/replace the site files from this folder.
The .sql and README files do not need to be uploaded to GitHub.

Recommended order: run SQL first, then upload the website files.
