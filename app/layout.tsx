import type { Metadata } from "next";
import "../projects/furry/src/styles/global.css";
import "../projects/furry/src/features/query/query.css";
import "../projects/furry/src/features/timeline/timeline.css";
import "../projects/furry/src/features/chart/prominence-chart.css";
import "../projects/furry/src/features/evidence/evidence.css";
import "./hub.css";

export const metadata: Metadata = {
  title: "History | The Arcades",
  description: "Small, source-backed observatories of cultural history.",
  metadataBase: new URL("https://history.thearcades.me"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://history.thearcades.me/",
    title: "History | The Arcades",
    description: "Small, source-backed observatories of cultural history.",
    siteName: "The Arcades History",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
