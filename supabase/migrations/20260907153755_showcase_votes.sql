-- Preserve existing likes as upvotes while adding mutually exclusive downvotes.
alter table public.showcase_likes rename to showcase_votes;
alter table public.showcase_votes add column vote smallint not null default 1 check (vote in (-1, 1));
grant insert (vote), update (vote) on public.showcase_votes to authenticated;
create policy "Users change their own showcase vote" on public.showcase_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');

create function public.set_showcase_vote(target_slug text, direction smallint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous', 'false') <> 'false' then
    raise exception 'Sign in to vote' using errcode = '42501';
  end if;
  if direction is null then
    delete from public.showcase_votes where user_id = auth.uid() and case_slug = target_slug;
  else
    insert into public.showcase_votes (user_id, case_slug, vote) values (auth.uid(), target_slug, direction)
    on conflict (user_id, case_slug) do update set vote = excluded.vote;
  end if;
end;
$$;
revoke all on function public.set_showcase_vote(text, smallint) from public, anon, authenticated;
grant execute on function public.set_showcase_vote(text, smallint) to authenticated;

drop function public.showcase_like_counts(text[]);
create function public.showcase_vote_counts(case_slugs text[])
returns table (case_slug text, likes bigint, dislikes bigint)
language sql stable security invoker set search_path = '' as $$
  select e.slug, count(v.user_id) filter (where v.vote = 1), count(v.user_id) filter (where v.vote = -1)
  from public.showcase_entries e
  left join public.showcase_votes v on v.case_slug = e.slug
  where e.slug = any(case_slugs)
  group by e.slug;
$$;
revoke all on function public.showcase_vote_counts(text[]) from public, anon, authenticated;
grant execute on function public.showcase_vote_counts(text[]) to service_role;
