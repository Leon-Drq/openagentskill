"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import Link from "@/components/crawl-link";
import {
  filterMotionEntries,
  MOTION_FAMILIES,
  motionFamily,
  motionHref,
  type MotionEntry,
  type MotionLocale,
} from "@/lib/motion/catalog";
import { motionCopy } from "@/lib/motion/copy";
import { MotionPreview } from "./motion-preview";
import styles from "./motion.module.css";

export function MotionCard({
  entry,
  locale,
}: {
  entry: MotionEntry;
  locale: MotionLocale;
}) {
  const c = motionCopy(locale);
  return (
    <article className={styles.card}>
      <MotionPreview entry={entry} locale={locale} compact />
      <div className={styles.cardMeta}>
        <span>{motionFamily(entry.family, locale).name}</span>
        <span>{String(entry.number).padStart(3, "0")}</span>
      </div>
      <Link
        href={motionHref(locale, entry.id)}
        className={styles.cardTitle}
        prefetch={false}
      >
        <h3>{entry.title}</h3>
        <ArrowUpRight size={19} aria-hidden="true" />
      </Link>
      <p className={styles.cardNote}>
        {c.preview} <span aria-hidden="true">·</span> {c.sample}
      </p>
    </article>
  );
}
export function MotionGallery({ locale }: { locale: MotionLocale }) {
  const c = motionCopy(locale);
  const [query, setQuery] = useState(""),
    [family, setFamily] = useState("all"),
    [page, setPage] = useState(1);
  const entries = useMemo(
    () => filterMotionEntries(query, family),
    [query, family],
  );
  const pages = Math.max(1, Math.ceil(entries.length / 24));
  function reset() {
    setQuery("");
    setFamily("all");
    setPage(1);
  }
  function navigate(value: number) {
    setPage(value);
    document
      .getElementById("motion-results")
      ?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  return (
    <section className={styles.gallery} id="collection">
      <header className={styles.galleryHeading}>
        <div>
          <h2>{c.catalog}</h2>
          <p>{c.catalogLead}</p>
        </div>
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{c.search}</span>
          <input
            type="search"
            placeholder={c.search}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </header>
      <div className={styles.filters} role="group" aria-label={c.collection}>
        <button
          type="button"
          aria-pressed={family === "all"}
          onClick={() => {
            setFamily("all");
            setPage(1);
          }}
        >
          {c.all}
        </button>
        {Object.keys(MOTION_FAMILIES).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={family === id}
            onClick={() => {
              setFamily(id);
              setPage(1);
            }}
          >
            {motionFamily(id, locale).name}
          </button>
        ))}
      </div>
      <div className={styles.resultBar} id="motion-results">
        <p aria-live="polite">
          {entries.length} {c.results}
        </p>
        {(query || family !== "all") && (
          <button type="button" onClick={reset}>
            {c.clear}
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {entries.length ? (
        <div className={styles.grid}>
          {entries.slice((page - 1) * 24, page * 24).map((entry) => (
            <MotionCard key={entry.id} entry={entry} locale={locale} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>{c.empty}</h3>
          <p>{c.emptyBody}</p>
          <button type="button" className={styles.button} onClick={reset}>
            {c.clear}
          </button>
        </div>
      )}
      {pages > 1 && (
        <nav className={styles.pagination} aria-label={c.collection}>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => navigate(page - 1)}
          >
            {c.previous}
          </button>
          <span>
            {c.page} {page} {c.of} {pages}
          </span>
          <button
            type="button"
            disabled={page === pages}
            onClick={() => navigate(page + 1)}
          >
            {c.next}
          </button>
        </nav>
      )}
    </section>
  );
}
