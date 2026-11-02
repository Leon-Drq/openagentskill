import {writeFileSync} from 'node:fs'
const now="(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
const sql=[`-- Private derived values. The application exposes only the source business tables.
CREATE VIEW d1_skill_quality AS
WITH base AS (
 SELECT s.id,s.slug,max(coalesce(s.github_stars,0),0) AS stars,s.github_repo,s.verified,s.tags,s.ai_review_score,s.ai_review_approved,
 coalesce(s.github_last_pushed_at,s.last_synced_at,s.updated_at,s.created_at) AS fresh,
 coalesce(ss.total_calls,0) AS calls,coalesce(ss.success_rate,0) AS success
 FROM skills s LEFT JOIN skill_stats ss ON ss.skill_slug=s.slug
), signals AS (
 SELECT id,slug,min(35,round(ln(stars+1)/ln(10)*7,2)) AS star_score,
 round(min(15,max(0,CASE WHEN json_type(ai_review_score,'$.total') IN ('integer','real') AND json_extract(ai_review_score,'$.source')='open-skill-submission' THEN json_extract(ai_review_score,'$.total')/40.0*15
 WHEN json_type(ai_review_score,'$.total') IN ('integer','real') THEN json_extract(ai_review_score,'$.total')/100.0*15 WHEN ai_review_approved=1 THEN 10.5 ELSE 0 END)),2) AS review_score,
 CASE WHEN julianday(fresh)>=julianday('now','-30 days') THEN 15 WHEN julianday(fresh)>=julianday('now','-90 days') THEN 12 WHEN julianday(fresh)>=julianday('now','-180 days') THEN 8 WHEN julianday(fresh)>=julianday('now','-365 days') THEN 4 ELSE 0 END AS freshness_score,
 CASE WHEN calls>=20 THEN round(min(20,success/100.0*20),2) WHEN calls>=5 THEN round(min(12,success/100.0*12),2) WHEN calls>0 THEN 5 ELSE 0 END AS usage_score,
 (CASE WHEN instr(github_repo,'/')>1 AND instr(substr(github_repo,instr(github_repo,'/')+1),'/')=0 AND length(substr(github_repo,instr(github_repo,'/')+1))>0 THEN 3 ELSE 0 END
 + CASE WHEN json_array_length(tags)>=3 THEN 4 ELSE 0 END + CASE WHEN verified=1 THEN 8 ELSE 0 END) AS metadata_score
 FROM base
)
SELECT id,slug,min(100,round(star_score+review_score+freshness_score+usage_score+metadata_score,2)) AS quality_score,
 json_object('star_score',star_score,'review_score',review_score,'freshness_score',freshness_score,'usage_score',usage_score,'metadata_score',metadata_score,'model','v2') AS quality_signals FROM signals;`]
const quality=ref=>`UPDATE skills SET (quality_score,quality_signals)=(SELECT quality_score,quality_signals FROM d1_skill_quality WHERE id=skills.id),updated_at=${now} WHERE slug=${ref}.skill_slug;`
for(const [event,ref]of[['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])sql.push(`CREATE TRIGGER skill_stats_quality_${event.toLowerCase()} AFTER ${event} ON skill_stats BEGIN ${quality(ref)} END;`)
for(const event of ['INSERT','UPDATE OF github_stars,github_repo,verified,tags,ai_review_score,ai_review_approved,github_last_pushed_at'])sql.push(`CREATE TRIGGER skills_quality_${event==='INSERT'?'insert':'update'} AFTER ${event} ON skills BEGIN
 UPDATE skills SET (quality_score,quality_signals)=(SELECT quality_score,quality_signals FROM d1_skill_quality WHERE id=NEW.id),updated_at=${now} WHERE id=NEW.id;
END;`)
const feedback=ref=>`INSERT INTO skill_stats(skill_slug,total_calls,success_calls,success_rate,avg_latency_ms,unique_agents,last_called_at,updated_at)
 SELECT skill_slug,count(*),sum(success),round(sum(success)*100.0/count(*),2),cast(round(avg(latency_ms),0) AS INTEGER),count(DISTINCT agent_id),max(created_at),${now}
 FROM skill_feedback WHERE skill_slug=${ref}.skill_slug AND EXISTS(SELECT 1 FROM skills WHERE slug=${ref}.skill_slug) GROUP BY skill_slug
 ON CONFLICT(skill_slug) DO UPDATE SET total_calls=excluded.total_calls,success_calls=excluded.success_calls,success_rate=excluded.success_rate,
 avg_latency_ms=excluded.avg_latency_ms,unique_agents=excluded.unique_agents,last_called_at=excluded.last_called_at,updated_at=excluded.updated_at;
 DELETE FROM skill_stats WHERE skill_slug=${ref}.skill_slug AND NOT EXISTS(SELECT 1 FROM skill_feedback WHERE skill_slug=${ref}.skill_slug);`
for(const event of ['INSERT','UPDATE','DELETE'])sql.push(`CREATE TRIGGER feedback_stats_${event.toLowerCase()} AFTER ${event} ON skill_feedback BEGIN
 ${feedback(event==='DELETE'?'OLD':'NEW')}${event==='UPDATE'?'\n'+feedback('OLD'):''}
END;`)
const publicExpr=ref=>`coalesce(${ref}.ai_review_approved=1 OR ${ref}.listing_status IN ('static_checked','owner_published'),0)`
for(const event of ['INSERT','DELETE','UPDATE OF ai_review_approved,listing_status']){
 const before=event==='INSERT'?'0':publicExpr('OLD'),after=event==='DELETE'?'0':publicExpr('NEW')
 sql.push(`CREATE TRIGGER registry_count_${event.split(' ')[0].toLowerCase()} AFTER ${event} ON skills WHEN ${before}<>${after} BEGIN
 UPDATE registry_stats SET approved_skill_count=max(0,approved_skill_count+(${after})-(${before})),updated_at=${now} WHERE id=1;
END;`)
}
sql.push(`CREATE TRIGGER owner_publication_no_update BEFORE UPDATE ON owner_skill_publications BEGIN SELECT raise(ABORT,'Owner publication history is append-only'); END;`,
 `CREATE TRIGGER owner_publication_no_delete BEFORE DELETE ON owner_skill_publications BEGIN SELECT raise(ABORT,'Owner publication history is append-only'); END;`)
for(const table of ['skill_claims','skill_audits','x_content_queue','x_reply_drafts','skill_submissions','skill_candidates'])sql.push(`CREATE TRIGGER ${table}_touch AFTER UPDATE ON ${table}
 WHEN NEW.updated_at=OLD.updated_at AND NEW.updated_at<>${now}
 BEGIN UPDATE ${table} SET updated_at=${now} WHERE rowid=NEW.rowid; END;`)
writeFileSync(new URL('../cloudflare/migrations/data/0007_quality.sql',import.meta.url),sql.join('\n\n')+'\n')
