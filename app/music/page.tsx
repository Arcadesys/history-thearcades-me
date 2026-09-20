import type { Metadata } from "next";
import CulturalWeatherVane from "./CulturalWeatherVane";

export const metadata: Metadata = {
  title: "Cultural Weather Vane | The Arcades History",
  description: "A navigable field of music and news, mapped as atmosphere rather than verdict.",
  alternates: { canonical: "/music" },
  openGraph: {
    type: "website",
    url: "https://history.thearcades.me/music",
    title: "Cultural Weather Vane | The Arcades History",
    description: "A navigable field of music and news, mapped as atmosphere rather than verdict.",
  },
};

export default function MusicHistoryPage() {
  return <CulturalWeatherVane />;
}
