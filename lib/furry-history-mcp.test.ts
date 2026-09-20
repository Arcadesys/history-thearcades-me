import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchFurryHistory,
  furryHistoryToolDefinitions,
  furryHistoryToolHandlers,
  prepareFeedback,
  searchFurryHistory,
} from "./furry-history-mcp";

test("exposes standard search and fetch as read-only tools", () => {
  const search = furryHistoryToolDefinitions.find((tool) => tool.name === "search");
  const fetch = furryHistoryToolDefinitions.find((tool) => tool.name === "fetch");
  assert.ok(search);
  assert.ok(fetch);
  assert.equal(search.annotations?.readOnlyHint, true);
  assert.equal(fetch.annotations?.readOnlyHint, true);
  assert.deepEqual(search.inputSchema.required, ["query"]);
  assert.deepEqual(fetch.inputSchema.required, ["id"]);
});

test("search finds aliases, dates, organizations, and themes", () => {
  assert.ok(searchFurryHistory("Kyell Gold").some((item) => item.id === "person:tim-susman"));
  assert.ok(searchFurryHistory("2005 Fur Affinity").some((item) => item.id.startsWith("event:fur-affinity-2005")));
  assert.ok(searchFurryHistory("archives").some((item) => item.id.startsWith("event:")));
  assert.deepEqual(
    searchFurryHistory("2005 Fur Affinity").map((item) => item.id),
    ["event:fur-affinity-2005-alkora", "event:fur-affinity-2005-dragoneer"],
  );
});

test("fetch returns a person timeline and event evidence", () => {
  const person = fetchFurryHistory("person:tim-susman");
  const event = fetchFurryHistory("event:volle-2005-tim-susman");
  assert.equal(person?.metadata.kind, "person");
  assert.match(person?.text ?? "", /Volle/);
  assert.equal(event?.metadata.kind, "person-event");
  assert.ok(Array.isArray(event?.metadata.sources));
  assert.match(event?.url ?? "", /^https:\/\//);
});

test("search and fetch handlers use the one-text-item compatibility shape", async () => {
  const searched = await furryHistoryToolHandlers.search({ query: "FurryMUCK" });
  const searchPayload = JSON.parse(searched.content[0].type === "text" ? searched.content[0].text : "null") as { results: unknown[] };
  assert.equal(searched.content.length, 1);
  assert.ok(searchPayload.results.length > 0);
  const fetched = await furryHistoryToolHandlers.fetch({ id: "person:fred-patten" });
  assert.equal(fetched.content.length, 1);
  assert.equal(fetched.content[0].type, "text");
});

test("feedback is prepared for review without claiming submission", () => {
  const packet = prepareFeedback({
    recordId: "event:volle-2005-tim-susman",
    feedback: "The publication month should be checked against the first edition.",
    evidenceUrl: "https://example.com/catalog-record",
  });
  assert.equal(packet.submitted, false);
  assert.equal(packet.status, "prepared-not-sent");
  assert.match(packet.contactUrl, /^mailto:/);
  assert.match(packet.body, /Please review it before changing/);
});

test("feedback rejects unknown records and unsafe evidence links", () => {
  assert.throws(() => prepareFeedback({ recordId: "event:not-real", feedback: "Correction" }), /does not match/);
  assert.throws(() => prepareFeedback({ feedback: "Correction", evidenceUrl: "javascript:alert(1)" }), /HTTP\(S\)/);
});
