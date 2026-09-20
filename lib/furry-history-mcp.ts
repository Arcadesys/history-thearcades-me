import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { historyDataset } from "@/projects/furry/src/data/seed";
import type { EvidenceRef, PersonEvent, PersonNode, Source } from "@/projects/furry/src/data/contracts";

const BOARD_URL = "https://history.thearcades.me/furry";
const FEEDBACK_EMAIL = "austen.crowder@gmail.com";
const MAX_RESULTS = 20;
const SEARCH_STOP_WORDS = new Set(["a", "an", "and", "did", "for", "in", "is", "of", "on", "show", "the", "to", "was", "what", "when", "who"]);

type SearchResult = { id: string; title: string; url: string };
type FetchResult = { id: string; title: string; text: string; url: string; metadata: Record<string, unknown> };

const sourceById = new Map(historyDataset.sources.map((source) => [source.id, source]));
const personById = new Map(historyDataset.people.map((person) => [person.id, person]));
const eventsByPerson = new Map<string, PersonEvent[]>();
for (const event of historyDataset.personEvents) {
  const current = eventsByPerson.get(event.personId) ?? [];
  current.push(event);
  eventsByPerson.set(event.personId, current);
}

function result(payload: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

function textArg(args: unknown, key: string, options: { required?: boolean; max?: number } = {}): string {
  if (!args || typeof args !== "object") throw new Error("Arguments must be an object.");
  const value = (args as Record<string, unknown>)[key];
  if (value === undefined || value === null || value === "") {
    if (options.required) throw new Error(`${key} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`${key} must be a string.`);
  const trimmed = value.trim();
  if (options.required && !trimmed) throw new Error(`${key} is required.`);
  if (options.max && trimmed.length > options.max) throw new Error(`${key} must be ${options.max} characters or fewer.`);
  return trimmed;
}

function evidenceSources(evidence: readonly EvidenceRef[]): Source[] {
  return evidence.map((item) => sourceById.get(item.sourceId)).filter((item): item is Source => Boolean(item));
}

function canonicalUrl(evidence: readonly EvidenceRef[]): string {
  return evidenceSources(evidence)[0]?.url ?? BOARD_URL;
}

function searchablePerson(person: PersonNode): string {
  return [person.label, ...person.aliases, ...person.roles, person.relationshipToFandom].join(" ").toLocaleLowerCase();
}

function searchableEvent(event: PersonEvent): string {
  const person = personById.get(event.personId);
  return [
    event.dateStart.slice(0, 4),
    person?.label,
    ...(person?.aliases ?? []),
    event.headline,
    event.description,
    event.work,
    ...event.roles,
    ...event.organizations,
    ...event.tags,
    ...event.significance,
  ].filter(Boolean).join(" ").toLocaleLowerCase();
}

function score(haystack: string, query: string): number {
  if (!query) return 1;
  if (haystack === query) return 100;
  if (haystack.startsWith(query)) return 90;
  if (haystack.includes(query)) return 80;
  const haystackTerms = new Set(haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const terms = query.split(/[^\p{L}\p{N}]+/u).filter((term) => term && !SEARCH_STOP_WORDS.has(term));
  const requiredNumbers = terms.filter((term) => /^\d+$/.test(term));
  if (requiredNumbers.some((term) => !haystackTerms.has(term))) return 0;
  const matched = terms.filter((term) => haystackTerms.has(term));
  if (!matched.length || (terms.length > 1 && matched.length < Math.min(2, terms.length))) return 0;
  return (matched.length === terms.length ? 60 : 20) + matched.length;
}

export function searchFurryHistory(query: string): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  const people = historyDataset.people.map((person) => ({
    score: score(searchablePerson(person), normalized),
    item: { id: `person:${person.id}`, title: person.label, url: canonicalUrl(person.evidence) },
  }));
  const events = historyDataset.personEvents.map((event) => {
    const person = personById.get(event.personId);
    return {
      score: score(searchableEvent(event), normalized),
      item: { id: `event:${event.id}`, title: `${event.dateStart.slice(0, 4)} — ${person?.label ?? "Unknown person"}: ${event.headline}`, url: canonicalUrl(event.evidence) },
    };
  });
  return [...people, ...events]
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.item);
}

function sourceMetadata(evidence: readonly EvidenceRef[]) {
  return evidence.map((item) => {
    const source = sourceById.get(item.sourceId);
    return {
      id: item.sourceId,
      title: source?.title ?? item.sourceId,
      url: source?.url,
      sourceType: source?.evidenceType,
      supports: item.supports,
      confidence: item.confidence,
    };
  });
}

function fetchPerson(person: PersonNode): FetchResult {
  const timeline = [...(eventsByPerson.get(person.id) ?? [])].sort((a, b) => a.dateStart.localeCompare(b.dateStart));
  const timelineText = timeline.length
    ? timeline.map((event) => `${event.dateStart.slice(0, 4)} — ${event.headline}: ${event.description}`).join("\n")
    : "No dated events are present in this corpus slice.";
  return {
    id: `person:${person.id}`,
    title: person.label,
    text: [
      person.aliases.length ? `Aliases: ${person.aliases.join(", ")}` : undefined,
      `Relationship to fandom: ${person.relationshipToFandom}`,
      `Roles: ${person.roles.join(", ")}`,
      "Timeline:",
      timelineText,
    ].filter(Boolean).join("\n"),
    url: canonicalUrl(person.evidence),
    metadata: {
      kind: "person",
      corpusVersion: historyDataset.version,
      relationshipToFandom: person.relationshipToFandom,
      aliases: person.aliases,
      roles: person.roles,
      eventIds: timeline.map((event) => `event:${event.id}`),
      sources: sourceMetadata(person.evidence),
    },
  };
}

function fetchEvent(event: PersonEvent): FetchResult {
  const person = personById.get(event.personId);
  return {
    id: `event:${event.id}`,
    title: `${event.dateStart.slice(0, 4)} — ${person?.label ?? "Unknown person"}: ${event.headline}`,
    text: [
      `Date: ${event.dateStart}${event.dateEnd ? ` through ${event.dateEnd}` : ""} (${event.datePrecision} precision)`,
      `Person: ${person?.label ?? event.personId}`,
      `Claim confidence: ${event.confidence}`,
      `Roles: ${event.roles.join(", ")}`,
      event.work ? `Work: ${event.work}` : undefined,
      event.organizations.length ? `Organizations: ${event.organizations.join(", ")}` : undefined,
      event.description,
    ].filter(Boolean).join("\n"),
    url: canonicalUrl(event.evidence),
    metadata: {
      kind: "person-event",
      corpusVersion: historyDataset.version,
      personId: `person:${event.personId}`,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      datePrecision: event.datePrecision,
      eventType: event.eventType,
      confidence: event.confidence,
      roles: event.roles,
      work: event.work,
      organizations: event.organizations,
      tags: event.tags,
      significance: event.significance,
      sources: sourceMetadata(event.evidence),
    },
  };
}

export function fetchFurryHistory(id: string): FetchResult | undefined {
  const [kind, recordId] = id.split(":", 2);
  if (!recordId) return undefined;
  if (kind === "person") {
    const person = personById.get(recordId);
    return person ? fetchPerson(person) : undefined;
  }
  if (kind === "event") {
    const event = historyDataset.personEvents.find((item) => item.id === recordId);
    return event ? fetchEvent(event) : undefined;
  }
  return undefined;
}

export function prepareFeedback(args: unknown) {
  const recordId = textArg(args, "recordId", { max: 160 });
  if (recordId && !fetchFurryHistory(recordId)) throw new Error("recordId does not match a corpus person or event.");
  const feedback = textArg(args, "feedback", { required: true, max: 1200 });
  const evidenceUrl = textArg(args, "evidenceUrl", { max: 500 });
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) throw new Error("evidenceUrl must be an absolute HTTP(S) URL.");
  const credit = textArg(args, "credit", { max: 80 });
  const subject = `Furry History Board feedback${recordId ? ` — ${recordId}` : ""}`;
  const body = [
    recordId ? `Corpus record: ${recordId}` : "Corpus record: general feedback or missing history",
    `Feedback: ${feedback}`,
    evidenceUrl ? `Supporting source: ${evidenceUrl}` : "Supporting source: not supplied",
    credit ? `Credit preference: ${credit}` : "Credit preference: please ask before attribution",
    "",
    "This message is a proposed correction or recollection. Please review it before changing the public historical record.",
  ].join("\n");
  return {
    submitted: false,
    status: "prepared-not-sent",
    recordId: recordId || null,
    reviewPolicy: "Feedback remains a proposed correction until its evidence and attribution are reviewed.",
    contactUrl: `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    subject,
    body,
  };
}

export const furryHistoryToolDefinitions: Tool[] = [
  {
    name: "search",
    title: "Search furry history",
    description: "Use this when someone wants to find people, aliases, roles, works, organizations, dates, or themes in the source-backed furry-history corpus.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "A person, alias, year, work, organization, role, tag, or historical question." } }, required: ["query"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "fetch",
    title: "Fetch a furry-history record",
    description: "Use this after search to retrieve one person or person-event with its dates, confidence, evidence, and related record IDs.",
    inputSchema: { type: "object", properties: { id: { type: "string", description: "A search result ID beginning with person: or event:." } }, required: ["id"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "prepare_furry_history_feedback",
    title: "Prepare furry-history feedback",
    description: "Use this when someone has a correction, recollection, missing person, or supporting source. It prepares a review email but does not send, store, or publish anything.",
    inputSchema: {
      type: "object",
      properties: {
        recordId: { type: "string", description: "Optional person: or event: ID from search." },
        feedback: { type: "string", maxLength: 1200, description: "The correction, recollection, missing context, or suggested addition." },
        evidenceUrl: { type: "string", description: "Optional absolute HTTP(S) link to supporting evidence." },
        credit: { type: "string", maxLength: 80, description: "Optional attribution preference; defaults to asking before attribution." },
      },
      required: ["feedback"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true },
  },
];

export const furryHistoryToolHandlers: Record<string, (args: unknown) => Promise<CallToolResult>> = {
  search: async (args) => result({ results: searchFurryHistory(textArg(args, "query", { required: true, max: 240 })) }),
  fetch: async (args) => {
    const id = textArg(args, "id", { required: true, max: 200 });
    const item = fetchFurryHistory(id);
    if (!item) throw new Error(`No furry-history record found for ${id}.`);
    return result(item);
  },
  prepare_furry_history_feedback: async (args) => result(prepareFeedback(args)),
};
