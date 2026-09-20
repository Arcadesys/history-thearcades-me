export default function HistoryHomePage() {
  return <main className="history-hub">
    <p className="history-hub__eyebrow">The Arcades / History</p>
    <h1>Small observatories of living history.</h1>
    <p className="history-hub__intro">Source-backed, openly unfinished projects for looking at communities, places, and the evidence they leave behind.</p>
    <hr className="history-hub__rule" />
    <section aria-labelledby="projects-heading">
      <h2 id="projects-heading">Projects</h2>
      <div className="history-project-grid">
        <article className="history-project-card">
          <div><h2>Furry History Board</h2><p>An interactive, source-backed observatory of furry history across print, conventions, online communities, and people.</p></div>
          <a href="/furry">Explore the board <span aria-hidden="true">→</span></a>
        </article>
        <article className="history-project-card">
          <div><h2>Cultural Weather Vane</h2><p>Music and news mapped together as cultural atmosphere across twelve sampled years.</p></div>
          <a href="/music">Explore the weather <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>
    <p className="history-hub__footer">Each project names its sources, preserves uncertainty, and remains open to correction.</p>
  </main>;
}
