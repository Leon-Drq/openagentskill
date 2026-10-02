-- Equivalent visibility and ownership rules; evaluate the current UID once.
set local lock_timeout = '3s';
set local statement_timeout = '30s';

alter policy bookmarks_select_own on public.bookmarks
  using ((select auth.uid()) = user_id);
alter policy bookmarks_insert_own on public.bookmarks
  with check ((select auth.uid()) = user_id);
alter policy bookmarks_delete_own on public.bookmarks
  using ((select auth.uid()) = user_id);

-- The three permissive SELECT policies were ORed by PostgreSQL. Keep exactly
-- that predicate in one policy, matching the public catalog's partial indexes.
drop policy if exists skills_select_approved_public on public.skills;
drop policy if exists skills_select_owner_published_public on public.skills;
drop policy if exists skills_select_static_public on public.skills;
create policy skills_select_public_catalog on public.skills
  for select to anon, authenticated
  using (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'));
