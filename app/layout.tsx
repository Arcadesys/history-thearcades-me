import type { Metadata } from "next";
import "../projects/furry/src/styles/global.css";
import "../projects/furry/src/features/query/query.css";
import "../projects/furry/src/features/timeline/timeline.css";
import "../projects/furry/src/features/chart/prominence-chart.css";
import "../projects/furry/src/features/evidence/evidence.css";
import "../projects/furry/src/features/dispute/dispute.css";
import "./hub.css";

export const metadata: Metadata = {
  title: "Alpha History | The Arcades",
  description: "An Alpha hub of incomplete, source-backed histories with reviewed corrections.",
  metadataBase: new URL("https://history.thearcades.me"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://history.thearcades.me/",
    title: "Alpha History | The Arcades",
    description: "An Alpha hub of incomplete, source-backed histories with reviewed corrections.",
    siteName: "The Arcades History",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="alpha-banner" role="note" aria-label="Alpha release"><strong>Alpha</strong><span>This history hub is incomplete and source-backed. Corrections are welcome and reviewed before the record changes.</span></div>{children}</body></html>;
}
