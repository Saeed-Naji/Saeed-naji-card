-- Independent Saeed Naji privacy notice draft and explicit owner publication.
-- Project ref: afrvoshsiqartsketiuv. No automatic customer deletion, no legal text assumed.
begin;
create table public.corp_privacy_policy (
  singleton boolean primary key default true check (singleton),
  controller_name text not null default '' check (char_length(controller_name) <= 180),
  privacy_contact text not null default '' check (char_length(privacy_contact) <= 180),
  purpose text not null default '' check (char_length(purpose) <= 2500),
  recipients text not null default '' check (char_length(recipients) <= 2500),
  rights_instructions text not null default '' check (char_length(rights_instructions) <= 2500),
  retention_days integer check (retention_days between 1 and 3650),
  is_published boolean not null default false,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint corp_privacy_publish_requirements check (
    not is_published or (
      length(btrim(controller_name)) between 2 and 180
      and length(btrim(privacy_contact)) between 5 and 180
      and length(btrim(purpose)) >= 20
      and length(btrim(recipients)) >= 10
      and length(btrim(rights_instructions)) >= 20
      and retention_days is not null
      and approved_at is not null
    )
  )
);
alter table public.corp_privacy_policy enable row level security;
revoke all on public.corp_privacy_policy from public,anon,authenticated;
grant select on public.corp_privacy_policy to anon,authenticated;
grant insert,update on public.corp_privacy_policy to authenticated;

create policy corp_privacy_public_read on public.corp_privacy_policy
for select to anon,authenticated using (is_published = true);

create policy corp_privacy_admin_read on public.corp_privacy_policy
for select to authenticated
using (exists (select 1 from public.corp_admin_members m
  where m.user_id=(select auth.uid())));

create policy corp_privacy_admin_insert on public.corp_privacy_policy
for insert to authenticated
with check (exists (select 1 from public.corp_admin_members m
  where m.user_id=(select auth.uid())));

create policy corp_privacy_admin_update on public.corp_privacy_policy
for update to authenticated
using (exists (select 1 from public.corp_admin_members m
  where m.user_id=(select auth.uid())))
with check (exists (select 1 from public.corp_admin_members m
  where m.user_id=(select auth.uid())));

-- Empty private draft. Nothing is published without verified owner approval.
insert into public.corp_privacy_policy(singleton) values (true);
commit;
