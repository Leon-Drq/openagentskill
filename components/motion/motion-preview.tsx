"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import {
  motionAsset,
  type MotionEntry,
  type MotionLocale,
} from "@/lib/motion/shared";
import { motionCopy } from "@/lib/motion/copy";
import styles from "./motion.module.css";

export function MotionPreview({
  entry,
  locale,
  compact = false,
}: {
  entry: MotionEntry;
  locale: MotionLocale;
  compact?: boolean;
}) {
  const c = motionCopy(locale);
  const [playing, setPlaying] = useState(false);
  const [iteration, setIteration] = useState(0);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return (
    <div
      className={`${styles.preview} ${compact ? styles.compact : ""}`}
      style={{ background: entry.bg }}
      onMouseEnter={() => {
        if (compact && !reduced) {
          setPlaying(true);
          setIteration((n) => n + 1);
        }
      }}
      onMouseLeave={() => {
        if (compact) setPlaying(false);
      }}
    >
      {/* Generated local SVG samples have no scripts, foreign objects or external resources. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${entry.id}-${playing}-${iteration}`}
        src={motionAsset(entry, playing)}
        alt={`${entry.title} — ${c.sample}`}
        width={1280}
        height={800}
        loading={compact ? "lazy" : "eager"}
      />
      <div className={styles.previewControls}>
        <button
          type="button"
          onClick={() => {
            setPlaying((value) => !value);
            setIteration((n) => n + 1);
          }}
          aria-label={playing ? c.pause : c.play}
          aria-pressed={playing}
          disabled={reduced}
          title={reduced ? c.reducedMotion : undefined}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          <span>{playing ? c.pause : c.play}</span>
        </button>
        {playing && !compact && (
          <button
            type="button"
            onClick={() => setIteration((n) => n + 1)}
            aria-label={c.replay}
          >
            <RotateCcw size={16} />
          </button>
        )}
        {!compact && (
          <span className={styles.runtime}>{entry.duration}s · SVG</span>
        )}
      </div>
      {reduced && !compact && <p className={styles.reducedNote}>{c.reducedMotion}</p>}
    </div>
  );
}
