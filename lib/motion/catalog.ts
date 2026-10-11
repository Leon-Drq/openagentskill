import catalog from "./catalog.json";
import { motionFamily } from './shared';
export { MOTION_FAMILIES, motionAsset, motionFamily } from './shared';
export type { MotionEntry, MotionFamily, MotionLocale } from './shared';

export const MOTION_ENTRIES = catalog.entries;
export const MOTION_VERSION = catalog.version;
export const MOTION_SOURCE_COUNT = catalog.sourceCount;
export const MOTION_LOCALES = ["en", "zh"] as const;
export const MOTION_PUBLISHED_AT = "2026-10-12";
export const getMotionEntry = (id: string) =>
  MOTION_ENTRIES.find((entry) => entry.id === id);
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
