import { useSearchParams } from "react-router-dom";

function ProteinExplorer() {
  const [params] = useSearchParams();
  const q = params.get("q");

  return (
    <section className="page">
      <p className="eyebrow">03 / Proteins · RCSB PDB</p>
      <h1 className="page-title">Protein Explorer</h1>
      <div className="glass-card">
        {q ? (
          <p>
            Searching the PDB for: <strong>{q}</strong>
          </p>
        ) : (
          <p className="muted">Search for a protein or PDB ID to begin.</p>
        )}
      </div>
    </section>
  );
}

export default ProteinExplorer;
