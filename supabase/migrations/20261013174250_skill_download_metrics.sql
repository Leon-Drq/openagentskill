-- New, auditable site downloads. Never backfill from legacy/download-provider numbers.
alter table public.skills add column if not exists site_downloads bigint not null default 0 check (site_downloads >= 0);
create index if not exists skills_site_downloads_idx on public.skills (site_downloads desc, created_at desc);

create table public.skill_download_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_slug text not null check (skill_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'),
  download_day date not null default ((now() at time zone 'UTC')::date),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  artifact_kind text not null check (artifact_kind in ('skill-document', 'paid-file')),
  created_at timestamptz not null default now(),
  primary key (user_id, skill_slug, download_day)
);
create table public.skill_download_totals (
  skill_slug text primary key,
  downloads bigint not null default 0 check (downloads >= 0),
  updated_at timestamptz not null default now()
);
alter table public.skill_download_receipts enable row level security;
alter table public.skill_download_totals enable row level security;
revoke all on public.skill_download_receipts, public.skill_download_totals from public, anon, authenticated;
grant select, insert, update on public.skill_download_receipts, public.skill_download_totals to service_role;
create policy download_receipts_service on public.skill_download_receipts for all to service_role using (true) with check (true);
create policy download_totals_service on public.skill_download_totals for all to service_role using (true) with check (true);

-- Only the first-party server may call this after auth, visibility/entitlement,
-- full artifact read, byte length and SHA-256 verification have succeeded.
create function public.record_skill_download(p_user_id uuid, p_slug text, p_sha256 text, p_kind text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare total bigint;
begin
  insert into public.skill_download_receipts(user_id, skill_slug, artifact_sha256, artifact_kind)
  values (p_user_id, p_slug, p_sha256, p_kind) on conflict do nothing;
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
revoke all on function public.record_skill_download(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.record_skill_download(uuid,text,text,text) to service_role;
comment on column public.skills.site_downloads is 'On-site file responses to signed-in users, deduplicated per account/skill/UTC day since 2026-10-14. Not installs, source-site counts, or legacy estimates.';
