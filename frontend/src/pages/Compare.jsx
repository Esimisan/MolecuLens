import { useSearchParams } from "react-router-dom";
import CompareSlot from "../components/CompareSlot";
import CompareTable from "../components/CompareTable";
import useCompareItem from "../hooks/useCompareItem";
import { ligandRows, proteinRows } from "../services/compare";
import "../styles/Compare.css";

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") === "protein" ? "protein" : "ligand";
  const a = (params.get("a") || "").trim();
  const b = (params.get("b") || "").trim();

  const stateA = useCompareItem(type, a);
  const stateB = useCompareItem(type, b);

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    setParams(next);
  }
  const setType = (t) => t !== type && setParams({ type: t }); // switching mode clears both slots
  const swap = () => update({ a: b, b: a });

  const ready = stateA.status === "success" && stateB.status === "success";
  const rows = ready
    ? type === "protein"
      ? proteinRows(stateA.item, stateB.item)
      : ligandRows(stateA.item, stateB.item)
    : [];

  return (
    <main className="page compare">
      <header className="compare-head">
        <div>
          <p className="eyebrow">05 / Compare</p>
          <h1 className="compare-title">Side by side</h1>
        </div>
        <div className="compare-controls">
          {["ligand", "protein"].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              className={type === t ? "btn" : "btn btn-outline"}
              onClick={() => setType(t)}
            >
              {t === "ligand" ? "Ligands" : "Proteins"}
            </button>
          ))}
          {(a || b) && (
            <button type="button" className="btn btn-outline" onClick={swap}>
              Swap
            </button>
          )}
        </div>
      </header>

      <div className="compare-slots">
        <CompareSlot
          type={type}
          side="A"
          query={a}
          state={stateA}
          onPick={(v) => update({ a: v })}
          onClear={() => update({ a: "" })}
        />
        <CompareSlot
          type={type}
          side="B"
          query={b}
          state={stateB}
          onPick={(v) => update({ b: v })}
          onClear={() => update({ b: "" })}
        />
      </div>

      {ready ? (
        <CompareTable
          rows={rows}
          labelA={stateA.item.name}
          labelB={stateB.item.name}
        />
      ) : (
        <p className="compare-empty-hint">
          Pick two {type === "protein" ? "proteins" : "ligands"} to see their
          properties compared.
        </p>
      )}
    </main>
  );
}
