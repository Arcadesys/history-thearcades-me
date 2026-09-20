import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CulturalWeatherVane from "./CulturalWeatherVane";

describe("Cultural Weather Vane", () => {
  it("renders a keyboard-accessible plotted field without detectable accessibility violations", async () => {
    const { container } = render(<CulturalWeatherVane />);
    expect(screen.getByRole("heading", { name: /what did the culture/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /album$|news event$/i })).toHaveLength(12);
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
