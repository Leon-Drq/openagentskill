import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import Link from "@/components/crawl-link";
import { MarketingPageShell } from "@/components/marketing-page";
import { jsonLd } from "@/lib/seo/resource-pages";
import {
  MOTION_ENTRIES,
  MOTION_FAMILIES,
  motionAsset,
  motionFamily,
  motionHref,
  type MotionEntry,
  type MotionLocale,
} from "@/lib/motion/catalog";
import { motionCopy } from "@/lib/motion/copy";
import { MotionCard, MotionGallery } from "./motion-gallery";
import { MotionPreview } from "./motion-preview";
import styles from "./motion.module.css";

export function MotionCollectionPage({ locale }: { locale: MotionLocale }) {
  const c = motionCopy(locale);
  const featured = ["spatial", "type", "product"].map((family) =>
    MOTION_ENTRIES.find((entry) => entry.family === family)!,
  );
  return (
    <MarketingPageShell language={locale} mainClassName={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: c.collection,
            description: c.lead,
            url: `https://www.openagentskill.com${motionHref(locale)}`,
            inLanguage: locale,
          }),
        }}
      />
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1>
            {c.title}
            <em>{c.titleAccent}</em>
          </h1>
        </div>
        <div className={styles.heroAside}>
          <p>{c.lead}</p>
          <a href="#collection" className={styles.textLink}>
            {c.browse}
            <ArrowDown size={18} aria-hidden="true" />
          </a>
        </div>
      </header>
      <div className={styles.featured}>
        {featured.map((entry, index) => (
          <div
            className={`${styles.feature} ${index === 0 ? styles.featureMain : ""}`}
            key={entry.id}
          >
            <MotionPreview entry={entry} locale={locale} compact />
            <Link
              href={motionHref(locale, entry.id)}
              className={styles.featureLabel}
            >
              <span>{motionFamily(entry.family, locale).name}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
      <div className={styles.edition}>
        <span>{c.edition}</span>
        <span>
          {MOTION_ENTRIES.length} {c.packageCount}
          <span aria-hidden="true"> / </span>
          {Object.keys(MOTION_FAMILIES).length} {c.familyCount}
        </span>
      </div>
      <MotionGallery locale={locale} />
      <section className={styles.scope}>
        <h2>{c.scopeTitle}</h2>
        <p>{c.scopeBody}</p>
        <Link
          href={locale === "zh" ? "/zh/membership" : "/membership"}
          className={styles.textLink}
        >
          {c.pricing}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </MarketingPageShell>
  );
}
export function MotionDetailPage({
  entry,
  locale,
}: {
  entry: MotionEntry;
  locale: MotionLocale;
}) {
  const c = motionCopy(locale),
    family = motionFamily(entry.family, locale);
  const related = MOTION_ENTRIES.filter(
    (item) => item.family === entry.family && item.id !== entry.id,
  ).slice(0, 3);
  return (
    <MarketingPageShell language={locale} mainClassName={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: entry.title,
            description: family.description,
            inLanguage: locale,
            url: `https://www.openagentskill.com${motionHref(locale, entry.id)}`,
          }),
        }}
      />
      <nav className={styles.breadcrumb} aria-label={c.collection}>
        <Link href={motionHref(locale)}>
          <ArrowLeft size={16} aria-hidden="true" />
          {c.back}
        </Link>
        <span>
          {String(entry.number).padStart(3, "0")} / {MOTION_ENTRIES.length}
        </span>
      </nav>
      <div className={styles.detailGrid}>
        <div className={styles.previewColumn}>
          <MotionPreview entry={entry} locale={locale} />
          <div className={styles.sampleCaption}>
            <span>{c.sample}</span>
            <span>
              {entry.width} × {entry.height} · {entry.duration}s
            </span>
          </div>
          <p className={styles.sampleNote}>{c.sampleNote}</p>
          <div className={styles.downloads}>
            <a
              href={motionAsset(entry, true)}
              download={`${entry.id}-sample.svg`}
            >
              <Download size={16} aria-hidden="true" />
              {c.download}
            </a>
            <a href={motionAsset(entry)} download={`${entry.id}-poster.svg`}>
              {c.poster}
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={styles.productInfo}>
          <div className={styles.infoKicker}>
            <span>{family.name}</span>
            <span className={styles.badge}>{c.preview}</span>
          </div>
          <h1>{entry.title}</h1>
          <p className={styles.detailLead}>{family.description}</p>
          <div className={styles.byline}>
            <span className={styles.authorMark} aria-hidden="true">
              ( )
            </span>
            OpenAgentSkill <span>v{entry.version}</span>
          </div>
          <div className={styles.access}>
            <p className={styles.eyebrow}>{c.access}</p>
            <h2>{c.accessTitle}</h2>
            <p>{c.accessBody}</p>
            <button type="button" disabled>
              {c.accessDisabled}
            </button>
            <Link href={locale === "zh" ? "/zh/membership" : "/membership"}>
              {c.pricing}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className={styles.detailSections}>
        <section className={styles.included}>
          <div>
            <Layers size={22} aria-hidden="true" />
            <h2>{c.includes}</h2>
            <ul>
              {c.deliverables.map((item) => (
                <li key={item}>
                  <Check size={17} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.inputPanel}>
            <SlidersHorizontal size={22} aria-hidden="true" />
            <h2>{c.input}</h2>
            {c.inputs.map((item, index) => (
              <div className={styles.parameter} key={item}>
                <span>{item}</span>
                <span aria-hidden="true">{["Aa", "◉", "↗", "↔"][index]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.workflow}>
          <h2>{c.how}</h2>
          <ol>
            {c.steps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
        <section className={styles.requirements}>
          <h2>{c.requirements}</h2>
          <div>
            <p>{c.requirementsBody}</p>
            <p className={styles.evidence}>{c.evidence}</p>
          </div>
        </section>
        <section className={styles.source}>
          <div>
            <p className={styles.eyebrow}>{c.source}</p>
            <h2>{entry.sourceTitle}</h2>
            <p>@{entry.sourceAuthor} · Prompt Motion</p>
          </div>
          <div>
            <p>{c.sourceLead}</p>
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.textLink}
            >
              {c.reference}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            {entry.sourceRepo && (
              <a
                href={entry.sourceRepo}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.textLink}
              >
                {c.repository}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
          </div>
        </section>
      </div>
      <section className={styles.related}>
        <div className={styles.relatedTitle}>
          <h2>{c.related}</h2>
          <Link href={motionHref(locale)} className={styles.textLink}>
            {c.back}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.grid}>
          {related.map((item) => (
            <MotionCard key={item.id} entry={item} locale={locale} />
          ))}
        </div>
      </section>
    </MarketingPageShell>
  );
}
