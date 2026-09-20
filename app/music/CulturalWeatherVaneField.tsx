"use client";

import type { NewsPoint, SongPoint } from "@/data/cultural-weather-vane";
import styles from "./CulturalWeatherVane.module.css";

type Kind = "music" | "news";
type AnyPoint = SongPoint | NewsPoint;
export type FieldMode = "field" | "drift";

function paramsFor(point: AnyPoint, kind: Kind) {
  const params = new URLSearchParams({ kind, title: point.title });
  if (kind === "music") params.set("artist", (point as SongPoint).artist);
  if (point.mediaQuery) params.set("query", point.mediaQuery);
  if (point.wikipediaTitle) params.set("page-title", point.wikipediaTitle);
  return params;
}

export function mediaUrl(point: AnyPoint, kind: Kind) {
  return `/api/cultural-weather/media?${paramsFor(point, kind)}`;
}

export default function WeatherField({
  songs,
  news,
  mode,
  selectedId,
  onSelect,
}: {
  songs: SongPoint[];
  news: NewsPoint[];
  allSongs: SongPoint[];
  allNews: NewsPoint[];
  years: number[];
  year: number;
  mode: FieldMode;
  selectedId: string | null;
  onSelect: (point: AnyPoint, kind: Kind) => void;
}) {
  const points = [
    ...songs.map((point) => ({ point, kind: "music" as const })),
    ...news.map((point) => ({ point, kind: "news" as const })),
  ];

  return (
    <section className={styles.fieldShell} aria-label="Cultural weather field">
      <div className={`${styles.domPointLayer} ${mode === "drift" ? styles.domPointLayerDrift : ""}`}>
        {points.map(({ point, kind }) => {
          const size = 54 + point.prominence * 42;
          return (
            <button
              type="button"
              key={point.id}
              aria-label={`${point.title}, ${kind === "music" ? "album" : "news event"}`}
              aria-pressed={point.id === selectedId}
              className={`${styles.domPoint} ${kind === "music" ? styles.domMusic : styles.domNews} ${point.id === selectedId ? styles.domSelected : ""}`}
              style={{
                left: `${50 + point.activation * 42}%`,
                top: `${50 - point.valence * 40}%`,
                width: `${kind === "music" ? size : size * 1.42}px`,
                height: `${size}px`,
              }}
              onClick={() => onSelect(point, kind)}
              title={point.title}
            >
              <img src={mediaUrl(point, kind)} alt="" />
            </button>
          );
        })}
      </div>
      <div className={`${styles.axisCorner} ${styles.topLeft}`}>hopeful<br />reflective</div>
      <div className={`${styles.axisCorner} ${styles.topRight}`}>euphoric<br />celebratory</div>
      <div className={`${styles.axisCorner} ${styles.bottomLeft}`}>mournful<br />withdrawn</div>
      <div className={`${styles.axisCorner} ${styles.bottomRight}`}>angry<br />chaotic</div>
      {mode === "drift" && <div className={styles.driftHint}>Tilted field view — pick a year to travel</div>}
    </section>
  );
}
