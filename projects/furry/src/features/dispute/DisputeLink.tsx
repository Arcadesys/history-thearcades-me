import { buildDisputeIssueUrl, type DisputeTarget } from "@/lib/furry-history-mcp";
import { historyDataset } from "../../data/seed";

export const DISPUTE_DISCLOSURE = "Opens a public GitHub issue.";

export function makeDisputeTarget(
  kind: DisputeTarget["kind"],
  id: string,
  claim: string,
  sourceIds: readonly string[],
): DisputeTarget {
  return {
    kind,
    id,
    claim,
    sourceIds,
    datasetVersion: historyDataset.version,
    canonicalUrl: "https://history.thearcades.me/furry",
  };
}

export function DisputeLink({ target }: { readonly target: DisputeTarget }) {
  const href = buildDisputeIssueUrl(target, {
    feedback: "I would like to dispute or correct this claim.",
  });
  return <span className="dispute-action">
    <a className="dispute-link" href={href}>Dispute this</a>
    <span className="dispute-disclosure">{DISPUTE_DISCLOSURE}</span>
  </span>;
}
