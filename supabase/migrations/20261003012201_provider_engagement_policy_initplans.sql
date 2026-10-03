-- Evaluate JWT/identity once per statement rather than once per scanned row.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
alter policy provider_engagement_select_own on public.provider_skill_engagement
  using ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
alter policy provider_engagement_insert_own on public.provider_skill_engagement
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
alter policy provider_engagement_update_own on public.provider_skill_engagement
  using ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false')
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
alter policy provider_engagement_delete_own on public.provider_skill_engagement
  using ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
