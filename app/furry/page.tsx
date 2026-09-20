import type { Metadata } from "next";
import FurryHistoryClient from "./FurryHistoryClient";

export const metadata: Metadata = {
  title: "Furry History Board | The Arcades History",
  description: "An interactive, source-backed observatory of furry history.",
  alternates: { canonical: "/furry" },
  openGraph: {
    type: "website",
    url: "https://history.thearcades.me/furry",
    title: "Furry History Board | The Arcades History",
    description: "An interactive, source-backed observatory of furry history.",
  },
};

export default function FurryHistoryPage() { return <FurryHistoryClient />; }
