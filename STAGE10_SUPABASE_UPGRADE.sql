-- Flower Light / Saeed Naji Card
-- Stage 10: Product management + quotations + flexible customer identity
-- Includes Stage 8/9 features plus optional company on product entry and
-- individual/company customer type for quotation requests.
--
-- Run once in Supabase > SQL Editor > New query > Run.
-- Safe to re-run. This script also includes the Stage 7 schema so you do NOT
-- need to run PRODUCT_SPECIFICATIONS_STAGE7.sql separately.

begin;

-- ===========================================================================
-- 1) PROFESSIONAL PRODUCT SPECIFICATIONS
-- ===========================================================================

alter table public.products
add column if not exists specifications jsonb not null default '[]'::jsonb;

update public.products
set specifications = '[]'::jsonb
where specifications is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_specifications_is_array'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_specifications_is_array
      check (jsonb_typeof(specifications) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_specifications_size'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_specifications_size
      check (octet_length(specifications::text) <= 16000);
  end if;
end $$;

comment on column public.products.specifications is
'Ordered product technical specifications. JSON array of {key,label,value,unit}.';

-- ===========================================================================
-- 2) PRODUCT IMAGE GALLERY (MAX 4 IMAGES / ONE PRIMARY)
-- ===========================================================================

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint product_images_path_not_blank check (char_length(trim(image_path)) > 0)
);

create unique index if not exists product_images_product_path_uidx
on public.product_images(product_id, image_path);

create index if not exists product_images_product_sort_idx
on public.product_images(product_id, sort_order, created_at);

alter table public.product_images enable row level security;

-- Public visitors can read gallery metadata only for visible products.
drop policy if exists "Public read visible product images" on public.product_images;
create policy "Public read visible product images"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.is_visible = true
  )
);

-- Only real site admins may edit image metadata.
drop policy if exists "Admins manage product images metadata" on public.product_images;
create policy "Admins manage product images metadata"
on public.product_images
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

revoke all on table public.product_images from anon, authenticated;
grant select on table public.product_images to anon;
grant select, insert, update, delete on table public.product_images to authenticated;

-- Seed the current products.image_path as the primary image when needed.
insert into public.product_images(product_id, image_path, sort_order, is_primary)
select p.id, p.image_path, 0, true
from public.products p
where trim(coalesce(p.image_path,'')) <> ''
on conflict (product_id, image_path) do nothing;

-- Normalize existing galleries so every product has at most one PRIMARY marker.
-- Prefer products.image_path, otherwise the already-primary row, otherwise first row.
with ranked as (
  select
    pi.id,
    row_number() over (
      partition by pi.product_id
      order by
        (pi.image_path = p.image_path) desc,
        pi.is_primary desc,
        pi.sort_order asc,
        pi.created_at asc,
        pi.id asc
    ) as rn
  from public.product_images pi
  join public.products p on p.id = pi.product_id
)
update public.product_images pi
set is_primary = (ranked.rn = 1)
from ranked
where ranked.id = pi.id
  and pi.is_primary is distinct from (ranked.rn = 1);

-- Database-level guarantee: never more than one primary image per product.
create unique index if not exists product_images_one_primary_uidx
on public.product_images(product_id)
where is_primary = true;

-- Database-level maximum of four images for all future inserts/moves.
create or replace function public.enforce_product_images_max_four()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  if tg_op = 'UPDATE' and new.product_id = old.product_id then
    return new;
  end if;

  select count(*) into v_count
  from public.product_images pi
  where pi.product_id = new.product_id;

  if v_count >= 4 then
    raise exception 'A product can have at most 4 images.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists product_images_max_four on public.product_images;
create trigger product_images_max_four
before insert or update of product_id on public.product_images
for each row execute function public.enforce_product_images_max_four();

