import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import CopyButton from "../components/CopyButton";
import { Loading, EmptyState, ErrorMessage } from "../components/StatusViews";
import {
  getCompound,
  imageUrl,
  sdfDownloadUrl,
  pubchemPageUrl,
} from "../services/pubchem";
import "../styles/LigandExplorer.css";
import StructureViewer from "../components/StructureViewer.jsx";
import SaveButton from "../components/SaveButton.jsx";

const SUGGESTIONS = ["aspirin", "caffeine", "ibuprofen", "glucose"];
const SYNONYMS_PREVIEW = 12;

const fmt = (v, unit = "") =>
  v === null || v === undefined || v === "" ? "—" : `${v}${unit}`;

export default function LigandExplorer() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";

  const [state, setState] = useState({
    status: q ? "loading" : "idle",
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = useState(0); // bump to retry the same query

  useEffect(() => {
    if (!q) {
      setState({ status: "idle", data: null, error: null });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: null });

    getCompound(q, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err) => {
        if (err.name === "AbortError") return; // a newer search replaced this one
        setState(
          err.kind === "not-found"
            ? { status: "empty", data: null, error: null }
            : { status: "error", data: null, error: err },
        );
      });

    return () => controller.abort();
  }, [q, attempt]);

  const search = (term) => setParams({ q: term });

  return (
    <main className="page ligand-page">
      <header className="ligand-head">
        <p className="eyebrow">01 / Ligands</p>
        <h1>Ligand Explorer</h1>
        <p className="ligand-sub">
          Search PubChem by compound name or CID to see its structure,
          identifiers and properties.
        </p>
      </header>

      <SearchBar
        initialValue={q}
        placeholder="Compound name or CID, e.g. aspirin or 2244"
        suggestions={SUGGESTIONS}
        onSearch={search}
      />

      <section className="ligand-results" aria-live="polite">
        {state.status === "loading" && (
          <Loading label={`Searching PubChem for “${q}”…`} />
        )}

        {state.status === "empty" && (
          <EmptyState
            title={`No compound found for “${q}”`}
            message="Check the spelling, or try a common name, a synonym, or a PubChem CID."
          />
        )}

        {state.status === "error" && (
          <ErrorMessage
            message={state.error?.message}
            onRetry={() => setAttempt((n) => n + 1)}
          />
        )}

        {state.status === "success" && <CompoundView c={state.data} />}
      </section>
    </main>
  );
}

function CompoundView({ c }) {
  const [showAll, setShowAll] = useState(false);

  const identifiers = [
    { label: "IUPAC name", value: c.iupacName },
    { label: "Canonical SMILES", value: c.canonicalSmiles },
    { label: "Isomeric SMILES", value: c.isomericSmiles },
    { label: "InChI", value: c.inchi },
    { label: "InChIKey", value: c.inchiKey },
    { label: "PubChem CID", value: String(c.cid) },
  ].filter((i) => i.value);

  const properties = [
    ["Molecular formula", fmt(c.formula)],
    ["Molecular weight", fmt(c.weight, " g/mol")],
    ["Exact mass", fmt(c.exactMass, " Da")],
    ["XLogP", fmt(c.xlogp)],
    ["TPSA", fmt(c.tpsa, " Å²")],
    ["Complexity", fmt(c.complexity)],
    ["H-bond donors", fmt(c.hbd)],
    ["H-bond acceptors", fmt(c.hba)],
    ["Rotatable bonds", fmt(c.rotatableBonds)],
    ["Heavy atoms", fmt(c.heavyAtoms)],
    ["Charge", fmt(c.charge)],
  ];

  const synonyms = c.synonyms.slice(0, 100);
  const visible = showAll ? synonyms : synonyms.slice(0, SYNONYMS_PREVIEW);

  return (
    <div className="compound">
      <div className="compound-top">
        <div className="glass-card compound-image">
          <img
            src={imageUrl(c.cid)}
            alt={`2D structure of ${c.title}`}
            width="500"
            height="500"
          />
        </div>

        <div className="glass-card compound-summary">
          <p className="eyebrow">Compound</p>
          <h2>{c.title}</h2>
          <p className="compound-formula">{fmt(c.formula)}</p>
          <p className="compound-meta">
            {fmt(c.weight, " g/mol")} · CID {c.cid}
          </p>
          <div className="compound-actions">
            <a className="btn" href={sdfDownloadUrl(c.cid)}>
              Download SDF
            </a>
            <SaveButton
              type="ligand"
              id={c.cid}
              title={c.title}
              subtitle={c.formula}
            />
            <a
              className="btn btn-outline"
              href={pubchemPageUrl(c.cid)}
              target="_blank"
              rel="noreferrer"
            >
              View on PubChem
            </a>
          </div>
        </div>
      </div>

      <section className="glass-card compound-section">
        <p className="eyebrow">02 / Identifiers</p>
        <ul className="id-list">
          {identifiers.map((i) => (
            <li key={i.label} className="id-row">
              <div className="id-text">
                <span className="id-label">{i.label}</span>
                <code className="id-value">{i.value}</code>
              </div>
              <CopyButton value={i.value} label={`Copy ${i.label}`} />
            </li>
          ))}
        </ul>
      </section>

      <StructureViewer kind="ligand" cid={c.cid} />

      <section className="glass-card compound-section">
        <p className="eyebrow">03 / Computed properties</p>
        <dl className="prop-grid">
          {properties.map(([label, value]) => (
            <div key={label} className="prop">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {synonyms.length > 0 && (
        <section className="glass-card compound-section">
          <p className="eyebrow">04 / Synonyms</p>
          <ul className="synonyms">
            {visible.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {synonyms.length > SYNONYMS_PREVIEW && (
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer" : `Show all ${synonyms.length}`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
