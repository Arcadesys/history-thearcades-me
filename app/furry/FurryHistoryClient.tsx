"use client";

import dynamic from "next/dynamic";

const FurryHistoryRuntime = dynamic(() => import("./FurryHistoryRuntime"), { ssr: false });

export default function FurryHistoryClient() {
  return <FurryHistoryRuntime />;
}
