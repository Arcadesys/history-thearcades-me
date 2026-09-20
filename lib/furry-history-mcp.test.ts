import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchFurryHistory,
  buildDisputeIssueUrl,
  furryHistoryToolDefinitions,
  furryHistoryToolHandlers,
  prepareFeedback,
  resolveDisputeTarget,
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
  assert.equal(packet.target?.kind, "person-event");
  const issueUrl = new URL(packet.submissionUrl);
  assert.equal(issueUrl.searchParams.get("template"), "data-dispute.yml");
  assert.equal(issueUrl.searchParams.get("labels"), "data-dispute");
  assert.match(issueUrl.searchParams.get("body") ?? "", /Dataset version: v2-people-corpus-2026-09-20/);
  assert.match(issueUrl.searchParams.get("body") ?? "", /Please ask before attributing/);
  assert.doesNotMatch(packet.submissionUrl, /^mailto:/);
});

test("feedback rejects unknown records and unsafe evidence links", () => {
  assert.throws(() => prepareFeedback({ recordId: "event:not-real", feedback: "Correction" }), /does not match/);
  assert.throws(() => prepareFeedback({ target: { kind: "source", id: "not-real" }, feedback: "Correction" }), /does not match/);
  assert.throws(() => prepareFeedback({ target: { kind: "not-real", id: "x" }, feedback: "Correction" }), /not supported/);
  assert.throws(() => prepareFeedback({ feedback: "Correction", evidenceUrl: "javascript:alert(1)" }), /HTTP\(S\)/);
});

test("resolves every supported dispute target kind with stable context", () => {
  const cases = [
    [{ target: { kind: "prominence-point", id: "series-anthrocon:2024" } }, "prominence-point"],
    [{ target: { kind: "timeline-event", id: "anthrocon-1997" } }, "timeline-event"],
    [{ target: { kind: "source", id: "anthrocon-history" } }, "source"],
    [{ targetKind: "person", targetId: "fred-patten" }, "person"],
    [{ target: { kind: "person-event", id: "volle-2005-tim-susman" } }, "person-event"],
  ] as const;
  for (const [args, kind] of cases) {
    const target = resolveDisputeTarget(args);
    assert.equal(target?.kind, kind);
    assert.ok(target?.id);
    assert.ok(target?.claim);
    assert.equal(target?.datasetVersion, "v2-people-corpus-2026-09-20");
    assert.equal(target?.canonicalUrl, "https://history.thearcades.me/furry");
    assert.doesNotMatch(target?.canonicalUrl ?? "", /#/);
    assert.ok(target?.sourceIds.length);
  }
});

test("legacy recordId remains compatible and issue context is encoded exactly", () => {
  const target = resolveDisputeTarget({ recordId: "event:anthrocon-1997" });
  assert.equal(target?.kind, "timeline-event");
  const issueUrl = buildDisputeIssueUrl(target ?? null, { feedback: "A correction with punctuation: café & friends.", evidenceUrl: "https://example.com/a?b=1&c=2", credit: "Use my handle" });
  const parsed = new URL(issueUrl);
  const body = parsed.searchParams.get("body") ?? "";
  assert.match(parsed.searchParams.get("title") ?? "", /^\[data dispute\] timeline-event:/);
  assert.match(body, /café & friends\./);
  assert.match(body, /https:\/\/example\.com\/a\?b=1&c=2/);
  assert.match(body, /Use my handle/);
  assert.match(body, /Canonical page: https:\/\/history\.thearcades\.me\/furry/);
  assert.doesNotMatch(body, /Canonical page: https:\/\/history\.thearcades\.me\/furry#/);
  assert.match(body, /Stable target ID: anthrocon-1997/);
});

test("validates recordId and expanded target independently", () => {
  assert.throws(
    () => prepareFeedback({ recordId: "event:not-real", target: { kind: "person", id: "fred-patten" }, feedback: "Correction" }),
    /recordId does not match/,
  );
  assert.throws(
    () => prepareFeedback({ recordId: "person:fred-patten", target: { kind: "source", id: "not-real" }, feedback: "Correction" }),
    /target reference does not match/,
  );
  assert.throws(
    () => prepareFeedback({ recordId: "person:fred-patten", target: { kind: "source", id: "anthrocon-history" }, feedback: "Correction" }),
    /conflicting corpus records/,
  );
  const matching = prepareFeedback({ recordId: "event:volle-2005-tim-susman", target: { kind: "person-event", id: "volle-2005-tim-susman" }, feedback: "Correction" });
  assert.equal(matching.target?.kind, "person-event");
  assert.equal(matching.target?.id, "volle-2005-tim-susman");
  assert.equal(matching.submitted, false);
});
