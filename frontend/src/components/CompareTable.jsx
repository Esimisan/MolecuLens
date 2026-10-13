import { useState } from "react";
import "../styles/CompareTable.css";

const isDiff = (r) => r.a.text !== r.b.text;

function delta(r) {
  if (!r.numeric || r.a.n == null || r.b.n == null || r.a.n === r.b.n)
    return null;
  const d = r.b.n - r.a.n;
  const s = Math.abs(d)
    .toFixed(2)
    .replace(/\.?0+$/, "");
  return `${d > 0 ? "+" : "−"}${s}`;
}

export default function CompareTable({ rows, labelA, labelB }) {
  const [diffOnly, setDiffOnly] = useState(false);
  const withDiff = rows.map((r) => ({ ...r, diff: isDiff(r) }));
  const count = withDiff.filter((r) => r.diff).length;
  const shown = diffOnly ? withDiff.filter((r) => r.diff) : withDiff;

  return (
    <section
      className="compare-table glass-card"
      aria-label="Property comparison"
    >
      <div className="compare-table-top">
        <div>
          <p className="eyebrow">Properties</p>
          <p className="compare-table-count">
            {count} of {rows.length} differ
          </p>
        </div>
        <button
          type="button"
          aria-pressed={diffOnly}
          className={
            diffOnly ? "btn compare-btn-sm" : "btn btn-outline compare-btn-sm"
          }
          onClick={() => setDiffOnly((v) => !v)}
        >
          Differences only
        </button>
      </div>

      <div className="compare-row compare-row--head">
        <div className="compare-label" />
        <div className="compare-value compare-value--head">{labelA}</div>
        <div className="compare-value compare-value--head">{labelB}</div>
      </div>

      {shown.map((r) => {
        const d = delta(r);
        const cls = `compare-value${r.mono ? " compare-value--mono" : ""}`;
        return (
          <div key={r.key} className={`compare-row${r.diff ? " is-diff" : ""}`}>
            <div className="compare-label">{r.label}</div>
            <div className={cls} data-side="A">
              {r.a.text ?? "—"}
            </div>
            <div className={cls} data-side="B">
              {r.b.text ?? "—"}
              {d && (
                <span className="compare-delta" title="B minus A">
                  {d} vs A
                </span>
              )}
            </div>
          </div>
        );
      })}

      {shown.length === 0 && (
        <p className="compare-table-empty">
          No differences in these properties.
        </p>
      )}
    </section>
  );
}
