-- Generated from lib/skills/taxonomy.ts. Run pnpm taxonomy:migration after vocabulary edits.
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
 select mapped into fallback from (values ('coding','coding-agents'),('coding-agent','coding-agents'),('development','coding-agents'),('developer-tools','coding-agents'),('agent-skills','coding-agents'),('testing-qa','coding-agents'),('api-testing','coding-agents'),('design','design-creative'),('creative','design-creative'),('image','image-generation'),('video','video-creation'),('video-generation','video-creation'),('media-automation','video-creation'),('rag-knowledge','ai-knowledge'),('rag','ai-knowledge'),('ml-automation','ai-knowledge'),('agent-frameworks','ai-knowledge'),('agent-to-agent-protocols','ai-knowledge'),('presentation-generation','presentation'),('ppt','presentation'),('finance-quant','finance'),('web3-analytics','finance'),('marketing-growth','marketing'),('growth-marketing','marketing'),('growth-automation','marketing'),('web-automation','automation'),('browser-automation','automation'),('web-scraping','automation'),('workflow','automation'),('workflow-automation','automation'),('self-hosted-automation','automation'),('legal-compliance','legal'),('data-analysis','data'),('sports-analytics','data'),('github-automation','coding-agents'),('productivity-automation','productivity'),('content-automation','marketing'),('support-automation','productivity'),('commerce-automation','marketing'),('business','productivity'),('robotics-iot','hardware'),('geo-science','research'),('utility','other'),('coding-agents','coding-agents'),('design-creative','design-creative'),('image-generation','image-generation'),('video-creation','video-creation'),('document-processing','document-processing'),('presentation','presentation'),('data','data'),('research','research'),('automation','automation'),('devops','devops'),('ai-knowledge','ai-knowledge'),('marketing','marketing'),('productivity','productivity'),('security','security'),('finance','finance'),('legal','legal'),('education','education'),('hardware','hardware'),('other','other')) as aliases(original,mapped)
 where original=regexp_replace(lower(trim(coalesce(p_category,''))),'[[:space:]_]+','-','g') limit 1;
 fallback := coalesce(fallback,'other'); primary_key := fallback;
 for r in select * from (values (0,'presentation','(^|[^a-z0-9])(pptx|ppt|powerpoint|presentation|presentations|slide|slides|slide deck|幻灯片|演示文稿)([^a-z0-9]|$)'),
(1,'video-creation','(^|[^a-z0-9])(video|videos|remotion|filmmaking|b-roll|broll|animation|audio|podcast|speech|transcription|视频|音频)([^a-z0-9]|$)'),
(2,'image-generation','(^|[^a-z0-9])(image generation|image editing|text-to-image|imagegen|canvas design|canvas-design|illustration|poster|photography|图像生成|图片编辑)([^a-z0-9]|$)'),
(3,'document-processing','(^|[^a-z0-9])(pdf|docx|document conversion|document processing|ocr|markitdown|文档处理)([^a-z0-9]|$)'),
(4,'finance','(^|[^a-z0-9])(finance|financial|trading|stock|stocks|quant|backtesting|investment|crypto|blockchain|金融|股票)([^a-z0-9]|$)'),
(5,'legal','(^|[^a-z0-9])(legal|law|contract review|compliance|法律|合规)([^a-z0-9]|$)'),
(6,'security','(^|[^a-z0-9])(security|vulnerability|vulnerabilities|pentest|password|prompt injection|安全|漏洞)([^a-z0-9]|$)'),
(7,'devops','(^|[^a-z0-9])(devops|deployment|deploy|kubernetes|docker|terraform|cloud infrastructure|ci/cd|部署)([^a-z0-9]|$)'),
(8,'ai-knowledge','(^|[^a-z0-9])(rag|knowledge base|knowledge-base|retrieval augmented|llm|llms|machine learning|model training|agent memory|agent orchestration|mcp server|知识库|模型训练)([^a-z0-9]|$)'),
(9,'data','(^|[^a-z0-9])(data analysis|data-analysis|analytics|data pipeline|database|sql|csv|xlsx|spreadsheet|statistics|数据分析|数据库)([^a-z0-9]|$)'),
(10,'marketing','(^|[^a-z0-9])(marketing|seo|sales|copywriting|campaign|ecommerce|e-commerce|newsletter|营销)([^a-z0-9]|$)'),
(11,'education','(^|[^a-z0-9])(education|teaching|tutoring|lesson|curriculum|教育|教学)([^a-z0-9]|$)'),
(12,'hardware','(^|[^a-z0-9])(robotics|robot|iot|arduino|raspberry pi|hardware|物联网)([^a-z0-9]|$)'),
(13,'design-creative','(^|[^a-z0-9])(design|ui|ux|figma|frontend|front-end|accessibility|设计)([^a-z0-9]|$)'),
(14,'automation','(^|[^a-z0-9])(browser|scraping|scraper|crawl|crawler|workflow automation|automate|automation|自动化|抓取)([^a-z0-9]|$)'),
(15,'research','(^|[^a-z0-9])(research|web search|literature|fact check|source verification|研究|检索)([^a-z0-9]|$)'),
(16,'productivity','(^|[^a-z0-9])(productivity|calendar|email|notes|meeting|communication|效率|日程)([^a-z0-9]|$)'),
(17,'coding-agents','(^|[^a-z0-9])(code|coding|developer|development|debug|testing|test|git|github|cli|编程|测试)([^a-z0-9]|$)')) as rules(priority,category,pattern) order by priority loop
 score := (case when identity_text ~ r.pattern then 10 else 0 end) + (case when summary_text ~ r.pattern then 3 else 0 end) + (case when tags_text ~ r.pattern then 4 else 0 end) + (case when fallback=r.category then 2 else 0 end);
 if score > best then best:=score; primary_key:=r.category; end if;
 end loop;
 all_text := identity_text || ' ' || summary_text || ' ' || tags_text;
 if all_text ~ '(^|[^a-z0-9])(frontend|front-end|react|nextjs|next.js)([^a-z0-9]|$)' then topics:=array_append(topics,'frontend'); end if;
 if all_text ~ '(^|[^a-z0-9])(code review|code-review)([^a-z0-9]|$)' then topics:=array_append(topics,'code-review'); end if;
 if all_text ~ '(^|[^a-z0-9])(testing|test|qa|playwright|vitest)([^a-z0-9]|$)' then topics:=array_append(topics,'testing'); end if;
 if all_text ~ '(^|[^a-z0-9])(git|github|pull request)([^a-z0-9]|$)' then topics:=array_append(topics,'git'); end if;
 if all_text ~ '(^|[^a-z0-9])(cli|command line|terminal)([^a-z0-9]|$)' then topics:=array_append(topics,'cli'); end if;
 if all_text ~ '(^|[^a-z0-9])(ui|ux|figma|design system)([^a-z0-9]|$)' then topics:=array_append(topics,'ui-design'); end if;
 if all_text ~ '(^|[^a-z0-9])(image editing|image editor|image-editing|background removal)([^a-z0-9]|$)' then topics:=array_append(topics,'image-editing'); end if;
 if all_text ~ '(^|[^a-z0-9])(image generation|imagegen|text-to-image|canvas-design|poster|illustration)([^a-z0-9]|$)' then topics:=array_append(topics,'image-generation'); end if;
 if all_text ~ '(^|[^a-z0-9])(video|remotion|filmmaking)([^a-z0-9]|$)' then topics:=array_append(topics,'video-generation'); end if;
 if all_text ~ '(^|[^a-z0-9])(audio|speech|transcription|podcast)([^a-z0-9]|$)' then topics:=array_append(topics,'audio'); end if;
 if all_text ~ '(^|[^a-z0-9])(pdf|ocr)([^a-z0-9]|$)' then topics:=array_append(topics,'pdf'); end if;
 if all_text ~ '(^|[^a-z0-9])(docx|markitdown|document conversion)([^a-z0-9]|$)' then topics:=array_append(topics,'document-conversion'); end if;
 if all_text ~ '(^|[^a-z0-9])(pptx|powerpoint|presentation|slides|slide deck)([^a-z0-9]|$)' then topics:=array_append(topics,'slides'); end if;
 if all_text ~ '(^|[^a-z0-9])(xlsx|csv|spreadsheet|excel)([^a-z0-9]|$)' then topics:=array_append(topics,'spreadsheets'); end if;
 if all_text ~ '(^|[^a-z0-9])(database|sql|postgres|supabase)([^a-z0-9]|$)' then topics:=array_append(topics,'databases'); end if;
 if all_text ~ '(^|[^a-z0-9])(data analysis|data-analysis|analytics|statistics)([^a-z0-9]|$)' then topics:=array_append(topics,'data-analysis'); end if;
 if all_text ~ '(^|[^a-z0-9])(web search|web research|fact check)([^a-z0-9]|$)' then topics:=array_append(topics,'web-research'); end if;
 if all_text ~ '(^|[^a-z0-9])(academic|literature review|research paper)([^a-z0-9]|$)' then topics:=array_append(topics,'academic-research'); end if;
 if all_text ~ '(^|[^a-z0-9])(browser|playwright|puppeteer)([^a-z0-9]|$)' then topics:=array_append(topics,'browser-automation'); end if;
 if all_text ~ '(^|[^a-z0-9])(scraping|scraper|crawl|crawler|extraction)([^a-z0-9]|$)' then topics:=array_append(topics,'web-scraping'); end if;
 if all_text ~ '(^|[^a-z0-9])(workflow automation|n8n|zapier)([^a-z0-9]|$)' then topics:=array_append(topics,'workflow-automation'); end if;
 if all_text ~ '(^|[^a-z0-9])(deploy|deployment|ci/cd|vercel|cloudflare)([^a-z0-9]|$)' then topics:=array_append(topics,'deployment'); end if;
 if all_text ~ '(^|[^a-z0-9])(kubernetes|docker|terraform|cloud infrastructure)([^a-z0-9]|$)' then topics:=array_append(topics,'cloud'); end if;
 if all_text ~ '(^|[^a-z0-9])(rag|retrieval augmented)([^a-z0-9]|$)' then topics:=array_append(topics,'rag'); end if;
 if all_text ~ '(^|[^a-z0-9])(knowledge base|knowledge-base|agent memory)([^a-z0-9]|$)' then topics:=array_append(topics,'knowledge-base'); end if;
 if all_text ~ '(^|[^a-z0-9])(machine learning|model training|fine-tuning)([^a-z0-9]|$)' then topics:=array_append(topics,'machine-learning'); end if;
 if all_text ~ '(^|[^a-z0-9])(seo|search engine optimization)([^a-z0-9]|$)' then topics:=array_append(topics,'seo'); end if;
 if all_text ~ '(^|[^a-z0-9])(copywriting|campaign|newsletter|content marketing)([^a-z0-9]|$)' then topics:=array_append(topics,'content-marketing'); end if;
 if all_text ~ '(^|[^a-z0-9])(email|calendar|scheduling)([^a-z0-9]|$)' then topics:=array_append(topics,'email-calendar'); end if;
 if all_text ~ '(^|[^a-z0-9])(notes|meeting|notion)([^a-z0-9]|$)' then topics:=array_append(topics,'notes'); end if;
 if all_text ~ '(^|[^a-z0-9])(security|vulnerability|pentest|prompt injection)([^a-z0-9]|$)' then topics:=array_append(topics,'security-audit'); end if;
 if all_text ~ '(^|[^a-z0-9])(finance|trading|stock|quant|backtesting)([^a-z0-9]|$)' then topics:=array_append(topics,'finance-analysis'); end if;
 if all_text ~ '(^|[^a-z0-9])(website|web app|html|frontend|ui)([^a-z0-9]|$)' then outputs:=array_append(outputs,'web'); end if;
 if all_text ~ '(^|[^a-z0-9])(image generation|image editing|imagegen|illustration|poster|canvas-design|png)([^a-z0-9]|$)' then outputs:=array_append(outputs,'image'); end if;
 if all_text ~ '(^|[^a-z0-9])(video|audio|animation|remotion|podcast)([^a-z0-9]|$)' then outputs:=array_append(outputs,'video'); end if;
 if all_text ~ '(^|[^a-z0-9])(pptx|presentation|slides|powerpoint)([^a-z0-9]|$)' then outputs:=array_append(outputs,'slides'); end if;
 if all_text ~ '(^|[^a-z0-9])(pdf|docx|document|report|markdown)([^a-z0-9]|$)' then outputs:=array_append(outputs,'document'); end if;
 if all_text ~ '(^|[^a-z0-9])(code|coding|developer|testing|test|cli|script)([^a-z0-9]|$)' then outputs:=array_append(outputs,'code'); end if;
 if all_text ~ '(^|[^a-z0-9])(data analysis|database|csv|xlsx|spreadsheet|analytics|sql)([^a-z0-9]|$)' then outputs:=array_append(outputs,'data'); end if;
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
