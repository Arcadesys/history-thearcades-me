import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HistoryHomePage from "./page";

describe("history hub Alpha treatment", () => {
  it("explains the incomplete, source-backed, reviewed-correction status", () => {
    render(<HistoryHomePage />);
    expect(screen.getByText(/Alpha projects/i)).toBeInTheDocument();
    expect(screen.getByText(/Corrections are reviewed/i)).toBeInTheDocument();
  });
});
