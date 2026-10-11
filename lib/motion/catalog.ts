import catalog from "./catalog.json";
import families from "./families.json";

export type MotionEntry = (typeof catalog.entries)[number];
export type MotionFamily = keyof typeof families;
export type MotionLocale = "en" | "zh";
export const MOTION_ENTRIES = catalog.entries;
export const MOTION_FAMILIES = families;
export const MOTION_VERSION = catalog.version;
export const MOTION_SOURCE_COUNT = catalog.sourceCount;
export const MOTION_LOCALES = ["en", "zh"] as const;
export const MOTION_PUBLISHED_AT = "2026-10-12";
export const motionHref = (locale: MotionLocale, id?: string) =>
  `${locale === "zh" ? "/zh" : ""}/studio/motion${id ? `/${id}` : ""}`;
export const motionAsset = (entry: MotionEntry, animated = false) =>
  `/studio/motion/v1/${entry.id}${animated ? "" : ".poster"}.svg`;
export const getMotionEntry = (id: string) =>
  MOTION_ENTRIES.find((entry) => entry.id === id);
export function motionFamily(id: string, locale: MotionLocale) {
  const family = families[id as MotionFamily];
  return {
    name: locale === "zh" ? family.zhName : family.name,
    description: locale === "zh" ? family.zhDescription : family.description,
  };
}
export function filterMotionEntries(query = "", family = "all") {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return MOTION_ENTRIES.filter(
    (entry) =>
      (family === "all" || entry.family === family) &&
      terms.every((term) =>
        [
          entry.title,
          entry.sourceAuthor,
          ...entry.tags,
          motionFamily(entry.family, "en").name,
          motionFamily(entry.family, "zh").name,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term),
      ),
  );
}
