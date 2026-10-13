import { lazy, Suspense } from "react";
import "../styles/MolViewer.css";

const MolViewer = lazy(() => import("./MolViewer.jsx"));

function sourceFor({ kind, id, cid }) {
  if (kind === "protein") {
    return {
      // Binary CIF from RCSB's model server: much smaller than .pdb/.cif
      url: `https://models.rcsb.org/${String(id).toLowerCase()}.bcif`,
      format: "mmcif",
      isBinary: true,
    };
  }
  return {
    // 3D conformer from PubChem (404 when none exists)
    url: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF?record_type=3d`,
    format: "sdf",
    isBinary: false,
  };
}

export default function StructureViewer({ kind, id, cid, compact = false }) {
  const source = sourceFor({ kind, id, cid });

  return (
    <section className="structure-viewer" aria-label="3D structure">
      <header className="structure-viewer__head">
        <span className="eyebrow">3D structure</span>
        <span className="structure-viewer__hint">
          {compact ? (
            <span>
              Drag to rotate · zoom with scroll or pinch · expand for full
              controls
            </span>
          ) : (
            <>
              <span className="hint-desktop">
                Drag to rotate · scroll to zoom · toolbar changes style
              </span>
              <span className="hint-touch">
                Drag to rotate · pinch to zoom · expand for full controls
              </span>
            </>
          )}
        </span>
        {kind === "protein" && (
          <a
            className="btn btn-outline structure-viewer__link"
            href={`https://www.rcsb.org/3d-view/${id}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in RCSB
          </a>
        )}
      </header>

      <Suspense
        fallback={
          <div className="mol-viewer">
            <div className="mol-viewer__status">
              <p>Loading viewer…</p>
            </div>
          </div>
        }
      >
        <MolViewer {...source} />
      </Suspense>
    </section>
  );
}
