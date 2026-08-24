import { createPublicClient } from '../lib/supabase/public'
import { enqueueXSkillPostQueueForSlugs, postNextQueuedSkillToX } from '../lib/x/growth'

async function main() {
  const serverSecret = (process.env.INDEXER_SECRET || '').trim()
  const postText = (process.env.X_TREND_POST_TEXT || '').trim()
  const roundupSlug = (process.env.X_TREND_SLUG || '').trim()
  const sourceUrl = (process.env.X_TREND_SOURCE_URL || '').trim()
  const followupSlugs = (process.env.X_FOLLOWUP_SKILL_SLUGS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!serverSecret) throw new Error('Missing INDEXER_SECRET.')
  if (!postText || postText.length > 280) throw new Error('X_TREND_POST_TEXT must contain 1-280 characters.')
  if (!roundupSlug) throw new Error('Missing X_TREND_SLUG.')

  const supabase = createPublicClient()
  const { data: queuedRoundup, error: queueError } = await supabase.rpc('enqueue_x_content_queue_item', {
    p_server_secret: serverSecret,
    p_item: {
      skill_id: null,
      skill_slug: roundupSlug,
      content_type: 'launch_update',
      campaign: 'x_trend_roundup',
      status: 'queued',
      priority: 1000,
      scheduled_for: new Date().toISOString(),
      post_text: postText,
      reply_text: null,
      source: 'x_trend_editorial',
      metadata: {
        generated_by: 'x_growth_os',
        source_url: sourceUrl || null,
        content_format: 'trend_roundup',
        followup_skill_slugs: followupSlugs,
      },
    },
  })
  if (queueError) throw new Error(`Failed to queue trend roundup: ${queueError.message}`)

  const published = await postNextQueuedSkillToX({ autoBuildQueue: false })
  const followups = followupSlugs.length
    ? await enqueueXSkillPostQueueForSlugs({
        slugs: followupSlugs,
        minStars: 500,
        campaign: 'anti_slop_followup',
        limit: followupSlugs.length,
      })
    : null

  console.log(JSON.stringify({ queuedRoundup, published, followups }))
}

void main()
