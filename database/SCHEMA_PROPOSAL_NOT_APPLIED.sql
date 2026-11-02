-- FLOWER LIGHT CORPORATE — ISOLATED SUPABASE SCHEMA PROPOSAL
-- REVIEW ONLY. DO NOT RUN AGAINST ANY EXISTING FLOWER LIGHT PROJECT.
-- Intended for a BRAND-NEW Supabase project once its ownership and project ref are confirmed.
-- This is a proposal, not an applied migration. No secrets or credentials here.
begin;

create table if not exists public.corp_admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.corp_products (
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
create index if not exists corp_products_public_idx on public.corp_products (visible, category);

create table if not exists public.corp_business_info (
  singleton boolean primary key default true check (singleton = true),
  company_name text not null default '',
  registration_number text not null default '',
  tax_number text not null default '',
  contact_phone text not null default '',
  whatsapp_phone text not null default '',
  hero_title text not null default '',
  hero_description text not null default '',
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.corp_quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_contact text not null check (char_length(customer_contact) between 1 and 160),
  company_name text not null default '',
  message text not null default '',
  items jsonb not null
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 30),
  status text not null default 'new'
    check (status in ('new','in_review','responded','closed')),
  created_at timestamptz not null default now()
);
create index if not exists corp_quote_requests_created_at_idx on public.corp_quote_requests (created_at desc);

-- Deny by default on exposed public tables; explicitly grant only required operations.
alter table public.corp_admin_members enable row level security;
alter table public.corp_products enable row level security;
alter table public.corp_business_info enable row level security;
alter table public.corp_quote_requests enable row level security;

revoke all on public.corp_admin_members from anon, authenticated;
revoke all on public.corp_products from anon, authenticated;
revoke all on public.corp_business_info from anon, authenticated;
revoke all on public.corp_quote_requests from anon, authenticated;

-- Membership cannot be written by a browser session. Bootstrap using the new project's
-- privileged SQL Editor only, after verifying the intended admin auth.users UUID.
grant select on public.corp_admin_members to authenticated;
create policy corp_admin_read_self on public.corp_admin_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Public reads: only published product records; admins can see drafts.
grant select on public.corp_products to anon, authenticated;
grant insert, update, delete on public.corp_products to authenticated;
create policy corp_product_public_read on public.corp_products
  for select to anon, authenticated using (visible = true);
create policy corp_product_admin_read on public.corp_products
  for select to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_product_admin_insert on public.corp_products
  for insert to authenticated
  with check (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_product_admin_update on public.corp_products
  for update to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_product_admin_delete on public.corp_products
  for delete to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));

-- A single row of verified public-facing business information.
-- Do not store access tokens, API secrets or private credentials in this table.
grant select on public.corp_business_info to anon, authenticated;
grant insert, update on public.corp_business_info to authenticated;
create policy corp_business_public_read on public.corp_business_info
  for select to anon, authenticated using (is_published = true);
create policy corp_business_admin_read on public.corp_business_info
  for select to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_business_admin_insert on public.corp_business_info
  for insert to authenticated
  with check (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_business_admin_update on public.corp_business_info
  for update to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));

-- Quote requests are private. Customers may NOT insert directly through the Data API.
-- A future Edge Function must validate Turnstile, fields, products and rate limits
-- and then insert using server-held credentials. Never expose service_role to the browser.
grant select, update on public.corp_quote_requests to authenticated;
grant insert on public.corp_quote_requests to service_role;
create policy corp_quote_admin_read on public.corp_quote_requests
  for select to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));
create policy corp_quote_admin_update on public.corp_quote_requests
  for update to authenticated
  using (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.corp_admin_members am
    where am.user_id = (select auth.uid())
  ));

commit;
