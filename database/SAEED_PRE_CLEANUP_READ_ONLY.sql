-- READ-ONLY PRE-FLIGHT for Saeed-Naji corporate project.
-- Expected Supabase ref: afrvoshsiqartsketiuv
-- Safe to run in SQL Editor. This file contains no DELETE, DROP, UPDATE or DDL.
-- Run before taking backup, and again after exporting to detect changes.
select
  'public_tables' as check_name,
  count(*)::text as value
from pg_tables where schemaname='public'
union all
select 'corporate_tables', count(*)::text from pg_tables where schemaname='public' and tablename like 'corp\_%' escape '\'
union all
select 'legacy_tables', count(*)::text from pg_tables where schemaname='public' and tablename not like 'corp\_%' escape '\'
union all
select 'public_functions', count(*)::text
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
union all
select 'auth_users',count(*)::text from auth.users
union all
select 'storage_buckets', count(*)::text from storage.buckets
union all
select 'storage_file_records', count(*)::text from storage.objects
union all
select 'corporate_demo_products',count(*)::text from public.corp_products
union all
select 'approved_corporate_admins',count(*)::text from public.corp_admin_members
union all
select 'corporate_quote_requests',count(*)::text from public.corp_quote_requests
union all
select 'legacy_cron_jobs',count(*)::text from cron.job where jobname='flower-light-analytics-retention'
order by check_name;

-- RLS policy names: no customer content is returned.
select tablename, policyname,cmd,roles
from pg_policies
where schemaname='public' and tablename like 'corp\_%' escape '\'
order by tablename,policyname;

-- Inventory only. The original media bytes are NOT backed up by SQL.
select id,name,public, (select count(*) from storage.objects o where o.bucket_id=b.id) as file_count
from storage.buckets b order by id;
