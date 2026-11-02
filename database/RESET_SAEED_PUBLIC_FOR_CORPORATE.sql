-- Saeed Naji Corporate: replace legacy application tables with isolated corporate schema.
-- TARGET ONLY: afrvoshsiqartsketiuv. Irreversibly removes legacy PUBLIC application data.
-- Does NOT delete auth.users, storage.objects/files, Edge Functions, or the Supabase project itself.
begin;
do $guard$
declare actual text[]; expected text[] := array[
'admin_panel_passwords','admin_recovery_settings','admin_users','analytics_daily',
'analytics_events','categories','contact_items','customer_leads','product_images',
'products','quote_requests','site_catalog','site_catalogs','site_profile','site_settings'
];
begin
  select array_agg(tablename::text order by tablename) into actual
  from pg_tables where schemaname='public';
  if actual is distinct from expected then
    raise exception 'Unexpected public tables. Aborting rather than deleting unknown data. Found: %', actual;
  end if;
end $guard$;

-- Old recurring analytics task refers to a legacy function removed below.
select cron.unschedule(jobid) from cron.job
where jobname='flower-light-analytics-retention' and position('maintain_analytics_retention' in command)>0;

-- Stop legacy Storage policies calling old public functions.
drop policy if exists "Role manage catalog files" on storage.objects;
drop policy if exists "Role manage product files" on storage.objects;
drop policy if exists "catalog files public read" on storage.objects;

-- Remove only application-owned tables and functions from public.
do $cleanup$
declare obj record;
begin
  for obj in select tablename from pg_tables where schemaname='public' loop
    execute format('drop table if exists public.%I cascade',obj.tablename);
  end loop;
  for obj in select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
  loop
    execute format('drop function if exists public.%I(%s) cascade',obj.proname,obj.args);
  end loop;
end $cleanup$;

create table public.corp_admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table public.corp_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (char_length(sku) between 1 and 100),
  name_ar text not null check (char_length(name_ar) between 1 and 180),
  name_en text not null default '',
  category text not null check (char_length(category) between 1 and 120),
  installation text not null default '',
  power_w numeric(8,2) not null default 0 check (power_w >= 0),
  cct_k integer not null default 3000 check (cct_k between 0 and 20000),
  lumens integer not null default 0 check (lumens >= 0),
  cri numeric(5,2) not null default 80 check (cri between 0 and 100),
  ip_rating text not null default 'IP20',
  beam_degrees numeric(6,2) not null default 36 check (beam_degrees between 0 and 360),
  image_path text not null default '',
  description text not null default '',
  stock_status text not null default 'available'
    check (stock_status in ('available','soon','unavailable')),
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index corp_products_public_idx on public.corp_products(visible,category);
create table public.corp_business_info (
  singleton boolean primary key default true check(singleton=true),
  company_name text not null default '',
  registration_number text not null default '',
  tax_number text not null default '',
  contact_phone text not null default '',
  whatsapp_phone text not null default '',
  hero_title text not null default '',
  hero_description text not null default '',
  show_prices boolean not null default false,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.corp_quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_contact text not null check (char_length(customer_contact) between 1 and 160),
  company_name text not null default '',
  message text not null default '',
  items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 30),
  status text not null default 'new'
    check(status in ('new','in_review','responded','closed')),
  created_at timestamptz not null default now()
);
create index corp_quote_created_idx on public.corp_quote_requests(created_at desc);

-- Public API is denied by default; only grant operations required by RLS.
alter table public.corp_admin_members enable row level security;
alter table public.corp_products enable row level security;
alter table public.corp_business_info enable row level security;
alter table public.corp_quote_requests enable row level security;
revoke all on public.corp_admin_members,public.corp_products,public.corp_business_info,public.corp_quote_requests from public,anon,authenticated;
grant select on public.corp_admin_members to authenticated;
create policy corp_admin_self_select on public.corp_admin_members
 for select to authenticated using(user_id=(select auth.uid()));

grant select on public.corp_products to anon,authenticated;
grant insert,update,delete on public.corp_products to authenticated;
create policy corp_product_public_select on public.corp_products for select to anon,authenticated
 using(visible=true);
create policy corp_product_admin_select on public.corp_products for select to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_product_admin_insert on public.corp_products for insert to authenticated
 with check(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_product_admin_update on public.corp_products for update to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())))
 with check(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_product_admin_delete on public.corp_products for delete to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));

grant select on public.corp_business_info to anon,authenticated;
grant insert,update on public.corp_business_info to authenticated;
create policy corp_business_published_select on public.corp_business_info for select to anon,authenticated
 using(is_published=true);
create policy corp_business_admin_select on public.corp_business_info for select to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_business_admin_insert on public.corp_business_info for insert to authenticated
 with check(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_business_admin_update on public.corp_business_info for update to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())))
 with check(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));

-- Quotes are private. Only a future validated server/Edge Function may insert.
grant select,update(status) on public.corp_quote_requests to authenticated;
grant insert on public.corp_quote_requests to service_role;
create policy corp_quote_admin_select on public.corp_quote_requests for select to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));
create policy corp_quote_admin_update on public.corp_quote_requests for update to authenticated
 using(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())))
 with check(exists(select 1 from public.corp_admin_members m where m.user_id=(select auth.uid())));

-- Seed obviously labelled demo records, never copy any old customer/product data.
insert into public.corp_products
(id,sku,name_ar,name_en,category,installation,power_w,cct_k,lumens,cri,ip_rating,beam_degrees,image_path,description,stock_status,visible)
values
('10000000-0000-4000-8000-000000000001','FL-DL-12','داون لايت معماري','Architectural Downlight','داون لايت','سقفي غاطس',12,3000,1080,90,'IP44',36,'','بيانات تجريبية غير معتمدة؛ مثال لتطوير الكتالوج.','available',true),
('10000000-0000-4000-8000-000000000002','FL-SP-20','سبوت لايت تجريبي','Demo Spotlight','سبوت لايت','سكة إضاءة',20,4000,1850,90,'IP20',24,'','منتج تجريبي وليس مواصفات تجارية معتمدة.','available',true),
('10000000-0000-4000-8000-000000000003','FL-LN-16','إنارة خطية تجريبية','Demo Linear Light','إنارة خطية','معلق',16,6500,1700,80,'IP20',110,'','منتج معاينة فقط، لا يستخدم للتصميم الهندسي.','soon',true),
('10000000-0000-4000-8000-000000000004','FL-OD-10','إنارة خارجية تجريبية','Demo Outdoor Light','إنارة خارجية','جداري',10,3000,760,80,'IP65',60,'','مواصفات وصورة المنتج غير معتمدة.','available',true);
insert into public.corp_business_info(singleton,company_name,hero_title,hero_description,show_prices,is_published)
values(true,'FLOWER LIGHT — DEMO','الضوء الذي يمنح المكان هويته','معاينة مستقلة لكتالوج الإضاءة المعمارية الجديد. جميع المنتجات المعروضة تجريبية.',false,false);
commit;
