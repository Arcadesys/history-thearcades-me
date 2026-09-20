import type { Metadata } from "next";
import FurryHistoryClient from "./FurryHistoryClient";

export const metadata: Metadata = {
  title: "Furry History Board (Alpha) | The Arcades History",
  description: "An Alpha interactive, incomplete, source-backed observatory of furry history, people, literary awards, and reviewed corrections.",
  alternates: { canonical: "/furry" },
  openGraph: {
    type: "website",
    url: "https://history.thearcades.me/furry",
    title: "Furry History Board (Alpha) | The Arcades History",
    description: "An Alpha interactive, incomplete, source-backed observatory of furry history, people, literary awards, and reviewed corrections.",
  },
};

export default function FurryHistoryPage() { return <FurryHistoryClient />; }
