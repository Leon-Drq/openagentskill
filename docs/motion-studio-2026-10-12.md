# Motion Skills: original references and paid classification

Owner correction on 2026-10-12: retain each original animation without replacing it with a generic sample, and list these Skills under Paid.

- `/skills?access=paid` and `/skills?category=motion-design&access=paid` include the motion collection, with existing directory search, mobile filters and pagination. Free and third-party filters exclude it.
- Every one of the 233 entries uses the exact original video URL and poster URL from its source page. Original title, author, dimensions and source links are retained. Video frames are contained without cropping; no recolouring, regeneration or speed changes.
- Visible cards play muted with native video media; offscreen cards pause. Reduced-motion preferences prevent automatic playback but allow explicit manual playback. Detail dialogs include native playback, seeking, sound and fullscreen controls.
- No upstream media is mirrored, and no prompt text is republished. `scripts/sync-motion-source.mjs` verifies each source VideoObject against its actual video tag and imports public metadata only.
- Paid is the owner's catalog classification. Checkout and full package delivery remain unavailable. No in-stock offers, review scores or completed reproduction claims are invented.

## Withdrawn packages

The former 1.0.0 generic-family starter packages do not satisfy the owner's fidelity requirement. All 466 substitute SVG assets and their download controls have been removed from the public site. The private `artifacts/motion-studio-v1` directory contains a WITHDRAWN notice and must not be sold or delivered as a faithful reproduction.

Source review found 230 prompt entries and 3 Skill-only entries (one prompt entry also links a Skill repository). The source films are reference previews, not evidence that a local generated project matches them. Full reproduction remains unverified and depends on obtaining the original project or rebuilding and comparing each reference. Source ownership remains with each original creator.

## Verification

Regression coverage checks paid/free/provider classification, combined pagination with existing paid registry records, unique original media, source identity, and unavailable checkout. Browser checks cover both Paid entry points, exact remote source playback, uncropped media, search, pagination, reduced motion, error fallback and desktop/mobile layouts. Full regressions, typecheck and production build are required before deployment.
