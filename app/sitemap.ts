import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-20T00:00:00.000Z");
  return [
    { url: "https://history.thearcades.me/", lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: "https://history.thearcades.me/furry", lastModified, changeFrequency: "weekly", priority: 0.9 },
  ];
}
