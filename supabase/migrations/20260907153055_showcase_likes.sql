-- The catalog uses stable case slugs; register future cases here before publishing them.
create table public.showcase_entries (
  slug text primary key,
  created_at timestamptz not null default now()
);
insert into public.showcase_entries (slug) values
  ('room-to-grow-poster'), ('floria-floral-studio'), ('editorial-html-slides'),
  ('football-collage-explainer'), ('money-collage-explainer'), ('silicon-valley-explainer'),
  ('gamified-habit-app'), ('editorial-web-dashboard'), ('live-data-dashboard'), ('research-decision-room');
alter table public.showcase_entries enable row level security;
revoke all on public.showcase_entries from public, anon, authenticated;
grant select on public.showcase_entries to anon, authenticated;
grant all on public.showcase_entries to service_role;
create policy "Published showcase entries are public" on public.showcase_entries
  for select to anon, authenticated using (true);

create table public.showcase_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  case_slug text not null references public.showcase_entries(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, case_slug)
);
create index showcase_likes_case_slug_idx on public.showcase_likes(case_slug);
alter table public.showcase_likes enable row level security;
revoke all on public.showcase_likes from public, anon, authenticated;
grant select, delete on public.showcase_likes to authenticated;
grant insert (user_id, case_slug) on public.showcase_likes to authenticated;
grant all on public.showcase_likes to service_role;
create policy "Users read their own showcase likes" on public.showcase_likes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Registered users like a showcase once" on public.showcase_likes
  for insert to authenticated with check (
    (select auth.uid()) = user_id and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false'
  );
create policy "Users remove their own showcase likes" on public.showcase_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Server-only aggregation: no public voter identities, definer privileges, or mutable counters.
create function public.showcase_like_counts(case_slugs text[])
returns table (case_slug text, like_count bigint)
language sql stable security invoker set search_path = ''
as $$
  select e.slug, count(l.user_id)
  from public.showcase_entries e
  left join public.showcase_likes l on l.case_slug = e.slug
  where e.slug = any(case_slugs)
  group by e.slug;
$$;
revoke all on function public.showcase_like_counts(text[]) from public, anon, authenticated;
grant execute on function public.showcase_like_counts(text[]) to service_role;
