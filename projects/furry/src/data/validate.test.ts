import { describe, expect, it } from "vitest";
import { historyDataset } from "./seed";
import { comparisonError, validateDataset } from "./validate";

describe("history dataset", () => {
  it("has a valid source-backed seed", () => expect(validateDataset(historyDataset)).toEqual([]));
  it("rejects incompatible literal comparisons", () => expect(comparisonError([historyDataset.places[0].measurements[0], historyDataset.places[4].measurements[0]])).toContain("incompatible"));
  it("keeps counts separate from nonliteral indices", () => expect(historyDataset.edges.every((edge) => edge.metric === "relative_prominence_index")).toBe(true));
  it("validates five editorial trajectories", () => expect(historyDataset.prominenceSeries).toHaveLength(5));
  it("builds a source-backed people-events corpus", () => {
    expect(historyDataset.people.length).toBeGreaterThanOrEqual(30);
    expect(historyDataset.personEvents.length).toBeGreaterThanOrEqual(40);
    expect(new Set(historyDataset.personEvents.map((event) => event.personId)).size).toBeGreaterThanOrEqual(25);
    expect(historyDataset.personEvents.every((event) => event.evidence.length > 0)).toBe(true);
  });
  it("distinguishes fandom participation from external influence", () => {
    expect(historyDataset.people.some((person) => person.relationshipToFandom === "influential-external-creator")).toBe(true);
    expect(historyDataset.people.every((person) => person.relationshipToFandom.length > 0)).toBe(true);
  });
  it("keeps date precision machine-checkable", () => {
    expect(historyDataset.personEvents.filter((event) => event.datePrecision === "range").every((event) => event.dateEnd)).toBe(true);
    expect(historyDataset.personEvents.filter((event) => event.datePrecision !== "range").every((event) => !event.dateEnd)).toBe(true);
  });
  it("keeps award standing, summaries, themes, and historical bylines explicit", () => {
    expect(historyDataset.awardWorks).toHaveLength(7);
    expect(historyDataset.awardWorks.every((work) => work.summaryEvidence.length > 0 && work.themes.length > 0)).toBe(true);
    expect(historyDataset.awardWorks.flatMap((work) => work.recognitions).some((item) => item.standing === "recommended")).toBe(true);
    expect(historyDataset.awardWorks.flatMap((work) => work.recognitions).some((item) => item.standing === "winner")).toBe(true);
    const paintedCat = historyDataset.awardWorks.find((work) => work.id === "painted-cat-2015");
    expect(paintedCat?.creators).toContainEqual({ name: "Austen Crowder", role: "author", personId: "austen-tucker" });
    expect(historyDataset.people.find((person) => person.id === "austen-tucker")?.aliases).toContain("Austen Crowder");
  });
  it("keeps the bounded sampler and all four domains represented", () => {
    const measurements = [
      ...historyDataset.places.flatMap((place) => place.measurements),
      ...historyDataset.events.flatMap((event) => event.measurements),
    ];

    expect(historyDataset.events.length).toBeGreaterThanOrEqual(8);
    expect(historyDataset.events.length).toBeLessThanOrEqual(12);
    expect(historyDataset.places.length).toBeGreaterThanOrEqual(6);
    expect(historyDataset.places.length).toBeLessThanOrEqual(10);
    expect(measurements.length).toBeGreaterThanOrEqual(15);
    expect(measurements.length).toBeLessThanOrEqual(25);
    expect(historyDataset.edges.length).toBeGreaterThanOrEqual(10);
    expect(historyDataset.edges.length).toBeLessThanOrEqual(15);
    expect(historyDataset.places.some((place) => ["platform", "online-community"].includes(place.kind))).toBe(true);
    expect(historyDataset.places.some((place) => place.id === "rowrbrazzle")).toBe(true);
    expect(historyDataset.places.some((place) => place.kind === "convention")).toBe(true);
    expect(historyDataset.people.length).toBeGreaterThan(0);
  });
});
