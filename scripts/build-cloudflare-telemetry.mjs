import {writeFileSync} from 'node:fs'
// Same event definitions as the source PostgreSQL aggregate triggers. Inserts
// update counters in constant work; corrections only scan the affected skill.
const metrics={views:['view'],install_copies:['install_copy'],saves:['save'],compares:['compare'],outbound_clicks:['outbound_github','outbound_docs'],
 claim_starts:['claim_start'],claim_submits:['claim_submit'],resolve_requests:['resolve_request'],install_starts:['install_start'],install_successes:['install_success'],
 install_failures:['install_failure'],agent_calls:['agent_call'],outcome_successes:['outcome_success'],outcome_failures:['outcome_failure'],share_copies:['share_copy']}
const columns=['total_events',...Object.keys(metrics)],now="(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
const condition=(prefix,types)=>`${prefix}event_type IN (${types.map(v=>`'${v}'`).join(',')})`
const sql=['-- Atomic event aggregates and download ledger. Apply after the historical import.',
 'CREATE INDEX skill_events_by_skill_time ON skill_events(skill_slug,created_at);',
 'CREATE INDEX skill_feedback_by_skill_time ON skill_feedback(skill_slug,created_at);',
 'CREATE INDEX agent_outcomes_by_skill_time ON agent_outcomes(skill_slug,created_at);']
for(const daily of [false,true]){
 const table=daily?'skill_events_daily':'skill_event_stats',keys=daily?'skill_slug,event_date':'skill_slug'
 const dates=daily?'first_event_at,last_event_at':'last_event_at'
 const all=`${keys},${columns.join(',')},${dates},updated_at`
 const inserts=`NEW.skill_slug,${daily?'substr(NEW.created_at,1,10),':''}1,${Object.values(metrics).map(types=>condition('NEW.',types)).join(',')},${daily?'NEW.created_at,':''}NEW.created_at,${now}`
 const update=columns.map(c=>`${c}=${table}.${c}+excluded.${c}`).concat(daily?[`first_event_at=min(coalesce(${table}.first_event_at,excluded.first_event_at),excluded.first_event_at)`]:[],
 [`last_event_at=max(coalesce(${table}.last_event_at,excluded.last_event_at),excluded.last_event_at)`,`updated_at=${now}`]).join(',')
 sql.push(`CREATE TRIGGER ${table}_insert AFTER INSERT ON skill_events BEGIN
 INSERT INTO ${table}(${all}) VALUES (${inserts}) ON CONFLICT(${keys}) DO UPDATE SET ${update};
END;`)
 const rebuild=ref=>{
  const where=`skill_slug=${ref}.skill_slug${daily?` AND created_at>=substr(${ref}.created_at,1,10)||'T00:00:00.000000Z' AND created_at<date(${ref}.created_at,'+1 day')||'T00:00:00.000000Z'`:''}`
  return `DELETE FROM ${table} WHERE skill_slug=${ref}.skill_slug${daily?` AND event_date=substr(${ref}.created_at,1,10)`:''};
 INSERT INTO ${table}(${all}) SELECT skill_slug,${daily?`substr(${ref}.created_at,1,10),`:''}count(*),${Object.values(metrics).map(types=>`sum(${condition('',types)})`).join(',')},${daily?'min(created_at),':''}max(created_at),${now}
 FROM skill_events WHERE ${where} AND EXISTS(SELECT 1 FROM skills WHERE slug=${ref}.skill_slug) GROUP BY skill_slug;`
 }
 sql.push(`CREATE TRIGGER ${table}_delete AFTER DELETE ON skill_events BEGIN
 ${rebuild('OLD')}
END;`)
 sql.push(`CREATE TRIGGER ${table}_update AFTER UPDATE ON skill_events BEGIN
 ${rebuild('OLD')}
 ${rebuild('NEW')}
END;`)
}
sql.push(`CREATE TRIGGER download_receipt_count AFTER INSERT ON skill_download_receipts BEGIN
 INSERT INTO skill_download_totals(skill_slug,downloads) VALUES(NEW.skill_slug,1)
 ON CONFLICT(skill_slug) DO UPDATE SET downloads=skill_download_totals.downloads+1,updated_at=${now};
 UPDATE skills SET site_downloads=(SELECT downloads FROM skill_download_totals WHERE skill_slug=NEW.skill_slug) WHERE slug=NEW.skill_slug;
END;`)
sql.push(`-- Counters must not rebuild the full-text index on every download.
DROP TRIGGER skills_fts_update;
CREATE TRIGGER skills_fts_update AFTER UPDATE OF slug,name,github_repo,description,tagline,category,long_description,repository ON skills BEGIN
 INSERT INTO skills_fts(skills_fts,rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
 VALUES ('delete',OLD.rowid,OLD.slug,OLD.name,OLD.github_repo,OLD.description,OLD.tagline,OLD.category,OLD.long_description,OLD.repository);
 INSERT INTO skills_fts(rowid,slug,name,github_repo,description,tagline,category,long_description,repository)
 VALUES (NEW.rowid,NEW.slug,NEW.name,NEW.github_repo,NEW.description,NEW.tagline,NEW.category,NEW.long_description,NEW.repository);
END;`)
writeFileSync(new URL('../cloudflare/migrations/data/0006_telemetry.sql',import.meta.url),sql.join('\n\n')+'\n')
