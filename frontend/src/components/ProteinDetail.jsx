import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SequenceViewer from "./SequenceViewer";
import { Loading, EmptyState, ErrorMessage } from "./StatusViews";
import {
  getProtein,
  downloadUrls,
  rcsbPageUrl,
  assemblyImageUrl,
  uniprotUrl,
  prettyMethod,
  formatResolution,
} from "../services/rcsb";
import "../styles/ProteinDetail.css";

const fmt = (v, unit = "") =>
  v === null || v === undefined || v === "" ? "—" : `${v}${unit}`;
const fmtNum = (v, unit = "") =>
  typeof v === "number" ? `${v.toLocaleString()}${unit}` : "—";

export default function ProteinDetail({ id }) {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });

    getProtein(id, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState(
          err.kind === "not-found"
            ? { status: "empty", data: null, error: null }
            : { status: "error", data: null, error: err },
        );
      });

    return () => controller.abort();
  }, [id, attempt]);

  if (state.status === "loading")
    return <Loading label={`Loading PDB entry ${id}…`} />;
  if (state.status === "empty")
    return (
      <EmptyState
        title={`No PDB entry “${id}”`}
        message="Check the 4-character ID, or search by protein name or keyword instead."
      />
    );
  if (state.status === "error")
    return (
      <ErrorMessage
        message={state.error?.message}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );

  return <EntryView p={state.data} />;
}

function EntryView({ p }) {
  const [imgOk, setImgOk] = useState(true);
  const dl = downloadUrls(p.id);

  const stats = [
    ["Method", prettyMethod(p.method)],
    ["Resolution", formatResolution(p.resolution)],
    ["Released", fmt(p.releaseDate)],
    ["Deposited", fmt(p.depositDate)],
    ["Weight", fmtNum(p.weightKda, " kDa")],
    ["Residues", fmtNum(p.residueCount)],
    ["Atoms", fmtNum(p.atomCount)],
    ["Macromolecules", fmtNum(p.polymerEntityCount)],
    ["Bound ligands", fmtNum(p.nonpolymerEntityCount)],
    ["Classification", fmt(p.keywords)],
  ];

  return (
    <div className="pd">
      <div className="pd-top">
        {imgOk && (
          <div className="glass-card pd-image">
            <img
              src={assemblyImageUrl(p.id)}
              alt={`Assembly image of PDB entry ${p.id}`}
              onError={() => setImgOk(false)}
            />
          </div>
        )}

        <div className="glass-card pd-summary">
          <p className="eyebrow">PDB entry</p>
          <h2>{p.id}</h2>
          <p className="pd-title">{p.title}</p>
          <p className="pd-meta">
            {prettyMethod(p.method)} · {formatResolution(p.resolution)}
            {p.releaseDate ? ` · ${p.releaseDate.slice(0, 4)}` : ""}
          </p>
          <div className="pd-actions">
            <a className="btn" href={dl.pdb}>
              PDB file
            </a>
            <a className="btn btn-outline" href={dl.cif}>
              mmCIF
            </a>
            <a
              className="btn btn-outline"
              href={dl.fasta}
              target="_blank"
              rel="noreferrer"
            >
              FASTA
            </a>
            <a
              className="btn btn-outline"
              href={rcsbPageUrl(p.id)}
              target="_blank"
              rel="noreferrer"
            >
              View on RCSB
            </a>
          </div>
        </div>
      </div>

      <section className="glass-card pd-section">
        <p className="eyebrow">02 / Structure details</p>
        <dl className="pd-grid">
          {stats.map(([label, value]) => (
            <div key={label} className="pd-stat">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass-card pd-section">
        <p className="eyebrow">03 / Macromolecules</p>
        {p.polymers.length === 0 && (
          <p className="pd-note">No macromolecule details available.</p>
        )}
        <div className="pd-entities">
          {p.polymers.map((m) => (
            <article key={m.entityId} className="pd-entity">
              <div className="pd-entity-head">
                <h3>{m.description}</h3>
                <span className="pd-tag">{m.type}</span>
              </div>
              <dl className="pd-facts">
                <div>
                  <dt>Organism</dt>
                  <dd>{m.organisms.length ? m.organisms.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt>Chains</dt>
                  <dd>{m.chains.length ? m.chains.join(", ") : "—"}</dd>
                </div>
                <div>
                  <dt>Length</dt>
                  <dd>{fmtNum(m.length, " aa")}</dd>
                </div>
                <div>
                  <dt>Mass</dt>
                  <dd>{fmtNum(m.weightKda, " kDa")}</dd>
                </div>
                {m.uniprotIds.length > 0 && (
                  <div>
                    <dt>UniProt</dt>
                    <dd>
                      {m.uniprotIds.map((acc, i) => (
                        <span key={acc}>
                          {i > 0 && ", "}
                          <a
                            href={uniprotUrl(acc)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {acc}
                          </a>
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
              <SequenceViewer
                sequence={m.sequence}
                fastaHeader={`${p.id}_${m.entityId}|Chains ${m.chains.join(", ")}|${m.description}|${m.organisms[0] ?? "unknown"}`}
              />
            </article>
          ))}
        </div>
        {p.polymerEntityCount > p.polymers.length && (
          <p className="pd-note">
            Showing {p.polymers.length} of {p.polymerEntityCount}{" "}
            macromolecules. See the full list on RCSB.
          </p>
        )}
      </section>

      <section className="glass-card pd-section">
        <p className="eyebrow">04 / Bound ligands</p>
        {p.nonpolymers.length === 0 ? (
          <p className="pd-note">No bound ligands in this entry.</p>
        ) : (
          <ul className="pd-ligands">
            {p.nonpolymers.map((l) => (
              <li key={l.entityId} className="pd-ligand">
                <span className="pd-ligand-id">{l.compId}</span>
                <span className="pd-ligand-name">{l.name ?? "—"}</span>
                <span className="pd-ligand-meta">
                  {fmt(l.formula)} · {fmt(l.weight, " g/mol")}
                  {l.copies > 1 ? ` · ×${l.copies}` : ""}
                </span>
                <Link
                  className="btn btn-outline"
                  to={`/ligands?q=${encodeURIComponent(l.inchiKey || l.name || l.compId)}`}
                >
                  Open in Ligand Explorer
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.citation && (
        <section className="glass-card pd-section">
          <p className="eyebrow">05 / Citation</p>
          <p className="pd-cite-title">{p.citation.title}</p>
          <p className="pd-meta">
            {[p.citation.journal, p.citation.year].filter(Boolean).join(" · ")}
          </p>
          <div className="pd-actions">
            {p.citation.doi && (
              <a
                className="btn btn-outline"
                href={`https://doi.org/${p.citation.doi}`}
                target="_blank"
                rel="noreferrer"
              >
                DOI
              </a>
            )}
            {p.citation.pubmed && (
              <a
                className="btn btn-outline"
                href={`https://pubmed.ncbi.nlm.nih.gov/${p.citation.pubmed}/`}
                target="_blank"
                rel="noreferrer"
              >
                PubMed
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
