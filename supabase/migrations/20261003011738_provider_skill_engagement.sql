-- Owner-curated provider entries share the directory without becoming reviewed
-- GitHub SkillRecords. Only an authenticated user's own interactions are writable.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create table public.provider_skill_catalog (
  slug text primary key,
  provider text not null check (provider in ('skillry','redskill')),
  source_url text not null check (source_url like 'https://%')
);
insert into public.provider_skill_catalog(slug,provider,source_url) values
  ('skillry-grokbot-avatar','skillry','https://skillry.dev/skills/bs-grokbot-avatar'),
  ('skillry-field-notes-deck','skillry','https://skillry.dev/skills/bs-field-notes-deck'),
  ('skillry-scattered-cards-magazine','skillry','https://skillry.dev/skills/bs-scattered-cards-magazine'),
  ('skillry-cadence-marketing-landing','skillry','https://skillry.dev/skills/bs-cadence-marketing-landing'),
  ('skillry-inclusive-cutpaper-deck','skillry','https://skillry.dev/skills/bs-inclusive-cutpaper-deck'),
  ('skillry-sky-glass-deck','skillry','https://skillry.dev/skills/bs-sky-glass-deck'),
  ('skillry-claude-style-illustration','skillry','https://skillry.dev/skills/bs-claude-style-illustration'),
  ('skillry-research-talk-deck','skillry','https://skillry.dev/skills/bs-research-talk-deck'),
  ('redskill-curtain-branch-swallow','redskill','https://xhslink.cn/o/2WbYk12a1h4');
alter table public.provider_skill_catalog enable row level security;
revoke all on public.provider_skill_catalog from public,anon,authenticated;
grant select on public.provider_skill_catalog to authenticated;
grant all on public.provider_skill_catalog to service_role;
create policy provider_catalog_read on public.provider_skill_catalog for select to authenticated using (true);

create table public.provider_skill_engagement (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_slug text not null references public.provider_skill_catalog(slug) on delete cascade,
  vote smallint check (vote in (-1,1)),
  saved boolean not null default false,
  primary key(user_id,skill_slug)
);
create index provider_engagement_slug_idx on public.provider_skill_engagement(skill_slug);
alter table public.provider_skill_engagement enable row level security;
revoke all on public.provider_skill_engagement from public,anon,authenticated;
grant select,insert,update,delete on public.provider_skill_engagement to authenticated;
grant all on public.provider_skill_engagement to service_role;
create policy provider_engagement_select_own on public.provider_skill_engagement for select to authenticated
  using ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
create policy provider_engagement_insert_own on public.provider_skill_engagement for insert to authenticated
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
create policy provider_engagement_update_own on public.provider_skill_engagement for update to authenticated
  using ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false')
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
create policy provider_engagement_delete_own on public.provider_skill_engagement for delete to authenticated
  using ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');

-- A single atomic upsert preserves a simultaneous vote when saving, and vice versa.
create function public.set_provider_skill_engagement(target_slug text,intent text,direction smallint default null,target_saved boolean default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then
    raise exception 'Sign in to interact' using errcode='42501';
  end if;
  if intent is null or intent not in ('vote','save')
    or (intent='vote' and direction is not null and direction not in (-1,1))
    or (intent='save' and target_saved is null) then
    raise exception 'Invalid interaction' using errcode='22023';
  end if;
  insert into public.provider_skill_engagement(user_id,skill_slug,vote,saved)
  values(auth.uid(),target_slug,case when intent='vote' then direction else null end,case when intent='save' then target_saved else false end)
  on conflict(user_id,skill_slug) do update set
    vote=case when intent='vote' then excluded.vote else provider_skill_engagement.vote end,
    saved=case when intent='save' then excluded.saved else provider_skill_engagement.saved end;
end;
$$;
revoke all on function public.set_provider_skill_engagement(text,text,smallint,boolean) from public,anon,authenticated;
grant execute on function public.set_provider_skill_engagement(text,text,smallint,boolean) to authenticated;
create function public.provider_skill_vote_counts(skill_slugs text[])
returns table(skill_slug text,likes bigint,dislikes bigint)
language sql stable security invoker set search_path = '' as $$
  select s.slug,count(v.user_id) filter(where v.vote=1),count(v.user_id) filter(where v.vote=-1)
  from public.provider_skill_catalog s left join public.provider_skill_engagement v on v.skill_slug=s.slug
  where s.slug=any(skill_slugs) and cardinality(skill_slugs)<=64 group by s.slug;
$$;
revoke all on function public.provider_skill_vote_counts(text[]) from public,anon,authenticated;
grant execute on function public.provider_skill_vote_counts(text[]) to service_role;
notify pgrst,'reload schema';
