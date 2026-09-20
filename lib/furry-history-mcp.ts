import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { historyDataset } from "@/projects/furry/src/data/seed";
import type { EvidenceRef, HistoricalEvent, PersonEvent, PersonNode, ProminencePoint, ProminenceSeries, Source } from "@/projects/furry/src/data/contracts";

const BOARD_URL = "https://history.thearcades.me/furry";
const GITHUB_ISSUES_URL = "https://github.com/Arcadesys/history-thearcades-me/issues/new";
const MAX_RESULTS = 20;
const SEARCH_STOP_WORDS = new Set(["a", "an", "and", "did", "for", "in", "is", "of", "on", "show", "the", "to", "was", "what", "when", "who"]);

type SearchResult = { id: string; title: string; url: string };
type FetchResult = { id: string; title: string; text: string; url: string; metadata: Record<string, unknown> };

export type DisputeTargetKind = "prominence-point" | "timeline-event" | "source" | "person" | "person-event";
export type DisputeTarget = { kind: DisputeTargetKind; id: string; claim: string; datasetVersion: string; canonicalUrl: string; sourceIds: readonly string[] };
export type DisputeDetails = { feedback: string; evidenceUrl?: string; credit?: string };

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

function eventClaim(event: HistoricalEvent): string {
  return `${event.dateStart}${event.dateEnd ? ` through ${event.dateEnd}` : ""} — ${event.title}: ${event.summary}`;
}

function personEventClaim(event: PersonEvent): string {
  const person = personById.get(event.personId);
  return `${event.dateStart}${event.dateEnd ? ` through ${event.dateEnd}` : ""} — ${person?.label ?? event.personId}: ${event.headline} — ${event.description}`;
}

function prominencePointId(series: ProminenceSeries, point: ProminencePoint): string {
  return `${series.id}:${point.year}`;
}

function targetFromRecordId(recordId: string): DisputeTarget | undefined {
  const [kind, id] = recordId.split(":", 2);
  if (!id) return undefined;
  if (kind === "person") {
    const person = personById.get(id);
    return person ? { kind: "person", id: person.id, claim: `${person.label} (${person.relationshipToFandom})`, datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: person.evidence.map((item) => item.sourceId) } : undefined;
  }
  if (kind === "event") {
    const timelineEvent = historyDataset.events.find((item) => item.id === id);
    if (timelineEvent) return { kind: "timeline-event", id: timelineEvent.id, claim: eventClaim(timelineEvent), datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: timelineEvent.evidence.map((item) => item.sourceId) };
    const personEvent = historyDataset.personEvents.find((item) => item.id === id);
    if (personEvent) return { kind: "person-event", id: personEvent.id, claim: personEventClaim(personEvent), datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: personEvent.evidence.map((item) => item.sourceId) };
  }
  return undefined;
}

function targetFromExpandedRef(args: Record<string, unknown>): DisputeTarget | undefined {
  const target = args.target;
  const kind = typeof args.targetKind === "string" ? args.targetKind : target && typeof target === "object" ? (target as Record<string, unknown>).kind : undefined;
  const id = typeof args.targetId === "string" ? args.targetId : target && typeof target === "object" ? (target as Record<string, unknown>).id : typeof target === "string" ? target : undefined;
  if (typeof kind !== "string" || typeof id !== "string") return undefined;
  if (!["prominence-point", "timeline-event", "source", "person", "person-event"].includes(kind)) throw new Error("target kind is not supported.");
  if (kind === "source") {
    const source = sourceById.get(id);
    return source ? { kind: "source", id: source.id, claim: `${source.title}: ${source.url}`, datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: [source.id] } : undefined;
  }
  if (kind === "person") return targetFromRecordId(`person:${id}`);
  if (kind === "timeline-event") {
    const event = historyDataset.events.find((item) => item.id === id);
    return event ? { kind: "timeline-event", id: event.id, claim: eventClaim(event), datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: event.evidence.map((item) => item.sourceId) } : undefined;
  }
  if (kind === "person-event") {
    const event = historyDataset.personEvents.find((item) => item.id === id);
    return event ? { kind: "person-event", id: event.id, claim: personEventClaim(event), datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: event.evidence.map((item) => item.sourceId) } : undefined;
  }
  const separator = id.lastIndexOf(":");
  const seriesId = separator === -1 ? id : id.slice(0, separator);
  const year = separator === -1 ? NaN : Number(id.slice(separator + 1));
  const series = historyDataset.prominenceSeries.find((item) => item.id === seriesId);
  const point = series?.points.find((item) => item.year === year);
  return series && point ? { kind: "prominence-point", id: prominencePointId(series, point), claim: `${series.label}, ${point.year}: ${point.value} of 100 relative prominence. ${point.basis}`, datasetVersion: historyDataset.version, canonicalUrl: BOARD_URL, sourceIds: [...point.sourceIds] } : undefined;
}

