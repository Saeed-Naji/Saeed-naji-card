-- Saeed Naji corporate storage only (afrvoshsiqartsketiuv).
-- New independent PUBLIC image bucket. Old buckets and files remain untouched.
-- All uploads are restricted to corporate admin members via storage.objects RLS.
begin;
do $$
begin
  if exists (select 1 from storage.buckets where id='corp-product-images') then
    raise exception 'Corporate bucket already exists; inspect it before re-running this migration.';
  end if;
end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('corp-product-images','corp-product-images',true,3145728,
  array['image/jpeg','image/png','image/webp']::text[]);

create policy corp_images_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='corp-product-images'
  and (storage.foldername(name))[1]='catalog'
  and exists(
    select 1 from public.corp_admin_members m
    where m.user_id=(select auth.uid())
  )
);

create policy corp_images_admin_list
on storage.objects for select to authenticated
using (
  bucket_id='corp-product-images'
  and exists(
    select 1 from public.corp_admin_members m
    where m.user_id=(select auth.uid())
  )
);

-- Do not grant UPDATE/DELETE to browser sessions at this stage. Images use
-- immutable, random names; replacing/removing objects is a future audited feature.
-- Public image serving uses Supabase public bucket URLs; browsing files via API remains RLS-checked.
commit;
