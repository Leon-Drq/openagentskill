import type { Metadata } from "next";
import {
  MOTION_ENTRIES,
  MOTION_LOCALES,
  MOTION_PUBLISHED_AT,
  motionHref,
  type MotionEntry,
  type MotionLocale,
} from "./catalog";
import { motionCopy } from "./copy";
const origin = "https://www.openagentskill.com";
export function motionMetadata(
  locale: MotionLocale,
  entry?: MotionEntry,
): Metadata {
  const c = motionCopy(locale);
  const title = `${entry ? entry.title : c.collection} · OpenAgentSkill`;
  const description = entry ? `${entry.title}. ${c.sampleNote}` : c.lead;
  const url = origin + motionHref(locale, entry?.id);
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: {
        en: origin + motionHref("en", entry?.id),
        zh: origin + motionHref("zh", entry?.id),
        "x-default": origin + motionHref("en", entry?.id),
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "OpenAgentSkill",
      images: [
        { url: `${origin}/opengraph-image?v=3`, width: 1200, height: 630 },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/opengraph-image?v=3`],
    },
  };
}
export function motionSitemapEntries() {
  return [undefined, ...MOTION_ENTRIES].flatMap((entry) =>
    MOTION_LOCALES.map((locale) => ({
      url: origin + motionHref(locale, entry?.id),
      lastModified: MOTION_PUBLISHED_AT,
      changeFrequency: "monthly" as const,
      priority: entry ? 0.5 : 0.7,
      alternates: {
        languages: motionMetadata(locale, entry).alternates!
          .languages as Record<string, string>,
      },
    })),
  );
}
