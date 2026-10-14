import { lazy, Suspense, useEffect, useState } from "react";
import { fetchText } from "../services/http";
import { sdf3dUrl } from "../services/pubchem";
import "../styles/MolViewer.css";

const MolViewer = lazy(() => import("./MolViewer.jsx"));

// Ligands: fetch the 3D SDF ourselves (throttled, retried, cached) so we can
// tell "PubChem is busy" (503) apart from "no 3D conformer" (404), then hand
// the viewer a local blob URL.
function useLigandModel(kind, cid, attempt) {
  const [state, setState] = useState({ status: "loading", url: null });

  useEffect(() => {
    if (kind !== "ligand") return undefined;
    const controller = new AbortController();
    let objectUrl = null;
    setState({ status: "loading", url: null });

    fetchText(sdf3dUrl(cid), { signal: controller.signal })
      .then((text) => {
        if (!text || !text.trim()) {
          setState({ status: "none", url: null });
          return;
        }
        objectUrl = URL.createObjectURL(
          new Blob([text], { type: "chemical/x-mdl-sdfile" }),
        );
        setState({ status: "ready", url: objectUrl });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        if (err.kind === "not-found") setState({ status: "none", url: null });
        else if (err.kind === "network")
          setState({ status: "offline", url: null });
        else setState({ status: "busy", url: null });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, cid, attempt]);

  return state;
}

function ViewerMessage({ children, onRetry }) {
  return (
    <div className="mol-viewer">
      <div className="mol-viewer__status">
        <p>{children}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export default function StructureViewer({ kind, id, cid, compact = false }) {
  const [attempt, setAttempt] = useState(0);
  const model = useLigandModel(kind, cid, attempt);
  const retry = () => setAttempt((n) => n + 1);

  let body;
  if (kind === "protein") {
    body = (
      <Suspense fallback={<ViewerMessage>Loading viewer…</ViewerMessage>}>
        <MolViewer
          // Binary CIF from RCSB's model server: much smaller than .pdb/.cif
          url={`https://models.rcsb.org/${String(id).toLowerCase()}.bcif`}
          format="mmcif"
          isBinary
        />
      </Suspense>
    );
  } else if (model.status === "loading") {
    body = <ViewerMessage>Loading 3D structure…</ViewerMessage>;
  } else if (model.status === "none") {
    body = (
      <ViewerMessage>
        No 3D conformer is available for this compound.
      </ViewerMessage>
    );
  } else if (model.status === "busy") {
    body = (
      <ViewerMessage onRetry={retry}>
        PubChem is busy right now, so the 3D structure couldn’t load.
      </ViewerMessage>
    );
  } else if (model.status === "offline") {
    body = (
      <ViewerMessage onRetry={retry}>
        Couldn’t reach PubChem. Check your connection.
      </ViewerMessage>
    );
  } else {
    body = (
      <Suspense fallback={<ViewerMessage>Loading viewer…</ViewerMessage>}>
        <MolViewer url={model.url} format="sdf" isBinary={false} />
      </Suspense>
    );
  }

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

      {body}
    </section>
  );
}
