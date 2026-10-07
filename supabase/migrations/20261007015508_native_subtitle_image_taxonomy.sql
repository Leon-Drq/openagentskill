begin;
set local lock_timeout = '5s';
-- Generated exact package corrections; source metadata/review remain unchanged.
create or replace function public.classify_skill_taxonomy(p_name text,p_description text,p_tagline text,p_path text,p_category text,p_tags text[],p_repo text)
returns jsonb language sql immutable security invoker set search_path = pg_catalog as $$
 select result || coalesce(corrected,'{}'::jsonb)
 from (select public.classify_skill_taxonomy(p_name,p_description,p_tagline,p_path,p_category,p_tags) as result,
 case lower(coalesce(p_repo,'')) || ':' || coalesce(p_path,'') when 'obra/superpowers:skills/using-superpowers/SKILL.md' then '{"primary_category":"coding-agents"}'::jsonb
when 'obra/superpowers:skills/verification-before-completion/SKILL.md' then '{"primary_category":"coding-agents"}'::jsonb
when 'tt-a1i/archify:archify/SKILL.md' then '{"primary_category":"design-creative"}'::jsonb
when 'chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md' then '{"primary_category":"image-generation","taxonomy_tags":["image-editing"],"output_types":["image"]}'::jsonb else null end as corrected) input;
$$;
revoke all on function public.classify_skill_taxonomy(text,text,text,text,text,text[],text) from public;
grant execute on function public.classify_skill_taxonomy(text,text,text,text,text,text[],text) to anon,authenticated,service_role;

-- Only derived discovery fields may change, including through existing triggers.
do $$
declare before_original jsonb; after_original jsonb;
begin
 select jsonb_agg(to_jsonb(s) - 'primary_category' - 'taxonomy_tags' - 'output_types' - 'taxonomy_version' order by s.slug)
 into before_original from public.skills s where lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') in ('chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md');
 with corrected as (
  select id, public.classify_skill_taxonomy(name,description,tagline,source_path,category,tags,github_repo) as taxonomy
  from public.skills where lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') in ('chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md')
 )
 update public.skills s set
  primary_category = corrected.taxonomy->>'primary_category',
  taxonomy_tags = array(select jsonb_array_elements_text(corrected.taxonomy->'taxonomy_tags')),
  output_types = array(select jsonb_array_elements_text(corrected.taxonomy->'output_types')),
  taxonomy_version = (corrected.taxonomy->>'taxonomy_version')::integer
 from corrected where s.id = corrected.id;
 select jsonb_agg(to_jsonb(s) - 'primary_category' - 'taxonomy_tags' - 'output_types' - 'taxonomy_version' order by s.slug)
 into after_original from public.skills s where lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') in ('chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md');
 if before_original is distinct from after_original then
  raise exception 'Taxonomy correction changed original source, publication, review or timestamp fields';
 end if;
end $$;
commit;
