-- Send growing example memberships in a POST body instead of a URL query.
-- Reuse the existing public projection and invoker RLS; no review state changes.
create function public.skill_directory_by_slugs(p_slugs text[])
returns setof public.skill_directory_entries
language sql stable security invoker set search_path = ''
as $function$
  select d.* from public.skill_directory_entries d
  where cardinality(p_slugs) <= 50000 and d.slug = any(p_slugs);
$function$;
revoke all on function public.skill_directory_by_slugs(text[]) from public;
grant execute on function public.skill_directory_by_slugs(text[]) to anon, authenticated, service_role;
