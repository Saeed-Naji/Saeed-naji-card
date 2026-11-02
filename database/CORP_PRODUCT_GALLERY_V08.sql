-- Saeed Naji corporate product gallery v0.8.
-- Project: afrvoshsiqartsketiuv; legacy tables/Storage are not modified.
-- Allow one main image_path and up to four additional gallery URLs.
begin;
alter table public.corp_products
  add column gallery_images text[] not null default '{}'::text[]
  constraint corp_gallery_limit check (
    cardinality(gallery_images) <= 4
    and array_position(gallery_images, null) is null
    and length(array_to_string(gallery_images,'')) <= 8192
  );
commit;
