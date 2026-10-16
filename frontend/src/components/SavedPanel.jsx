import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { useSaved } from "../hooks/useSaved.js";
import "../styles/SavedPanel.css";

const FOOTER_TEXT = "Saved to your account.";

const TABS = [
  { type: "ligand", label: "Ligands" },
  { type: "protein", label: "Proteins" },
];

function thumbUrl(type, id) {
  if (type === "ligand") {
    return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${id}/PNG?image_size=small`;
  }
  const pdb = id.toLowerCase();
  return `https://cdn.rcsb.org/images/structures/${pdb.slice(1, 3)}/${pdb}/${pdb}_assembly-1.jpeg`;
}

function hrefFor(type, id) {
  return type === "ligand"
    ? `/ligands?q=${encodeURIComponent(id)}`
    : `/proteins?id=${encodeURIComponent(id)}`;
}

function Thumb({ type, id }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="saved-item__thumb">
      {broken ? (
        <span className="saved-item__thumb-fallback" aria-hidden="true">
          {type === "ligand" ? "⬡" : "◎"}
        </span>
      ) : (
        <img
          src={thumbUrl(type, id)}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
    </span>
  );
}

export default function SavedPanel({ open, onClose }) {
  const { user, status: authStatus } = useAuth();
  const { items, status, remove } = useSaved();
  const [tab, setTab] = useState("ligand");
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const list = items[tab];

  return (
    <div className="saved-overlay" onClick={onClose}>
      <aside
        ref={panelRef}
        className="saved-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="saved-panel__header">
          <div>
            <p className="eyebrow">Library</p>
            <h2 id="saved-title" className="saved-panel__title">
              Saved
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close saved panel"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {authStatus !== "ready" ? (
          <div className="saved-panel__body">
            <p className="saved-panel__note">Loading…</p>
          </div>
        ) : !user ? (
          <div className="saved-panel__body">
            <div className="saved-empty">
              <p className="saved-empty__title">
                Log in to see your saved items
              </p>
              <p className="saved-panel__note">
                Saved ligands and proteins live in your account, so you can
                reach them from any device.
              </p>
              <div className="saved-panel__actions">
                <Link className="btn btn-primary" to="/login" onClick={onClose}>
                  Log in
                </Link>
                <Link
                  className="btn btn-outline"
                  to="/register"
                  onClick={onClose}
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="saved-tabs" role="tablist" aria-label="Saved type">
              {TABS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={tab === type}
                  className={`saved-tab${tab === type ? " is-active" : ""}`}
                  onClick={() => setTab(type)}
                >
                  {label}
                  <span className="saved-tab__count">{items[type].length}</span>
                </button>
              ))}
            </div>

            <div className="saved-panel__body" role="tabpanel">
              {status === "loading" && (
                <p className="saved-panel__note">Loading…</p>
              )}
              {status === "error" && (
                <p className="saved-panel__note">
                  Couldn’t load your saved items. Reload the page to try again.
                </p>
              )}
              {status === "ready" && list.length === 0 && (
                <div className="saved-empty">
                  <p className="saved-empty__title">
                    No saved {tab === "ligand" ? "ligands" : "proteins"} yet
                  </p>
                  <p className="saved-panel__note">
                    Use the Save button on{" "}
                    {tab === "ligand" ? "a ligand" : "a protein"} to keep it
                    here.
                  </p>
                  <Link
                    className="btn btn-outline"
                    to={tab === "ligand" ? "/ligands" : "/proteins"}
                    onClick={onClose}
                  >
                    Open {tab === "ligand" ? "Ligand" : "Protein"} Explorer
                  </Link>
                </div>
              )}
              {status === "ready" && list.length > 0 && (
                <ul className="saved-list">
                  {list.map((item) => (
                    <li key={item.id} className="saved-item">
                      <Thumb type={item.type} id={item.id} />
                      <Link
                        className="saved-item__body"
                        to={hrefFor(item.type, item.id)}
                        onClick={onClose}
                      >
                        <span className="saved-item__title">
                          {item.title || item.id}
                        </span>
                        {item.subtitle && (
                          <span className="saved-item__sub">
                            {item.subtitle}
                          </span>
                        )}
                        <span className="saved-item__id">
                          {item.type === "ligand" ? `CID ${item.id}` : item.id}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="icon-button saved-item__remove"
                        aria-label={`Remove ${item.title || item.id}`}
                        onClick={() => remove(item.type, item.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="saved-panel__footer">{FOOTER_TEXT}</footer>
          </>
        )}
      </aside>
    </div>
  );
}
