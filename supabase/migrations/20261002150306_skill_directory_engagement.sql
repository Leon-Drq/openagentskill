-- Skill-level community votes; Gallery case votes and agent outcomes stay separate.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create table public.skill_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_slug text not null references public.skills(slug) on delete cascade,
  vote smallint not null check (vote in (-1,1)),
  created_at timestamptz not null default now(),
  primary key (user_id,skill_slug)
);
create index skill_votes_slug_idx on public.skill_votes(skill_slug);
alter table public.skill_votes enable row level security;
revoke all on public.skill_votes from public,anon,authenticated;
grant select,delete on public.skill_votes to authenticated;
grant insert (user_id,skill_slug,vote), update (vote) on public.skill_votes to authenticated;
grant all on public.skill_votes to service_role;
create policy skill_votes_select_own on public.skill_votes for select to authenticated
  using ((select auth.uid())=user_id);
create policy skill_votes_insert_own_public on public.skill_votes for insert to authenticated
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
    and exists(select 1 from public.skills s where s.slug=skill_slug and (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))));
create policy skill_votes_update_own_public on public.skill_votes for update to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false'
    and exists(select 1 from public.skills s where s.slug=skill_slug and (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))));
create policy skill_votes_delete_own on public.skill_votes for delete to authenticated
  using ((select auth.uid())=user_id);
create function public.set_skill_vote(target_slug text,direction smallint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then
    raise exception 'Sign in to vote' using errcode='42501';
  end if;
  if direction is null then
    delete from public.skill_votes where user_id=auth.uid() and skill_slug=target_slug;
  else
    insert into public.skill_votes(user_id,skill_slug,vote) values(auth.uid(),target_slug,direction)
    on conflict(user_id,skill_slug) do update set vote=excluded.vote;
  end if;
end;
$$;
revoke all on function public.set_skill_vote(text,smallint) from public,anon,authenticated;
grant execute on function public.set_skill_vote(text,smallint) to authenticated;
-- Only the server can aggregate; public responses contain no voter identities.
create function public.skill_vote_counts(skill_slugs text[])
returns table(skill_slug text,likes bigint,dislikes bigint)
language sql stable security invoker set search_path = '' as $$
  select s.slug,count(v.user_id) filter(where v.vote=1),count(v.user_id) filter(where v.vote=-1)
  from public.skills s left join public.skill_votes v on v.skill_slug=s.slug
  where s.slug=any(skill_slugs) and cardinality(skill_slugs)<=64
    and (s.ai_review_approved=true or s.listing_status in ('owner_published','static_checked'))
  group by s.slug;
$$;
revoke all on function public.skill_vote_counts(text[]) from public,anon,authenticated;
grant execute on function public.skill_vote_counts(text[]) to service_role;
notify pgrst,'reload schema';
