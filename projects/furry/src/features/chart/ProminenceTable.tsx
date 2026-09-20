import type { ProminenceSeries } from "../../data/contracts";
import { DisputeLink, makeDisputeTarget } from "../dispute/DisputeLink";

export function ProminenceTable({ series }: { readonly series: readonly ProminenceSeries[] }) {
  return <div className="prominence-table-wrap"><table className="prominence-table"><caption>Evidence-backed prominence series and points</caption><thead><tr><th scope="col">Series</th><th scope="col">Year</th><th scope="col">Value</th><th scope="col">Confidence</th><th scope="col">Basis</th><th scope="col">Source IDs</th><th scope="col">Corrections</th></tr></thead><tbody>{series.flatMap((item) => item.points.map((point) => {
    const target = makeDisputeTarget("prominence-point", `${item.id}:${point.year}`, `${item.label}, ${point.year}: ${point.value} of 100 relative prominence. ${point.basis}`, point.sourceIds);
    return <tr key={`${item.id}-${point.year}`}><th scope="row">{item.label}</th><td>{point.year}</td><td>{point.value} <span className="nonliteral">nonliteral</span></td><td>{point.confidence}</td><td>{point.basis}</td><td>{point.sourceIds.join(", ")}</td><td><DisputeLink target={target} /></td></tr>;
  }))}</tbody></table></div>;
}