-- Atomically replace a product gallery and keep products.image_path synchronized
-- with the selected primary image.
create or replace function public.set_product_gallery(
  p_product_id uuid,
  p_image_paths text[],
  p_primary_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_distinct_count integer;
begin
  if not public.is_site_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.products p where p.id = p_product_id) then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  v_count := coalesce(cardinality(p_image_paths), 0);
  if v_count < 1 or v_count > 4 then
    raise exception 'Product gallery must contain between 1 and 4 images.' using errcode = '23514';
  end if;

  if exists (
    select 1 from unnest(p_image_paths) as x(path)
    where nullif(trim(path), '') is null
  ) then
    raise exception 'Image paths cannot be blank.' using errcode = '23514';
  end if;

  select count(distinct x.path) into v_distinct_count
  from unnest(p_image_paths) as x(path);

  if v_distinct_count <> v_count then
    raise exception 'Duplicate image paths are not allowed.' using errcode = '23514';
  end if;

  if nullif(trim(coalesce(p_primary_path,'')), '') is null
     or not (p_primary_path = any(p_image_paths)) then
    raise exception 'Primary image must be one of the gallery images.' using errcode = '23514';
  end if;

  delete from public.product_images
  where product_id = p_product_id;

  insert into public.product_images(product_id, image_path, sort_order, is_primary)
  select
    p_product_id,
    x.path,
    (x.ord - 1) * 10,
    (x.path = p_primary_path)
  from unnest(p_image_paths) with ordinality as x(path, ord)
  order by x.ord;

  update public.products
  set image_path = p_primary_path
  where id = p_product_id;
end;
$$;

revoke all on function public.set_product_gallery(uuid,text[],text) from public, anon;
grant execute on function public.set_product_gallery(uuid,text[],text) to authenticated;

-- ===========================================================================
-- 3) SECURE / ATOMIC PRODUCT REORDERING
-- ===========================================================================

