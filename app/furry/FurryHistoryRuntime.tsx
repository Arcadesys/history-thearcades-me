"use client";

import { App } from "../../projects/furry/src/app/App";
import { ThemeProvider } from "../../projects/furry/src/features/theme/ThemeProvider";

export default function FurryHistoryRuntime() {
  return <ThemeProvider><App /></ThemeProvider>;
}
