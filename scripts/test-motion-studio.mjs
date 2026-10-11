import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MOTION_ENTRIES,
  MOTION_FAMILIES,
  filterMotionEntries,
  getMotionEntry,
  motionAsset,
  motionHref,
} from "../lib/motion/catalog.ts";
import { motionCopy } from "../lib/motion/copy.ts";
import { motionMetadata, motionSitemapEntries } from "../lib/motion/seo.ts";
import { getLanguageSwitchHref } from "../lib/i18n/market-routing.ts";

assert.equal(MOTION_ENTRIES.length, 233);
assert.equal(new Set(MOTION_ENTRIES.map((e) => e.id)).size, 233);
assert.equal(new Set(MOTION_ENTRIES.map((e) => e.sourceUrl)).size, 233);
assert.equal(Object.keys(MOTION_FAMILIES).length, 12);
assert.equal(getMotionEntry("../../private"), undefined);
assert.equal(filterMotionEntries("粒子").length, 4);
assert.equal(filterMotionEntries("no-results-xyz").length, 0);
assert.equal(filterMotionEntries("", "charts").length, 11);
assert.deepEqual(
  filterMotionEntries("  PHOTO  PRINT ").map((e) => e.title),
  ["Photo print app launch film"],
);
const sitemap = motionSitemapEntries();
assert.equal(sitemap.length, 468);
assert.equal(new Set(sitemap.map((e) => e.url)).size, 468);
for (const locale of ["en", "zh"]) {
  assert.deepEqual(
    Object.keys(motionCopy(locale)).sort(),
    Object.keys(motionCopy("en")).sort(),
  );
  for (const value of Object.values(motionCopy(locale)).flat())
    assert.ok(typeof value === "string" && value.trim());
  for (const entry of [undefined, ...MOTION_ENTRIES]) {
    const path = motionHref(locale, entry?.id);
    const metadata = motionMetadata(locale, entry);
    assert.equal(
      metadata.alternates.canonical,
      `https://www.openagentskill.com${path}`,
    );
    assert.equal(
      getLanguageSwitchHref(
        motionHref("zh", entry?.id),
        locale,
        "?from=nav&lang=zh",
        "#collection",
      ),
      `${path}?from=nav#collection`,
    );
    assert.deepEqual(Object.keys(metadata.alternates.languages).sort(), [
      "en",
      "x-default",
      "zh",
    ]);
    assert.ok(sitemap.some((e) => e.url === metadata.alternates.canonical));
    assert.doesNotMatch(
      JSON.stringify(metadata),
      /InStock|AggregateRating|"Offer"/,
    );
  }
}
assert.equal(
  getLanguageSwitchHref("/studio/motion", "ja"),
  "/studio/motion?lang=ja",
);
for (const entry of MOTION_ENTRIES) {
  assert.ok(MOTION_FAMILIES[entry.family]);
  assert.match(entry.skillSha256, /^[a-f0-9]{64}$/);
  assert.equal(entry.status, "preview");
  assert.equal(entry.sampleKind, "original-family-study");
  assert.match(entry.sourceUrl, /^https:\/\/prompt-motion\.com\/[a-z0-9-]+$/);
  for (const animated of [false, true]) {
    const svg = await readFile(
      new URL(`../public${motionAsset(entry, animated)}`, import.meta.url),
      "utf8",
    );
    assert.match(svg, /viewBox="0 0 1280 800"/);
    assert.doesNotMatch(
      svg,
      /<script|<foreignObject|onload=|javascript:|href=/i,
    );
    assert.doesNotMatch(svg, /animation:[^;}]*infinite|url\(/);
    if (animated) assert.match(svg, /prefers-reduced-motion:reduce/);
  }
}
console.log(
  "Motion Studio: 233 catalog records, 466 inert samples, 468 localized routes, filtering and preview-only commerce passed.",
);
