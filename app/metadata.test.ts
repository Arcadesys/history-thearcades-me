import { describe, expect, it } from "vitest";
import { metadata as furryMetadata } from "./furry/page";
import { metadata as siteMetadata } from "./layout";

describe("Alpha metadata", () => {
  it("keeps the hub and board indexable with Alpha descriptions", () => {
    expect(siteMetadata.title).toContain("Alpha");
    expect(siteMetadata.description).toMatch(/incomplete.*source-backed.*reviewed/i);
    expect(furryMetadata.title).toContain("Alpha");
    expect(furryMetadata.description).toMatch(/incomplete.*source-backed.*reviewed/i);
    expect(furryMetadata.alternates?.canonical).toBe("/furry");
  });
});
