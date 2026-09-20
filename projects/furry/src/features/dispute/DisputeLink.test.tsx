import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { historyDataset } from "../../data/seed";
import { DisputeLink, makeDisputeTarget } from "./DisputeLink";

describe("DisputeLink", () => {
  it("builds a same-tab public issue link with stable corpus context", () => {
    const target = makeDisputeTarget("prominence-point", "series-furality:2024", "Furality, 2024: 94 of 100", ["furality-history"]);
    render(<DisputeLink target={target} />);
    const link = screen.getByRole("link", { name: "Dispute this" });
    const url = new URL(link.getAttribute("href") ?? "");
    expect(link).not.toHaveAttribute("target");
    expect(url.hostname).toBe("github.com");
    expect(url.pathname).toBe("/Arcadesys/history-thearcades-me/issues/new");
    expect(url.searchParams.get("template")).toBe("data-dispute.yml");
    expect(url.searchParams.get("labels")).toBe("data-dispute");
    expect(url.searchParams.get("body")).toContain("Stable target ID: series-furality:2024");
    expect(url.searchParams.get("body")).toContain(`Dataset version: ${historyDataset.version}`);
    expect(screen.getByText("Opens a public GitHub issue.")).toBeInTheDocument();
  });
});
