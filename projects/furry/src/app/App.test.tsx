import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { ThemeProvider } from "../features/theme/ThemeProvider";

test("renders the foundation shell and exact lens labels", () => {
  render(<ThemeProvider><App /></ThemeProvider>);
  expect(screen.getByRole("heading", { name: "Furry History Board" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Internet" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Publishing" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Conventions" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "People" })).toBeInTheDocument();
  expect(screen.getByText(/Alpha: this prototype is intentionally incomplete, source-backed, and open to reviewed corrections/i)).toBeInTheDocument();
});

test("exposes reviewed correction links for chart, table, timeline, and expanded evidence", async () => {
  const user = userEvent.setup();
  render(<ThemeProvider><App /></ThemeProvider>);
  const initialLinks = screen.getAllByRole("link", { name: "Dispute this" });
  expect(initialLinks.length).toBeGreaterThanOrEqual(2);
  expect(screen.getAllByText("Opens a public GitHub issue.").length).toBe(initialLinks.length);
  await user.click(screen.getByRole("button", { name: "View data table" }));
  expect(screen.getByRole("table", { name: /evidence-backed prominence series/i })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Dispute this" }).length).toBeGreaterThan(initialLinks.length);
  await user.click(screen.getByRole("button", { name: /Anthrocon history/i }));
  expect(screen.getAllByRole("link", { name: "Dispute this" }).length).toBeGreaterThan(initialLinks.length);
  expect(screen.getAllByRole("link", { name: "Dispute this" }).every((link) => !link.hasAttribute("target"))).toBe(true);
});

test("renders the 2015 literary-awards pilot without flattening recognition status", () => {
  render(<ThemeProvider><App /></ThemeProvider>);
  expect(screen.getByRole("heading", { name: "Literary awards research" })).toBeInTheDocument();
  expect(screen.getByText("7 researched works")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "The Painted Cat" })).toBeInTheDocument();
  expect(screen.getByText("Written by Austen Crowder")).toBeInTheDocument();
  expect(
    screen.getByText((_, element) =>
      Boolean(
        element?.classList.contains("awards-method-note") &&
          element.textContent?.includes("official reading list") &&
          element.textContent.includes("does not mean finalist or winner"),
      ),
    ),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Editorial analysis").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Source-stated").length).toBeGreaterThan(0);
});
