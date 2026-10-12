import { useSearchParams } from "react-router-dom";

function LigandExplorer() {
  const [params] = useSearchParams();
  const q = params.get("q");

  return (
    <section className="page">
      <p className="eyebrow">02 / Ligands · PubChem</p>
      <h1 className="page-title">Ligand Explorer</h1>
      <div className="glass-card">
        {q ? (
          <p>
            Searching PubChem for: <strong>{q}</strong>
          </p>
        ) : (
          <p className="muted">Search for a compound to begin.</p>
        )}
      </div>
    </section>
  );
}

export default LigandExplorer;
