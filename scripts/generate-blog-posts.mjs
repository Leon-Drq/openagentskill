/**
 * Batch blog post generator
 * Run after deployment: node scripts/generate-blog-posts.mjs
 * Or call POST https://www.openagentskill.com/api/blog/generate-batch
 */

const SKILL_IDS = [
  '2efe3f22-1aa0-40d6-b06b-978c2cd70bb9', // anthropics-skills (80K stars)
  '18835924-6eca-4419-bc1d-da4fe3649ee3', // browser-use (52K stars)
  '26a9a308-ca9c-4a8d-ab2f-1d17501587b5', // media-crawler (43K stars)
  '72691b91-96a5-45f4-9434-c214ef9c843d', // crawl4ai (42K stars)
  '73558d4f-7071-4271-9038-32a0ad6e9736', // composiohq-awesome-claude-skills (39K stars)
  'da73734f-752b-4096-a5f6-fb4e71918542', // firecrawl (28K stars)
  'a9265663-dbd9-4692-8edc-742ea5b59bd1', // sickn33-antigravity-awesome-skills (25K stars)
  '6e5ad738-868a-40fe-85fb-9d21d2c957b4', // hesreallyhim-awesome-claude-code (25K stars)
  'd576b5d7-52f8-4133-9582-a47b548194c2', // voltagent-awesome-openclaw-skills (24K stars)
  '6da35bcc-3f24-40d4-a263-b48fbfbd9aaa', // github-awesome-copilot (24K stars)
]

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.openagentskill.com'
const SECRET = process.env.INDEXER_SECRET || ''

async function generateForSkill(skillId, index) {
  console.log(`[${index + 1}/10] Generating blog for skill ${skillId}...`)
  try {
    const res = await fetch(`${BASE_URL}/api/blog/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(SECRET ? { Authorization: `Bearer ${SECRET}` } : {}),
      },
      body: JSON.stringify({ skill_id: skillId }),
    })
    const data = await res.json()
    if (data.success) {
      console.log(`  ✓ Created: /blog/${data.slug}`)
    } else {
      console.log(`  - Skipped: ${data.reason}`)
    }
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`)
  }
  // Delay between requests to avoid AI rate limits
  await new Promise(r => setTimeout(r, 2000))
}

for (let i = 0; i < SKILL_IDS.length; i++) {
  await generateForSkill(SKILL_IDS[i], i)
}

console.log('\nDone! Visit https://www.openagentskill.com/blog to see all posts.')