export function resolveDisputeTarget(args: unknown): DisputeTarget | undefined {
  if (!args || typeof args !== "object") throw new Error("Arguments must be an object.");
  const recordId = textArg(args, "recordId", { max: 160 });
  const input = args as Record<string, unknown>;
  const hasExpandedTarget = "target" in input || "targetId" in input || "targetKind" in input;
  const recordTarget = recordId ? targetFromRecordId(recordId) : undefined;
  const expandedTarget = hasExpandedTarget ? targetFromExpandedRef(input) : undefined;
  if (recordId && !recordTarget) throw new Error("recordId does not match a corpus record.");
  if (hasExpandedTarget && !expandedTarget) throw new Error("target reference does not match a corpus record.");
  if (recordTarget && expandedTarget && (recordTarget.kind !== expandedTarget.kind || recordTarget.id !== expandedTarget.id)) {
    throw new Error("recordId and target reference identify conflicting corpus records.");
  }
  return expandedTarget ?? recordTarget;
}

export function buildDisputeIssueUrl(target: DisputeTarget | null, details: DisputeDetails): string {
  const subject = target ? `[data dispute] ${target.kind}: ${target.id}` : "[data dispute] General corpus feedback";
  const body = [
    "## Corpus context",
    `- Target kind: ${target?.kind ?? "general"}`,
    `- Stable target ID: ${target?.id ?? "general-feedback"}`,
    `- Claim: ${target?.claim ?? "General correction, missing history, or corpus question"}`,
    `- Dataset version: ${target?.datasetVersion ?? historyDataset.version}`,
    `- Canonical page: ${target?.canonicalUrl ?? BOARD_URL}`,
    `- Source IDs: ${target?.sourceIds.length ? target.sourceIds.join(", ") : "none recorded"}`,
    "",
    "## Proposed correction or dispute",
    details.feedback,
    "",
    "## Supporting sources",
    details.evidenceUrl || "Please add links, citations, archive captures, or other source details here.",
    "",
    "## Attribution preference",
    details.credit || "Please ask before attributing this contribution.",
    "",
    "## Review prompts",
    "- What exact wording, date, identity, relationship, or measurement should be corrected?",
    "- Which sources support the proposed correction, and what do they establish?",
    "- How should attribution or credit be handled?",
    "",
    "This issue is a public proposed correction. It does not change, submit, or publish corpus data automatically; maintainers review evidence before any edit.",
  ].join("\n");
  const params = new URLSearchParams({ template: "data-dispute.yml", labels: "data-dispute", title: subject, body });
  return `${GITHUB_ISSUES_URL}?${params.toString()}`;
}

export function prepareFeedback(args: unknown) {
  const recordId = textArg(args, "recordId", { max: 160 });
  const target = resolveDisputeTarget(args);
  const hasExpandedTarget = Boolean(args && typeof args === "object" && ("target" in args || "targetId" in args || "targetKind" in args));
  if ((recordId || hasExpandedTarget) && !target) throw new Error("target reference does not match a corpus record.");
  const feedback = textArg(args, "feedback", { required: true, max: 1200 });
  const evidenceUrl = textArg(args, "evidenceUrl", { max: 500 });
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) throw new Error("evidenceUrl must be an absolute HTTP(S) URL.");
  const credit = textArg(args, "credit", { max: 80 });
  return {
    submitted: false,
    status: "prepared-not-sent",
    recordId: recordId || null,
    target,
    reviewPolicy: "Feedback becomes a public proposed correction only after the contributor signs in to GitHub and submits an issue; maintainers review evidence before changing the historical record.",
    submissionUrl: buildDisputeIssueUrl(target ?? null, { feedback, evidenceUrl: evidenceUrl || undefined, credit: credit || undefined }),
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
    description: "Use this when someone has a correction, recollection, missing history, or supporting source. It prepares a public GitHub dispute issue for the contributor to review and submit; it does not send, store, publish, or mutate corpus data.",
    inputSchema: {
      type: "object",
      properties: {
        recordId: { type: "string", description: "Compatibility reference: person: or event: ID from search." },
        target: { type: "object", description: "Expanded target reference. Use kind plus stable id for a prominence-point, timeline-event, source, person, or person-event.", properties: { kind: { type: "string", enum: ["prominence-point", "timeline-event", "source", "person", "person-event"] }, id: { type: "string" } }, required: ["kind", "id"], additionalProperties: false },
        targetKind: { type: "string", enum: ["prominence-point", "timeline-event", "source", "person", "person-event"], description: "Expanded target kind, used with targetId." },
        targetId: { type: "string", description: "Expanded stable target ID, used with targetKind." },
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
