# Video workflow collection — October 6, 2026

The existing `/use-cases/video-creation` page now compares five creator workflows
by input, output, setup and limitations. It links ten attributed articles from
the [original roundup](https://x.com/jedeeai/status/2107358191432405329).
Tutorials and reference libraries are not represented as independently installable Skills.

## Source manifest and owner publication

[`lib/video-workflow-sources.json`](../lib/video-workflow-sources.json) contains
19 inspected SKILL.md paths, pinned Git commits and SHA-256 hashes:
15 LearnPrompt/awesome-seedance entries and one each from xilo-opus-video,
simon-skills/whiteboard-video, wedding-video-guided-wizard and jianying-editor-skill.
The sources were read, not executed. Summaries are original; no example videos are mirrored.

Publication must use the [owner channel](owner-publishing.md).
The helper below invokes that existing CLI separately for each explicit path;
it does not change review records or publish via SQL.

```sh
# Inspect the complete plan without publishing or needing credentials.
node scripts/publish-video-workflows.mjs

# Check the privately configured credential.
pnpm owner:publish --check

# Execute the 19 pinned publication requests.
node scripts/publish-video-workflows.mjs --publish
```

Configure the existing `OWNER_PUBLISH_TOKEN` in ignored `.env.owner.local`.
The helper saves request IDs before issuing requests and stops on the first failure.
Its ignored `artifacts/video-workflows-publication.json` checkpoint retains results;
rerunning reuses the same request ID for an unknown outcome and skips successes.
Do not delete the checkpoint before resolving timeouts.

Successful owner publication means `owner_published`, not AI review approval or
runtime verification. Record the actual canonical URLs returned by the API.
The collection shows an internal detail link only when a public registry record
matches the repository, path, commit and content hash. Missing or changed records
keep their pinned source link. The page revalidates every five minutes.

Existing Hypit, HyperFrames and Remotion entries are linked as related tools,
not republished. No automatic review, installation, social queue or SEO eligibility
rules are modified by this collection.

## X campaign

[`docs/campaigns/video-workflows-20261006.json`](campaigns/video-workflows-20261006.json)
contains seven ordered English posts. Each includes the collection URL with UTM
attribution; individual posts link to the corresponding workflow anchor.
The standard X character limits are checked with the existing weighted counter.

Publish only after the page is live, using the authorized `@openagentskill` account,
as successive replies. Confirm each post exists and save its ID/URL before
continuing. Do not blindly retry a post with an unknown result. A prepared draft
or queued item is not a published post. Update campaign status and record URLs
only after confirmation. Owner publication does not authorize or enqueue X posts.

Campaign attribution identifies visits; it is not evidence of improved reach or
successful installation. Source review is not an end-to-end runtime test.
