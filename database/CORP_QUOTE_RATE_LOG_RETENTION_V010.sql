-- Saeed Naji corporate v0.10: remove old RATE-LIMIT metadata after 48 hours.
-- Applies to project afrvoshsiqartsketiuv only. Does NOT delete customer quotes.
-- Corporate quote rate limits themselves remain one hour.
begin;
do $$
begin
  if not exists(select 1 from pg_tables where schemaname='public' and tablename='corp_quote_intake_log') then
    raise exception 'Corporate rate-limit log missing; no cron created';
  end if;
  if exists(select 1 from cron.job where jobname='saeed-corp-quote-rate-log-48h') then
    raise exception 'Corporate cleanup job exists; review before reapplying';
  end if;
end $$;
select cron.schedule(
  'saeed-corp-quote-rate-log-48h',
  '11 3 * * *',
  $cleanup$delete from public.corp_quote_intake_log where created_at < now() - interval '48 hours'$cleanup$
);
commit;
