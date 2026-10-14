import { useState } from "react";
import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";
import StructureViewer from "./StructureViewer";
import "../styles/CompareSlot.css";
import SaveButton from "./SaveButton";

const PDB_ID = /^[0-9][A-Za-z0-9]{3}$/;
const SUGGESTIONS = {
  ligand: ["aspirin", "ibuprofen", "caffeine"],
  protein: ["4HHB", "1HHO", "1UBQ"],
};

function errorText(error, query, noun) {
  if (error?.kind === "not-found") return `No ${noun} found for "${query}".`;
  if (error?.kind === "network")
    return "Couldn't reach the server. Check your connection and try again.";
  return "Something went wrong while loading this. Try again or pick another.";
}

export default function CompareSlot({
  type,
  side,
  query,
  state,
  onPick,
  onClear,
}) {
  const [hint, setHint] = useState("");
  const noun = type === "protein" ? "protein" : "ligand";

  function handleSearch(value) {
    const v = (value || "").trim();
    if (!v) return;
    if (type === "protein" && !PDB_ID.test(v)) {
      setHint(
        "Enter a 4-character PDB ID such as 4HHB. To search by name, use the Protein Explorer.",
      );
      return;
    }
    setHint("");
    onPick(type === "protein" ? v.toUpperCase() : v);
  }

  // Empty slot: the dashed "add" card
  if (!query) {
    return (
      <section
        className="compare-slot compare-slot--empty"
        aria-label={`${noun} ${side}`}
      >
        <p className="eyebrow">
          {noun} {side}
        </p>
        <h2 className="compare-slot-title">Add a {noun} to compare</h2>
        <SearchBar
          placeholder={
            type === "protein" ? "PDB ID, e.g. 4HHB" : "Name, CID or InChIKey"
          }
          suggestions={SUGGESTIONS[type]}
          onSearch={handleSearch}
        />
        {hint && (
          <p className="compare-hint" role="alert">
            {hint}
          </p>
        )}
      </section>
    );
  }

  const { status, item, error } = state;
  const sub =
    item &&
    (type === "protein"
      ? [item.id, item.method, item.resolution && `${item.resolution} Å`]
          .filter(Boolean)
          .join(" · ")
      : [item.cid && `CID ${item.cid}`, item.formula]
          .filter(Boolean)
          .join(" · "));

  return (
    <section className="compare-slot" aria-label={`${noun} ${side}`}>
      <div className="compare-slot-head">
        <div>
          <p className="eyebrow">
            {noun} {side}
          </p>
          <h2 className="compare-slot-title">
            {status === "success" ? item.name : query}
          </h2>
          {sub && <p className="compare-slot-sub">{sub}</p>}
        </div>
        <div className="compare-slot-actions">
          {status === "success" && (
            <SaveButton
              compact
              type={type}
              id={type === "protein" ? item.id : item.cid}
              title={item.name}
              subtitle={sub}
            />
          )}
          <button
            type="button"
            className="btn btn-outline compare-btn-sm"
            onClick={onClear}
          >
            Change
          </button>
        </div>
      </div>

      {status === "loading" && (
        <p className="compare-status">Loading {query}…</p>
      )}
      {status === "error" && (
        <p className="compare-status compare-status--error" role="alert">
          {errorText(error, query, noun)}
        </p>
      )}

      {status === "success" && (
        <>
          <div className="compare-viewer">
            {type === "protein" ? (
              <StructureViewer
                key={item.id}
                kind="protein"
                id={item.id}
                compact
              />
            ) : item.cid ? (
              <StructureViewer
                key={item.cid}
                kind="ligand"
                cid={item.cid}
                compact
              />
            ) : (
              <p className="compare-status">No CID available for 3D.</p>
            )}
          </div>
          <Link
            className="compare-link"
            to={
              type === "protein"
                ? `/proteins?id=${item.id}`
                : `/ligands?q=${item.cid ?? query}`
            }
          >
            Open in {type === "protein" ? "Protein" : "Ligand"} Explorer →
          </Link>
        </>
      )}
    </section>
  );
}
