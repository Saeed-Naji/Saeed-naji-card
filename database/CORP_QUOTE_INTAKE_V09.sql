-- Saeed Naji CORPORATE quote intake v0.9.
-- Project afrvoshsiqartsketiuv only. Existing quote data and legacy objects untouched.
-- Public/browser clients are explicitly denied insert & function execution.
-- Edge Function uses server-only service_role to invoke this atomic quota-checked RPC.
begin;

create table public.corp_quote_intake_log (
  id bigint generated always as identity primary key,
  contact_fingerprint text not null check(length(contact_fingerprint)=64),
  created_at timestamptz not null default now()
);
create index corp_quote_intake_log_hour_idx on public.corp_quote_intake_log (created_at desc);
create index corp_quote_intake_log_contact_idx on public.corp_quote_intake_log (contact_fingerprint,created_at desc);
alter table public.corp_quote_intake_log enable row level security;
revoke all on public.corp_quote_intake_log from public,anon,authenticated;
grant select,insert on public.corp_quote_intake_log to service_role;

create function public.corp_submit_quote_secure(
  p_customer_name text,
  p_customer_contact text,
  p_company_name text,
  p_message text,
  p_items jsonb,
  p_contact_fingerprint text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_item jsonb;
  v_pid uuid;
  v_quantity integer;
  v_product record;
  v_items jsonb := '[]'::jsonb;
  v_seen uuid[] := '{}'::uuid[];
  v_total integer;
begin
  if current_user <> 'service_role' then
    raise exception 'quote intake is not available to this role';
  end if;
  if p_customer_name is null or length(btrim(p_customer_name)) not between 2 and 120
    or p_customer_contact is null or length(btrim(p_customer_contact)) not between 8 and 160
    or p_company_name is null or length(p_company_name) > 120
    or p_message is null or length(p_message) > 1000
    or p_contact_fingerprint is null or p_contact_fingerprint !~ '^[0-9a-f]{64}$'
    or p_items is null or jsonb_typeof(p_items) <> 'array'
  then
    raise exception 'invalid quote fields';
  end if;
  v_total := jsonb_array_length(p_items);
  if v_total not between 1 and 30 then
    raise exception 'invalid quote item count';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or (v_item->>'productId') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or (v_item->>'quantity') !~ '^[1-9][0-9]{0,3}$'
    then
      raise exception 'invalid item';
    end if;
    v_pid := (v_item->>'productId')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity > 9999 or v_pid = any(v_seen) then
      raise exception 'invalid or repeated item';
    end if;
    select id,sku,name_ar into v_product
      from public.corp_products
      where id=v_pid and visible=true;
    if not found then raise exception 'product unavailable'; end if;
    v_seen := array_append(v_seen, v_pid);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
       'productId',v_pid,'sku',v_product.sku,'name',v_product.name_ar,'quantity',v_quantity
    ));
  end loop;

  -- One short transaction-wide lock prevents concurrent requests from bypassing limits.
  perform pg_advisory_xact_lock(92831, 99041);
  if (select count(*) from public.corp_quote_intake_log
      where contact_fingerprint=p_contact_fingerprint and created_at>now()-interval '1 hour') >= 3 then
    raise exception 'contact hourly quote limit reached';
  end if;
  if (select count(*) from public.corp_quote_intake_log
      where created_at>now()-interval '1 hour') >= 120 then
    raise exception 'site hourly quote limit reached';
  end if;

  insert into public.corp_quote_requests
     (customer_name,customer_contact,company_name,message,items,status)
  values (btrim(p_customer_name),btrim(p_customer_contact),btrim(p_company_name),btrim(p_message),v_items,'new')
  returning id into v_id;
  insert into public.corp_quote_intake_log(contact_fingerprint)
  values (p_contact_fingerprint);
  return v_id;
end
$fn$;

revoke all on function public.corp_submit_quote_secure(text,text,text,text,jsonb,text)
  from public,anon,authenticated;
grant execute on function public.corp_submit_quote_secure(text,text,text,text,jsonb,text)
  to service_role;
commit;
