-- Exact package corrections; source metadata/review remain unchanged.
create or replace function public.classify_skill_taxonomy(p_name text,p_description text,p_tagline text,p_path text,p_category text,p_tags text[],p_repo text)
returns jsonb language sql immutable security invoker set search_path = pg_catalog as $$
 select case when corrected is null then result else jsonb_set(result,'{primary_category}',to_jsonb(corrected)) end
 from (select public.classify_skill_taxonomy(p_name,p_description,p_tagline,p_path,p_category,p_tags) as result,
 case lower(coalesce(p_repo,'')) || ':' || coalesce(p_path,'') when 'obra/superpowers:skills/using-superpowers/SKILL.md' then 'coding-agents'
when 'obra/superpowers:skills/verification-before-completion/SKILL.md' then 'coding-agents'
when 'tt-a1i/archify:archify/SKILL.md' then 'design-creative' else null end as corrected) input;
$$;
revoke all on function public.classify_skill_taxonomy(text,text,text,text,text,text[],text) from public;
grant execute on function public.classify_skill_taxonomy(text,text,text,text,text,text[],text) to anon,authenticated,service_role;
create or replace function public.set_skill_taxonomy() returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
declare result jsonb;
begin
 result:=public.classify_skill_taxonomy(new.name,new.description,new.tagline,new.source_path,new.category,new.tags,new.github_repo);
 new.primary_category:=result->>'primary_category';
 new.taxonomy_tags:=array(select jsonb_array_elements_text(result->'taxonomy_tags'));
 new.output_types:=array(select jsonb_array_elements_text(result->'output_types'));
 new.taxonomy_version:=1;
 return new;
end $$;
revoke all on function public.set_skill_taxonomy() from public;
drop trigger if exists skills_set_taxonomy on public.skills;
create trigger skills_set_taxonomy before insert or update of name,description,tagline,source_path,category,tags,github_repo on public.skills for each row execute function public.set_skill_taxonomy();
update public.skills set primary_category=case lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') when 'obra/superpowers:skills/using-superpowers/SKILL.md' then 'coding-agents'
when 'obra/superpowers:skills/verification-before-completion/SKILL.md' then 'coding-agents'
when 'tt-a1i/archify:archify/SKILL.md' then 'design-creative' else primary_category end
where lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') in ('obra/superpowers:skills/using-superpowers/SKILL.md','obra/superpowers:skills/verification-before-completion/SKILL.md','tt-a1i/archify:archify/SKILL.md');
