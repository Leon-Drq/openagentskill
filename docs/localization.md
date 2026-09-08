# Localization contract

Supported UI locales: `en`, `zh`, `ja`, `ko`, `es`, `de`, `fr`, `id`.

## Architecture

- `config.ts` defines locale identifiers. `market-routing.ts` owns language
  prefixes and query preferences. Never concatenate a Chinese-only `lang` link.
- Existing core page dictionaries remain the source for navigation, discovery,
  skill detail and category vocabulary.
- `gallery-copy.ts`, `site-copy.ts`, and `submission-copy.ts` explicitly cover
  the remaining locales for newer Gallery, homepage/footer and submission UI.
  Their fixed-length typed rows and regression tests reject missing translations
  and mismatched interpolation placeholders. Do not fall back from a new UI
  message to English by spreading an English dictionary into an incomplete one.
- `getLocalizedNavigationHref` preserves filters, pagination, hashes and return
  destinations. Language selection must navigate via Next, including query-only
  switches. URLs, API identifiers, repository names and code stay unchanged.
- Gallery search includes translated titles, category labels and use-case tags,
  with Unicode normalization; translation must not make a visible title unfindable.

## Content is not the same as interface copy

The September 2026 migration covers Gallery controls, video errors, evidence and
access labels, voting/sharing, submission/status UI, homepage editorial sections,
footer navigation and the three featured homepage case summaries. It does not
claim that every repository description, long-form article or all 100 case briefs
have been translated into eight languages. Untranslated source/editorial content
remains verbatim; Gallery and detail pages disclose this. Original artwork,
commands, exact prompts, author names, licenses and source references must not be
silently rewritten. Future authored case translations can extend the editorial
dictionary without modifying provenance or safety claims.

## SEO and rendering

Existing prefixed core routes keep their canonical and hreflang contracts.
Gallery's `?lang=` and filter variants remain `noindex, follow` with the existing
canonical; do not advertise them as indexable hreflang alternatives. Metadata,
visible UI and structured-data language use the same resolved locale. No route
renames, blanket redirects, cookie-driven cache variations, runtime translation
requests or mandatory dynamic root layout were introduced.

## Release checklist

1. Run `pnpm test:localization`, the complete regression suite and typecheck/build.
2. Check all eight locales on home, Gallery, a detail and the submit form.
3. Exercise filtering, a localized-title search, language switching with query
   and hash preserved, copy/share, empty/error states and video click-to-load.
4. Check 390px and desktop widths, especially French/German labels.
5. Confirm existing canonical URLs, noindex filter policy, 404s and source records.
6. Recheck production after the normal protected-main deployment.

Legacy editorial/technical routes and third-party descriptions require their own
content translation review; passing these UI checks is not evidence of universal
content translation or of Skill execution/safety verification.
