import {writeFileSync,readFileSync} from 'node:fs'
const fields=Object.keys(JSON.parse(readFileSync(new URL('../lib/db/cloudflare-schema.json',import.meta.url))).agent_outcome_stats)
const now="(strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
let sql=`-- Private aggregation preserves the PostgreSQL outcome scoring model.
CREATE VIEW d1_outcome_summary AS
WITH base AS (
 SELECT *,CASE WHEN length(cast(json_extract(metadata,'$.output_quality') AS TEXT))>0
 AND cast(json_extract(metadata,'$.output_quality') AS TEXT) NOT GLOB '*[^0-9.]*'
 AND substr(cast(json_extract(metadata,'$.output_quality') AS TEXT),1,1) GLOB '[0-9]'
 AND substr(cast(json_extract(metadata,'$.output_quality') AS TEXT),-1,1) GLOB '[0-9]'
 AND length(cast(json_extract(metadata,'$.output_quality') AS TEXT))-length(replace(cast(json_extract(metadata,'$.output_quality') AS TEXT),'.',''))<=1
 THEN cast(json_extract(metadata,'$.output_quality') AS REAL) END AS output_quality,
 (json_type(metadata,'$.used_in_production')='true' OR lower(cast(json_extract(metadata,'$.used_in_production') AS TEXT))='true') AS production,
 (json_type(metadata,'$.human_review_required')='true' OR lower(cast(json_extract(metadata,'$.human_review_required') AS TEXT))='true') AS human_review,
 julianday(created_at)>=julianday('now','-30 days') AS recent
 FROM agent_outcomes
), aggregates AS (
 SELECT skill_slug,count(*) AS total_outcomes,sum(outcome='success') AS successful_outcomes,sum(outcome='failed') AS failed_outcomes,
 sum(outcome='not_relevant') AS not_relevant_outcomes,sum(outcome='blocked_by_risk' OR risk_blocked=1) AS risk_blocked_outcomes,
 sum(outcome='setup_required' OR setup_required=1) AS setup_required_outcomes,sum(install_used) AS install_attempts,
 round(sum(outcome='success')*100.0/count(*),1) AS success_rate,
 round(sum(install_used=1 AND outcome='success')*100.0/nullif(sum(install_used),0),1) AS install_success_rate,
 round(avg(output_quality),2) AS avg_output_quality,round(avg(time_to_useful_ms),0) AS avg_time_to_useful_ms,
 sum(coalesce(production,0)) AS production_outcomes,sum(coalesce(human_review,0)) AS human_review_required_outcomes,
 sum(coalesce(output_quality<=2,0)) AS low_quality_outcomes,sum(recent) AS recent_outcomes_30d,
 sum(recent AND outcome='success') AS recent_successful_outcomes_30d,sum(recent AND outcome<>'success') AS recent_failed_outcomes_30d,
 round(sum(recent AND outcome='success')*100.0/nullif(sum(recent),0),1) AS recent_success_rate,
 round(sum(recent AND outcome<>'success')*100.0/nullif(sum(recent),0),1) AS recent_failure_rate,
 count(DISTINCT agent) AS unique_agents,max(CASE WHEN outcome='success' THEN created_at END) AS last_success_at,
 max(CASE WHEN outcome<>'success' THEN created_at END) AS last_failure_at,max(created_at) AS last_outcome_at,
 sum(install_used=1 AND outcome='success') AS verified_installs,${now} AS updated_at
 FROM base GROUP BY skill_slug
)
SELECT *,round(max(0,min(100,22+min(18,ln(total_outcomes+1)*7.9)+min(12,ln(install_attempts+1)*5.5)
 +((successful_outcomes+3.4)/(total_outcomes+5)*100-55)*0.52+coalesce((avg_output_quality-3)*5,0)
 +min(7,production_outcomes*1.5)+min(6,unique_agents*1.5)-min(22,risk_blocked_outcomes*4)-min(16,setup_required_outcomes*2.4)
 -min(16,not_relevant_outcomes*3)-min(12,failed_outcomes*1.8)-min(10,low_quality_outcomes*2.5)
 -min(8,human_review_required_outcomes*1.5)-CASE WHEN coalesce(recent_failure_rate,0)>=45 THEN 8 ELSE 0 END)),1) AS agent_proven_score
FROM aggregates;
CREATE INDEX feedback_resolve_event ON skill_feedback(json_extract(metadata,'$.resolve_event_id')) WHERE json_extract(metadata,'$.source')='agent_outcome';
`
const refresh=ref=>`INSERT INTO agent_outcome_stats(${fields.join(',')}) SELECT ${fields.join(',')} FROM d1_outcome_summary WHERE skill_slug=${ref}.skill_slug
 AND EXISTS(SELECT 1 FROM skills WHERE slug=${ref}.skill_slug)
 ON CONFLICT(skill_slug) DO UPDATE SET ${fields.filter(n=>n!=='skill_slug').map(n=>`${n}=excluded.${n}`).join(',')};
 DELETE FROM agent_outcome_stats WHERE skill_slug=${ref}.skill_slug AND NOT EXISTS(SELECT 1 FROM agent_outcomes WHERE skill_slug=${ref}.skill_slug);`
for(const operation of ['INSERT','UPDATE','DELETE'])sql+=`\nCREATE TRIGGER outcome_stats_${operation.toLowerCase()} AFTER ${operation} ON agent_outcomes BEGIN
 ${operation!=='DELETE'?refresh('NEW'):''}
 ${operation!=='INSERT'?refresh('OLD'):''}
END;\n`
writeFileSync(new URL('../cloudflare/migrations/data/0008_outcomes.sql',import.meta.url),sql)
