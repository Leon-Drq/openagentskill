-- Keep existing ZIP deliveries; motion now sells copyable text.
alter table public.commerce_releases
  add column delivery_kind text not null default 'package'
  check (delivery_kind in ('package', 'prompt', 'skill-instructions'));
alter table public.commerce_releases drop constraint commerce_releases_check;
alter table public.commerce_releases add constraint commerce_releases_path_check
  check (object_path = skill_slug || '/' || version || '/' || sha256 ||
    case when delivery_kind = 'package' then '.zip' else '.txt' end);
alter table public.commerce_releases add constraint commerce_releases_text_size_check
  check (delivery_kind = 'package' or size_bytes <= 1048576);
-- Bucket stays private. Existing restrictive Storage policies remain intact.
update storage.buckets set allowed_mime_types = array['application/zip', 'text/plain']
where id = 'skill-packages' and public = false;