create or replace function public.reorder_products(p_product_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_existing integer;
  v_categories integer;
begin
  if not public.is_site_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_count := coalesce(cardinality(p_product_ids), 0);
  if v_count = 0 then
    return;
  end if;
  if v_count > 500 then
    raise exception 'Too many products in one reorder operation.' using errcode = '22023';
  end if;

  if (select count(distinct x.id) from unnest(p_product_ids) as x(id)) <> v_count then
    raise exception 'Duplicate product IDs are not allowed.' using errcode = '22023';
  end if;

  select count(*), count(distinct p.category_id)
  into v_existing, v_categories
  from public.products p
  where p.id = any(p_product_ids);

  if v_existing <> v_count then
    raise exception 'One or more products were not found.' using errcode = 'P0002';
  end if;
  if v_categories <> 1 then
    raise exception 'Products must belong to the same category.' using errcode = '22023';
  end if;

  update public.products p
  set sort_order = (x.ord - 1) * 10
  from unnest(p_product_ids) with ordinality as x(id, ord)
  where p.id = x.id;
end;
$$;

revoke all on function public.reorder_products(uuid[]) from public, anon;
grant execute on function public.reorder_products(uuid[]) to authenticated;

commit;

-- ===========================================================================
-- VERIFICATION REPORT
-- ===========================================================================

select
  (select count(*) from public.product_images) as gallery_rows,
  (select count(*) from public.product_images where is_primary) as primary_rows,
  (select coalesce(max(cnt),0) from (
    select count(*) cnt from public.product_images group by product_id
  ) q) as max_images_on_one_product;

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('set_product_gallery','reorder_products')
order by routine_name;



-- ===========================================================================
-- STAGE 10: CUSTOMER IDENTITY
-- Product catalog entry: name + mobile required, company optional.
-- ===========================================================================

begin;

-- Allow customer_leads.company_name to be empty/null while keeping sensible length
-- validation when a company is supplied.
alter table public.customer_leads
  alter column company_name drop not null;

alter table public.customer_leads
  alter column company_name set default '';

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid='public.customer_leads'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%company_name%'
  loop
    execute format('alter table public.customer_leads drop constraint if exists %I',c.conname);
  end loop;
end $$;

alter table public.customer_leads
  add constraint customer_leads_company_name_optional_check
  check (
    company_name is null
    or char_length(trim(company_name)) = 0
    or char_length(trim(company_name)) between 2 and 120
  );

drop policy if exists "Public create customer lead" on public.customer_leads;
create policy "Public create customer lead"
on public.customer_leads
for insert
to anon, authenticated
with check (
  char_length(trim(full_name)) between 2 and 120
  and (
    company_name is null
    or char_length(trim(company_name)) = 0
    or char_length(trim(company_name)) between 2 and 120
  )
  and char_length(trim(mobile)) between 7 and 30
);

commit;


-- ===========================================================================
-- STAGE 9: QUOTATION REQUESTS (IMAGE / HANDWRITTEN LIST)
-- ===========================================================================

begin;

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique default (
    'FL-' || to_char(now() at time zone 'Asia/Riyadh','YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))
  ),
  request_type text not null default 'image' check (request_type in ('image','cart')),
  customer_type text not null default 'individual' check (customer_type in ('individual','company')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  company_name text not null default '' check (
    char_length(trim(company_name)) = 0 or char_length(trim(company_name)) between 2 and 120
  ),
  mobile text not null check (char_length(trim(mobile)) between 7 and 30),
  notes text not null default '' check (char_length(notes) <= 500),
  image_path text not null default '' check (char_length(image_path) <= 500),
  original_filename text not null default '' check (char_length(original_filename) <= 180),
  status text not null default 'new' check (status in ('new','processed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing Stage 9 installations in-place.
alter table public.quote_requests
  add column if not exists customer_type text not null default 'individual';

alter table public.quote_requests
  alter column company_name drop not null;

alter table public.quote_requests
  alter column company_name set default '';

-- Existing Stage 9 rows all contained a company, so preserve that meaning.
update public.quote_requests
set customer_type='company'
where coalesce(trim(company_name),'') <> ''
  and customer_type='individual';

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid='public.quote_requests'::regclass
      and contype='c'
      and (
        pg_get_constraintdef(oid) ilike '%company_name%'
        or pg_get_constraintdef(oid) ilike '%customer_type%'
      )
  loop
    execute format('alter table public.quote_requests drop constraint if exists %I',c.conname);
  end loop;
end $$;

alter table public.quote_requests
  add constraint quote_requests_customer_type_check
  check (customer_type in ('individual','company'));

alter table public.quote_requests
  add constraint quote_requests_company_by_type_check
  check (
    (customer_type='individual' and coalesce(trim(company_name),'')='')
    or
    (customer_type='company' and char_length(trim(company_name)) between 2 and 120)
  );

create index if not exists quote_requests_created_at_idx
on public.quote_requests(created_at desc);

create index if not exists quote_requests_status_created_idx
on public.quote_requests(status, created_at desc);

-- Keep updated_at accurate.
drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
before update on public.quote_requests
for each row execute function public.set_updated_at();

alter table public.quote_requests enable row level security;

-- Remove legacy policies if this file is re-run.
do $$
declare p record;
begin
  for p in
    select schemaname,tablename,policyname
    from pg_policies
    where schemaname='public' and tablename='quote_requests'
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

-- Public visitor can CREATE an image quote request but can never read it back.
create policy "Public create image quote request"
on public.quote_requests
for insert
to anon, authenticated
with check (
  request_type='image'
  and customer_type in ('individual','company')
  and char_length(trim(full_name)) between 2 and 120
  and (
    (customer_type='individual' and coalesce(trim(company_name),'')='')
    or
    (customer_type='company' and char_length(trim(company_name)) between 2 and 120)
  )
  and char_length(trim(mobile)) between 7 and 30
  and char_length(notes) <= 500
  and char_length(trim(image_path)) between 10 and 500
  and image_path like 'incoming/%'
  and status='new'
);

-- Only real site admins can read/update/delete requests.
create policy "Admins manage quote requests"
on public.quote_requests
for all
to authenticated
using (public.is_site_admin())
with check (public.is_site_admin());

revoke all on table public.quote_requests from anon, authenticated;
grant insert on table public.quote_requests to anon;
grant select,insert,update,delete on table public.quote_requests to authenticated;

-- ---------------------------------------------------------------------------
-- PRIVATE STORAGE BUCKET FOR CUSTOMER REQUEST IMAGES
-- ---------------------------------------------------------------------------
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'quote-requests',
  'quote-requests',
  false,
  4194304,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Remove only policies that belong to this bucket.
do $$
declare p record;
begin
  for p in
    select schemaname,tablename,policyname
    from pg_policies
    where schemaname='storage'
      and tablename='objects'
      and (
        coalesce(qual,'') ilike '%quote-requests%'
        or coalesce(with_check,'') ilike '%quote-requests%'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

-- Visitors may upload only NEW files to the incoming folder of this private bucket.
create policy "Public upload quote request image"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id='quote-requests'
  and (storage.foldername(name))[1]='incoming'
);

-- Admins can read/delete/manage the private images.
create policy "Admins manage quote request images"
on storage.objects
for all
to authenticated
using (bucket_id='quote-requests' and public.is_site_admin())
with check (bucket_id='quote-requests' and public.is_site_admin());

-- ---------------------------------------------------------------------------
-- ANALYTICS RPC: add quotation funnel events without exposing raw analytics.
-- ---------------------------------------------------------------------------
create or replace function public.log_site_event(
  p_event_name text,
  p_event_label text default '',
  p_visitor_id text default '',
  p_session_id text default '',
  p_page_path text default '/',
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event text := lower(trim(coalesce(p_event_name,'')));
  v_label text := left(trim(coalesce(p_event_label,'')),180);
  v_visitor text := left(trim(coalesce(p_visitor_id,'')),80);
  v_session text := left(trim(coalesce(p_session_id,'')),80);
  v_path text := left(coalesce(nullif(trim(p_page_path),''),'/'),300);
  v_meta jsonb := coalesce(p_metadata,'{}'::jsonb);
begin
  if v_event not in (
    'page_view',
    'products_open',
    'product_category_view',
    'product_image_open',
    'product_gallery_navigation',
    'product_whatsapp_click',
    'catalog_download',
    'contact_phone',
    'contact_whatsapp',
    'contact_location',
    'customer_lead_saved',
    'save_contact',
    'quote_cart_add',
    'quote_cart_open',
    'quote_whatsapp_submit',
    'quote_image_open',
    'quote_image_submit'
  ) then
    return false;
  end if;

  if char_length(v_visitor) < 8 or char_length(v_session) < 8 then
    return false;
  end if;

  if jsonb_typeof(v_meta) is distinct from 'object' or octet_length(v_meta::text) > 4000 then
    v_meta := '{}'::jsonb;
  end if;

  if exists (
    select 1 from public.analytics_events e
    where e.session_id=v_session
      and e.created_at >= now()-interval '1 minute'
    order by e.created_at desc
    offset 119 limit 1
  ) then return false; end if;

  if exists (
    select 1 from public.analytics_events e
    where e.visitor_id=v_visitor
      and e.created_at >= now()-interval '1 minute'
    order by e.created_at desc
    offset 239 limit 1
  ) then return false; end if;

  if exists (
    select 1 from public.analytics_events e
    where e.session_id=v_session
      and e.event_name=v_event
      and e.event_label=v_label
      and e.created_at >= now()-interval '1 second'
  ) then return false; end if;

  insert into public.analytics_events(event_name,event_label,visitor_id,session_id,page_path,metadata)
  values(v_event,v_label,v_visitor,v_session,v_path,v_meta);
  return true;
end;
$$;

revoke all on function public.log_site_event(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.log_site_event(text,text,text,text,text,jsonb) to anon, authenticated;

commit;

-- ===========================================================================
-- STAGE 9 VERIFICATION
-- ===========================================================================
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='quote_requests';

select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets
where id='quote-requests';

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies
where (schemaname='public' and tablename='quote_requests')
   or (schemaname='storage' and tablename='objects' and (
      coalesce(qual,'') ilike '%quote-requests%'
      or coalesce(with_check,'') ilike '%quote-requests%'
   ))
order by schemaname,tablename,policyname;
