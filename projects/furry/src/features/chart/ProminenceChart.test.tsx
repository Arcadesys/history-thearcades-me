import { render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { prominenceSeries } from "../../data/seed";
import { ProminenceChart } from "./ProminenceChart";
import { ProminenceTable } from "./ProminenceTable";

describe("ProminenceChart", () => {
  it("renders accessible labels and synchronizes keyboard year changes", async () => {
    const onYear = vi.fn();
    render(<ProminenceChart series={prominenceSeries} selectedYear={2024} onSelectedYearChange={onYear} />);
    expect(screen.getByRole("img", { name: /where furry lived/i })).toBeInTheDocument();
    const chart = screen.getByRole("group", { name: /relative prominence timeline/i }); chart.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onYear).toHaveBeenCalledWith(2023);
    await userEvent.keyboard("{End}");
    expect(onYear).toHaveBeenCalledWith(2026);
    expect(screen.getByRole("status")).toHaveTextContent(/relative prominence/i);
  });
  it("selects an exact clicked point and keeps the dispute link in sync with keyboard selection", async () => {
    function Harness() {
      const [year, setYear] = useState(2021);
      return <ProminenceChart series={prominenceSeries} selectedYear={year} onSelectedYearChange={setYear} />;
    }
    render(<Harness />);
    await userEvent.click(screen.getByTestId("prominence-point-series-furality-2024"));
    expect(screen.getByRole("status")).toHaveTextContent("Furality, 2024");
    expect(new URL(screen.getByRole("link", { name: "Dispute this" }).getAttribute("href") ?? "").searchParams.get("body")).toContain("Stable target ID: series-furality:2024");
    const chart = screen.getByRole("group", { name: /relative prominence timeline/i });
    chart.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("status")).toHaveTextContent("Furality, 2023");
    expect(new URL(screen.getByRole("link", { name: "Dispute this" }).getAttribute("href") ?? "").searchParams.get("body")).toContain("Stable target ID: series-furality:2023");
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("status")).toHaveTextContent(/Anthrocon|Midwest FurFest|ConFurence|Rowrbrazzle/);
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("link", { name: "Dispute this" })).toBeInTheDocument();
  });
  it("provides an equivalent labeled table", () => { render(<ProminenceTable series={prominenceSeries} />); expect(screen.getByRole("table", { name: /evidence-backed prominence series/i })).toBeInTheDocument(); expect(screen.getAllByText(/nonliteral/i).length).toBeGreaterThan(0); });
});
