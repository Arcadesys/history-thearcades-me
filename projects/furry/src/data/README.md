# Furry History Board data

This directory keeps measured place/event data separate from the people-events corpus.
`seed.ts` assembles both into one validated dataset; `people-corpus.ts` owns the first
source-backed people slice.

## Record model

A person can have many `PersonEvent` records. Each record answers one bounded claim:

- who the record is about (`personId`)
- when it happened, including honest date precision
- what role the person had in that event
- the work and organizations involved
- query tags and kinds of historical significance
- evidence references and a claim-confidence label

People carry a separate `relationshipToFandom` value. This prevents “influential on
furry fandom” from silently becoming “was a furry.” The current values are:

- `fandom-member`
- `fandom-builder`
- `furry-creator`
- `influential-external-creator`

## Confidence

Claim confidence is not the same thing as source type:

- `primary`: the claim is directly supported by a primary source in the dataset.
- `well-attested`: multiple or unusually specific sources make the claim durable.
- `secondary`: a usable secondary-source claim that still merits corroboration.
- `needs-research`: a lead that must not be rendered as settled history.

The validator rejects `primary` confidence when no primary source backs the event.
The UI should expose both claim confidence and source type rather than collapsing them.

## Current boundary

The first slice is a historical spine, not a canon or ranking. It covers 1976–2024 and
is deliberately strongest in publishing, community infrastructure, archives, and early
online platforms. Performance, costuming, international scenes, social-media-era
creators, women and marginalized builders, and post-2014 history need dedicated source
passes before the corpus can claim broad coverage.

When expanding the corpus:

1. Add sources with stable URLs and locators where available.
2. Prefer one person per event; use matching event prefixes for shared work.
3. Preserve aliases without replacing the person's display name.
4. Mark uncertain prominence and membership claims `needs-research` instead of guessing.
5. Run the data validator and the full board test suite.

## MCP access

The public tool-only MCP endpoint is `/mcp`; `/api/mcp` remains an equivalent
compatibility path. It exposes standard read-only `search` and `fetch` tools so
people and person-events can be used as a citation-friendly knowledge source.

`prepare_furry_history_feedback` validates a correction or recollection and
returns a prefilled review email. It does not send, store, or publish feedback.
That boundary must remain explicit until the project has an abuse-resistant,
consent-aware submission store and a persistence test.
