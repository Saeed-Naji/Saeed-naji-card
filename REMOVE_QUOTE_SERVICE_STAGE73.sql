-- STAGE73: disable the retired quote-request service without deleting history.
-- Run once in Supabase SQL Editor after uploading the Stage73 site files.
begin;

do $$
begin
  if to_regclass('public.quote_requests') is not null then
    execute 'drop policy if exists "Public create image quote request" on public.quote_requests';
    execute 'drop policy if exists "Admins manage quote requests" on public.quote_requests';
    execute 'drop policy if exists "Admin manage quotes by permission" on public.quote_requests';
    execute 'revoke all on table public.quote_requests from public, anon, authenticated';
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Public upload quote request image" on storage.objects';
    execute 'drop policy if exists "Admins manage quote request images" on storage.objects';
    execute 'drop policy if exists "Role manage quote request files" on storage.objects';
  end if;

  if to_regprocedure('public.get_quote_service_visibility_for_admin()') is not null then
    execute 'revoke all on function public.get_quote_service_visibility_for_admin() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.set_quote_service_visibility(boolean)') is not null then
    execute 'revoke all on function public.set_quote_service_visibility(boolean) from public, anon, authenticated';
  end if;
end
$$;

-- Remove retired permission keys while preserving every historical row/file.
do $$
begin
  if to_regclass('public.admin_users') is not null then
    update public.admin_users
       set permissions = array_remove(array_remove(coalesce(permissions,'{}'::text[]),'quotes'),'services')
     where permissions && array['quotes','services']::text[];
  end if;
end
$$;

commit;
select 'STAGE73_QUOTE_SERVICE_DISABLED' as status;
