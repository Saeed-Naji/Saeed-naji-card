-- Flower Light: dynamic permissions for ?admin=2
-- Run this file once in Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.admin_panel_permissions (
  panel text primary key,
  permissions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint admin_panel_permissions_panel_check check (panel in ('2')),
  constraint admin_panel_permissions_json_check check (jsonb_typeof(permissions) = 'array')
);

insert into public.admin_panel_permissions (panel, permissions)
values ('2', '["sections", "products"]'::jsonb)
on conflict (panel) do nothing;

alter table public.admin_panel_permissions enable row level security;
revoke all on table public.admin_panel_permissions from anon, authenticated;

create or replace function public.get_admin_panel_permissions(p_panel text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_panel <> '2' then
    return '[]'::jsonb;
  end if;

  select permissions into result
  from public.admin_panel_permissions
  where panel = p_panel;

  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.set_admin2_permissions(
  p_admin1_password text,
  p_permissions text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cleaned text[];
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(public.verify_admin_panel_password('1', p_admin1_password), false) is not true then
    raise exception 'ADMIN_1_PASSWORD_INVALID';
  end if;

  select coalesce(array_agg(permission order by permission), array[]::text[])
  into cleaned
  from (
    select distinct permission
    from unnest(coalesce(p_permissions, array[]::text[])) as permission
    where permission in (
      'analytics',
      'quotes',
      'sections',
      'products',
      'profile',
      'contacts',
      'leads'
    )
  ) allowed;

  insert into public.admin_panel_permissions (panel, permissions, updated_at)
  values ('2', to_jsonb(cleaned), now())
  on conflict (panel) do update
  set permissions = excluded.permissions,
      updated_at = excluded.updated_at
  returning permissions into result;

  return result;
end;
$$;

revoke all on function public.get_admin_panel_permissions(text) from public, anon;
revoke all on function public.set_admin2_permissions(text, text[]) from public, anon;
grant execute on function public.get_admin_panel_permissions(text) to authenticated;
grant execute on function public.set_admin2_permissions(text, text[]) to authenticated;

notify pgrst, 'reload schema';
