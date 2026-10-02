import { writeFileSync } from 'node:fs'
import { EXACT_SOURCE_CATEGORIES, CATEGORY_RULES, TOPIC_RULES, OUTPUT_RULES, LEGACY_CATEGORY_MAP, SKILL_CATEGORIES, facetPattern } from '../lib/skills/taxonomy.ts'
const quote = text => "'" + text.replaceAll("'", "''") + "'"
const values = CATEGORY_RULES.map((r,i) => `(${i},${quote(r.category)},${quote(r.pattern)})`).join(',\n')
const canonical = [...Object.entries(LEGACY_CATEGORY_MAP),...SKILL_CATEGORIES.map(c => [c[0],c[0]])]
const sql = `-- Generated from lib/skills/taxonomy.ts. Run pnpm taxonomy:migration after vocabulary edits.
-- Preserve category, source tags, publication, review, timestamps and Skill URLs.
set lock_timeout = '5s';
alter table public.skills add column if not exists primary_category text;
alter table public.skills add column if not exists taxonomy_tags text[] not null default '{}';
alter table public.skills add column if not exists output_types text[] not null default '{}';
alter table public.skills add column if not exists taxonomy_version integer not null default 0;
create or replace function public.classify_skill_taxonomy(p_name text, p_description text, p_tagline text, p_path text, p_category text, p_tags text[])
returns jsonb language plpgsql immutable security invoker set search_path = pg_catalog as $$
declare
 identity_text text := left(lower(coalesce(p_name,'') || ' ' || coalesce(p_path,'')),4000);
 summary_text text := left(lower(coalesce(p_description,'') || ' ' || coalesce(p_tagline,'')),8000);
 tags_text text := left(lower(coalesce(array_to_string(p_tags,' '),'')),4000);
 all_text text;
 fallback text;
 primary_key text;
 best integer := 0;
 score integer;
 r record;
 topics text[] := '{}';
 outputs text[] := '{}';
begin
 select mapped into fallback from (values ${canonical.map(([a,b])=>`(${quote(a)},${quote(b)})`).join(',')}) as aliases(original,mapped)
 where original=regexp_replace(lower(trim(coalesce(p_category,''))),'[[:space:]_]+','-','g') limit 1;
 fallback := coalesce(fallback,'other'); primary_key := fallback;
 for r in select * from (values ${values}) as rules(priority,category,pattern) order by priority loop
 score := (case when identity_text ~ r.pattern then 10 else 0 end) + (case when summary_text ~ r.pattern then 3 else 0 end) + (case when tags_text ~ r.pattern then 4 else 0 end) + (case when fallback=r.category then 2 else 0 end);
 if score > best then best:=score; primary_key:=r.category; end if;
 end loop;
 all_text := identity_text || ' ' || summary_text || ' ' || tags_text;
 ${TOPIC_RULES.map(t=>`if all_text ~ ${quote(facetPattern(t[4]))} then topics:=array_append(topics,${quote(t[0])}); end if;`).join('\n ')}
 ${OUTPUT_RULES.map(t=>`if all_text ~ ${quote(facetPattern(t[3]))} then outputs:=array_append(outputs,${quote(t[0])}); end if;`).join('\n ')}
 return jsonb_build_object('primary_category',primary_key,'taxonomy_tags',to_jsonb(topics),'output_types',to_jsonb(outputs),'taxonomy_version',1);
end $$;
revoke all on function public.classify_skill_taxonomy(text,text,text,text,text,text[]) from public;
grant execute on function public.classify_skill_taxonomy(text,text,text,text,text,text[]) to anon, authenticated, service_role;
create or replace function public.set_skill_taxonomy() returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
declare result jsonb;
begin
 result:=public.classify_skill_taxonomy(new.name,new.description,new.tagline,new.source_path,new.category,new.tags);
 new.primary_category:=result->>'primary_category';
 new.taxonomy_tags:=array(select jsonb_array_elements_text(result->'taxonomy_tags'));
 new.output_types:=array(select jsonb_array_elements_text(result->'output_types'));
 new.taxonomy_version:=1;
 return new;
end $$;
revoke all on function public.set_skill_taxonomy() from public;
drop trigger if exists skills_set_taxonomy on public.skills;
create trigger skills_set_taxonomy before insert or update of name,description,tagline,source_path,category,tags on public.skills for each row execute function public.set_skill_taxonomy();
-- Backfill is run in bounded batches by the operator after schema creation.
create index if not exists skills_primary_category_quality_idx on public.skills(primary_category,quality_score desc,slug);
create index if not exists skills_taxonomy_tags_idx on public.skills using gin(taxonomy_tags);
create index if not exists skills_output_types_idx on public.skills using gin(output_types);
comment on column public.skills.primary_category is 'Versioned per-Skill task classification; does not change source metadata or review.';
`
writeFileSync('supabase/migrations/20261002180000_skill_task_taxonomy.sql',sql)
// Existing publication and timestamp triggers must ignore derived-only backfills.
// Any change to original source/review fields still invokes the original functions.
const triggers = `
drop trigger if exists skill_static_publication on public.skills;
drop trigger if exists skill_static_publication_insert on public.skills;
drop trigger if exists skill_static_publication_update on public.skills;
create trigger skill_static_publication_insert before insert on public.skills for each row execute function public.set_static_publication_state();
drop trigger if exists update_skills_updated_at on public.skills;
-- BEFORE triggers cannot reference NEW generated columns. Compare explicit
-- source columns so generated search vectors and taxonomy are excluded.
do $$
declare old_fields text; new_fields text;
begin
 select string_agg(format('old.%I',attname),',' order by attnum),string_agg(format('new.%I',attname),',' order by attnum)
 into old_fields,new_fields from pg_attribute
 where attrelid='public.skills'::regclass and attnum>0 and not attisdropped and attgenerated=''
 and attname not in ('primary_category','taxonomy_tags','output_types','taxonomy_version');
 execute format('create trigger skill_static_publication_update before update on public.skills for each row when (row(%s) is distinct from row(%s)) execute function public.set_static_publication_state()',old_fields,new_fields);
 execute format('create trigger update_skills_updated_at before update on public.skills for each row when (row(%s) is distinct from row(%s)) execute function public.update_updated_at_column()',old_fields,new_fields);
end $$;
`
writeFileSync('supabase/migrations/20261002180000_skill_task_taxonomy.sql',sql + triggers)

const sourceCases = Object.entries(EXACT_SOURCE_CATEGORIES).map(([source,category]) => `when ${quote(source)} then ${quote(category)}`).join('\n')
writeFileSync('supabase/migrations/20261002180100_skill_taxonomy_exact_sources.sql',`-- Exact package corrections; source metadata/review remain unchanged.
create or replace function public.classify_skill_taxonomy(p_name text,p_description text,p_tagline text,p_path text,p_category text,p_tags text[],p_repo text)
returns jsonb language sql immutable security invoker set search_path = pg_catalog as $$
 select case when corrected is null then result else jsonb_set(result,'{primary_category}',to_jsonb(corrected)) end
 from (select public.classify_skill_taxonomy(p_name,p_description,p_tagline,p_path,p_category,p_tags) as result,
 case lower(coalesce(p_repo,'')) || ':' || coalesce(p_path,'') ${sourceCases} else null end as corrected) input;
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
update public.skills set primary_category=case lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') ${sourceCases} else primary_category end
where lower(coalesce(github_repo,'')) || ':' || coalesce(source_path,'') in (${Object.keys(EXACT_SOURCE_CATEGORIES).map(quote).join(',')});
`)
