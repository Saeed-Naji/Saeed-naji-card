-- WARNING / تحذير: permanently deletes ONLY the legacy site's allowlisted public tables.
-- Target: Supabase Saeed Naji, project afrvoshsiqartsketiuv.
-- DO NOT EXECUTE until verified full database backup (schema+data+roles), Auth and Storage exports.
-- Do not use in Flower Light old Supabase project or any other project.
-- The four corp_* tables created for Saeed's NEW corporate site are explicitly preserved.
-- The deletion is not executed automatically; review and run manually in the project SQL Editor.
begin;
do $guard$
declare actual_tables text[]; actual_functions text[];
expected_tables text[] := array['admin_panel_passwords','admin_recovery_settings','admin_users','analytics_daily','analytics_events','categories','contact_items','customer_leads','product_images','products','quote_requests','site_catalog','site_catalogs','site_profile','site_settings'];
expected_functions text[] := array['enforce_product_images_max_four','get_current_admin_access','get_datasheet_settings','get_quote_service_visibility_for_admin','get_site_analytics','get_site_analytics_for_admin','has_admin_permission','is_site_admin','is_site_owner','log_site_event','maintain_analytics_retention','owner_get_admin2_settings','owner_set_admin2_settings','owner_set_datasheet_fields','reorder_products','reorder_products_for_admin','reset_site_analytics','reset_site_analytics_for_admin','set_product_gallery','set_product_gallery_for_admin','set_quote_service_visibility','set_updated_at','suppress_recent_duplicate_customer_lead'];
begin
 select array_agg(tablename::text order by tablename) into actual_tables
 from pg_tables where schemaname='public' and tablename not like 'corp\_%' escape '\';
 if actual_tables is distinct from expected_tables then
   raise exception 'Unexpected old public tables: %. No deletion performed.',actual_tables;
 end if;
 select array_agg(p.proname::text order by p.proname) into actual_functions
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname not like 'corp\_%' escape '\';
 if actual_functions is distinct from expected_functions then
   raise exception 'Unexpected old public functions: %. No deletion performed.',actual_functions;
 end if;
 if (select count(*) from pg_tables where schemaname='public' and tablename like 'corp\_%' escape '\') <> 4
 then raise exception 'Corporate tables missing. No deletion performed.';
 end if;
end $guard$;

-- The existing legacy cron references a function to be removed.
do $cron$
declare j record;
begin
 for j in select jobid from cron.job
  where jobname='flower-light-analytics-retention'
    and position('maintain_analytics_retention' in command)>0
 loop
  perform cron.unschedule(j.jobid);
 end loop;
end $cron$;

-- Policies attached to Supabase-managed Storage objects invoke the old site's helpers.
-- These policies must be replaced later with corporate-specific Storage rules.
drop policy if exists "Role manage catalog files" on storage.objects;
drop policy if exists "Role manage product files" on storage.objects;
drop policy if exists "catalog files public read" on storage.objects;

-- Explicitly allowlisted old tables only. The four corp_* tables are not included.
do $delete_old_tables$
declare n text;
begin
 foreach n in array array['admin_panel_passwords','admin_recovery_settings','admin_users','analytics_daily','analytics_events','categories','contact_items','customer_leads','product_images','products','quote_requests','site_catalog','site_catalogs','site_profile','site_settings'] loop
   execute format('drop table public.%I cascade',n);
 end loop;
end $delete_old_tables$;

-- Explicitly allowlisted old helper functions only (including overload signatures).
do $delete_old_functions$
declare fn record;
begin
 for fn in
   select p.proname,pg_get_function_identity_arguments(p.oid) as args
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname=any(array['enforce_product_images_max_four','get_current_admin_access','get_datasheet_settings','get_quote_service_visibility_for_admin','get_site_analytics','get_site_analytics_for_admin','has_admin_permission','is_site_admin','is_site_owner','log_site_event','maintain_analytics_retention','owner_get_admin2_settings','owner_set_admin2_settings','owner_set_datasheet_fields','reorder_products','reorder_products_for_admin','reset_site_analytics','reset_site_analytics_for_admin','set_product_gallery','set_product_gallery_for_admin','set_quote_service_visibility','set_updated_at','suppress_recent_duplicate_customer_lead'])
 loop
   execute format('drop function if exists public.%I(%s) cascade',fn.proname,fn.args);
 end loop;
end $delete_old_functions$;
commit;

-- OUTSIDE SQL: Auth users, Storage files/buckets, Edge Functions and API keys are NOT deleted by this file.
-- Use their respective Supabase dashboard controls after reviewing full exports and decommissioning uses.
