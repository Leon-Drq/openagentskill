# Original Skill and membership visual refresh

The owner requested a stronger design using Skillry as a reference and corrected the standalone price to **USD 4.99**. Monthly membership remains USD 9.99; annual membership remains USD 79, shown as the total annual charge.

## Design decisions

- Keep the shared header, footer, warm paper background, Georgia display type, green brand colour and existing directory layout from `docs/design-system.md`.
- Put the actual output gallery and product information side by side. Remove the separate, oversized title section so preview, title and price appear together.
- Compose the three real SVG samples as overlapping prints. Use restrained orbital SVG lines, finite entrance motion, and a four-option gallery with downloadable individual samples. All animation is limited to opacity and transforms, and respects reduced-motion preferences.
- Distinguish membership plans through spacing, typography and one quiet green Pro panel. Avoid invented sales figures, customer ratings or popularity claims.
- On phones, show the preview before product information and access options; stack membership plans with Pro first. Localize new interface copy in all eight supported languages.
- Keep checkout disabled and clearly marked as a preview. This release does not enable payment, entitlements or installation, and does not publish a reviewed community Skill.

## References used

- [Skillry](https://skillry.dev/) and its product detail composition: preview first, clear product information and compact purchase choices. No source assets or interface code were copied.
- [Taste Skill: Anti-Slop Frontend in our registry](https://www.openagentskill.com/skills/design-taste-frontend), with the [source instructions](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) read as design guidance. Applied its audit-first approach, deliberate hierarchy, restrained motion and responsive review. Repository instructions and the owner's explicit SVG request take precedence over generic defaults.
- Local `frontend-design` guidance, together with the site's own design system.

## Original package

The local renderer is updated to v1.1.0 with an original radial illustration and three coordinated colour treatments. The website serves the actual renderer outputs at versioned asset URLs to avoid stale sample caches. The full package remains in the owner's ignored `artifacts/launch-card-studio/1.1.0` directory. Generated samples contain no external assets, scripts or links.

## Validation

- Actual renderer execution, all three dimensions, CJK copy, XML escaping, invalid input rejection, text bounds and overwrite protection.
- Browser review of desktop and mobile composition; 64 combinations of two pages, eight languages and widths 320/390/768/1440 showed one H1, loaded samples and no horizontal page overflow.
- Gallery selection and sample download links; standalone, monthly and annual price states.
- HTTP checks for 16 localized routes, canonical links, language alternates, language redirects, sitemap entries and versioned SVG downloads.
- Full regression suite, typecheck, lint and production build passed. Lint reports 25 existing unrelated warnings and zero errors. The build completed despite existing remote catalog revalidation timeouts.
