import { useState } from "react";
import CopyButton from "./CopyButton";
import "../styles/SequenceViewer.css";

const BLOCK = 10;
const ROW = 50;
const PREVIEW_ROWS = 6;

export default function SequenceViewer({ sequence, fastaHeader }) {
  const [expanded, setExpanded] = useState(false);
  if (!sequence) return null;

  // split into rows of 50, each row into blocks of 10
  const rows = [];
  for (let i = 0; i < sequence.length; i += ROW) {
    const chunk = sequence.slice(i, i + ROW);
    const blocks = chunk.match(new RegExp(`.{1,${BLOCK}}`, "g"));
    rows.push({ start: i + 1, blocks });
  }

  const visible = expanded ? rows : rows.slice(0, PREVIEW_ROWS);
  const fasta = `>${fastaHeader}\n${sequence.match(/.{1,80}/g).join("\n")}`;

  return (
    <div className="seq">
      <div className="seq-head">
        <span className="seq-count">{sequence.length} residues</span>
        <CopyButton value={fasta} label="Copy FASTA" />
      </div>

      <div className="seq-body" role="region" aria-label="Sequence">
        {visible.map((row) => (
          <div className="seq-row" key={row.start}>
            <span className="seq-num">{row.start}</span>
            <span className="seq-blocks">
              {row.blocks.map((b, i) => (
                <span className="seq-block" key={i}>
                  {b}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      {rows.length > PREVIEW_ROWS && (
        <button
          type="button"
          className="link-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show full sequence (${rows.length} rows)`}
        </button>
      )}
    </div>
  );
}
