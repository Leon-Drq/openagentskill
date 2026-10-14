-- Expand the owner-defined download metric to command copies and source exits.
-- Existing file receipts and record_skill_download callers remain compatible.
alter table public.skill_download_receipts drop constraint skill_download_receipts_pkey;
alter table public.skill_download_receipts
  add column visitor_key text check (visitor_key ~ '^[a-f0-9]{64}$'),
  alter column user_id drop not null,
  alter column artifact_sha256 drop not null,
  drop constraint skill_download_receipts_artifact_kind_check;
alter table public.skill_download_receipts
  add column actor_key text generated always as (case when user_id is not null then 'user:' || user_id::text else 'visitor:' || visitor_key end) stored,
  add constraint download_receipt_actor check ((user_id is not null) <> (visitor_key is not null)),
  add constraint download_receipt_kind check (artifact_kind in ('skill-document','paid-file','command-copy','external-open')),
  add constraint download_receipt_artifact check (
    (artifact_kind in ('skill-document','paid-file') and artifact_sha256 is not null) or
    (artifact_kind in ('command-copy','external-open') and artifact_sha256 is null)),
  add primary key (actor_key, skill_slug, download_day);

create function public.record_skill_download_action(p_user_id uuid, p_visitor_key text, p_slug text, p_kind text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare total bigint;
begin
  if p_kind not in ('command-copy','external-open') then raise exception 'invalid action'; end if;
  insert into public.skill_download_receipts(user_id, visitor_key, skill_slug, artifact_kind)
  values (p_user_id, p_visitor_key, p_slug, p_kind) on conflict do nothing;
  if not found then
    select downloads into total from public.skill_download_totals where skill_slug = p_slug;
    return coalesce(total, 0);
  end if;
  insert into public.skill_download_totals(skill_slug, downloads) values(p_slug, 1)
  on conflict(skill_slug) do update set downloads = public.skill_download_totals.downloads + 1, updated_at = now()
  returning downloads into total;
  update public.skills set site_downloads = total where slug = p_slug;
  return total;
end $$;
revoke all on function public.record_skill_download_action(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_skill_download_action(uuid,text,text,text) to service_role;
comment on column public.skills.site_downloads is 'Site download actions since 2026-10-14: file responses, successful command copies, and source-site clicks. Deduplicated per account or guest browser/skill/UTC day. Not verified installs or source-site totals.';
notify pgrst, 'reload schema';
