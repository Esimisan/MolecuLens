import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import SearchBar from "../components/SearchBar";
import ProteinDetail from "../components/ProteinDetail";
import { Loading, EmptyState, ErrorMessage } from "../components/StatusViews";
import {
  PDB_ID,
  searchEntries,
  getEntrySummaries,
  prettyMethod,
  formatResolution,
} from "../services/rcsb";
import "../styles/ProteinExplorer.css";

const SUGGESTIONS = ["hemoglobin", "insulin", "lysozyme", "4HHB"];
const PAGE = 10;

async function runSearch(q, start, signal) {
  const { ids, total } = await searchEntries(q, { rows: PAGE, start }, signal);
  const items = ids.length ? await getEntrySummaries(ids, signal) : [];
  return { items, total };
}

export default function ProteinExplorer() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const q = params.get("q")?.trim() ?? "";
  const id = params.get("id")?.trim().toUpperCase() ?? "";

  const [list, setList] = useState({
    status: "idle",
    items: [],
    total: 0,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const [moreState, setMoreState] = useState({ loading: false, error: null });
  const currentQ = useRef(q);

  // A PDB-ID-shaped query (from Home or the search bar) goes straight to the entry.
  useEffect(() => {
    if (!id && PDB_ID.test(q))
      setParams({ id: q.toUpperCase() }, { replace: true });
  }, [id, q, setParams]);

  // Keyword search
  useEffect(() => {
    currentQ.current = q;
    if (id || !q || PDB_ID.test(q)) {
      setList({ status: "idle", items: [], total: 0, error: null });
      return;
    }
    const controller = new AbortController();
    setList({ status: "loading", items: [], total: 0, error: null });
    setMoreState({ loading: false, error: null });

    runSearch(q, 0, controller.signal)
      .then(({ items, total }) =>
        setList({
          status: items.length ? "success" : "empty",
          items,
          total,
          error: null,
        }),
      )
      .catch((err) => {
        if (err.name === "AbortError") return;
        setList(
          err.kind === "not-found"
            ? { status: "empty", items: [], total: 0, error: null }
            : { status: "error", items: [], total: 0, error: err },
        );
      });

    return () => controller.abort();
  }, [q, id, attempt]);

  async function loadMore() {
    const requestedFor = q;
    setMoreState({ loading: true, error: null });
    try {
      const { items } = await runSearch(q, list.items.length);
      if (currentQ.current !== requestedFor) return; // user searched again meanwhile
      setList((prev) => ({ ...prev, items: [...prev.items, ...items] }));
      setMoreState({ loading: false, error: null });
    } catch (err) {
      setMoreState({ loading: false, error: err.message });
    }
  }

  const search = (term) =>
    PDB_ID.test(term)
      ? setParams({ id: term.toUpperCase() })
      : setParams({ q: term });

  const canGoBack = location.key !== "default";

  return (
    <main className="page protein-page">
      <header className="protein-head">
        <p className="eyebrow">01 / Proteins</p>
        <h1>Protein Explorer</h1>
        <p className="protein-sub">
          Search the RCSB Protein Data Bank by protein name, keyword or
          4-character PDB ID.
        </p>
      </header>

      <SearchBar
        initialValue={id || q}
        placeholder="Protein name or PDB ID, e.g. hemoglobin or 4HHB"
        suggestions={SUGGESTIONS}
        onSearch={search}
      />

      <section className="protein-results" aria-live="polite">
        {id && (
          <>
            {canGoBack && (
              <button
                type="button"
                className="link-btn protein-back"
                onClick={() => navigate(-1)}
              >
                ← Back to results
              </button>
            )}
            <ProteinDetail key={id} id={id} />
          </>
        )}

        {!id && list.status === "loading" && (
          <Loading label={`Searching the PDB for “${q}”…`} />
        )}

        {!id && list.status === "empty" && (
          <EmptyState
            title={`No structures found for “${q}”`}
            message="Try a broader keyword, a protein's common name, or a PDB ID."
          />
        )}

        {!id && list.status === "error" && (
          <ErrorMessage
            message={list.error?.message}
            onRetry={() => setAttempt((n) => n + 1)}
          />
        )}

        {!id && list.status === "success" && (
          <>
            <p className="protein-count">
              Showing {list.items.length.toLocaleString()} of{" "}
              {list.total.toLocaleString()} structures
            </p>
            <ul className="protein-list">
              {list.items.map((r) => (
                <li key={r.id}>
                  <Link
                    className="glass-card protein-card"
                    to={`/proteins?id=${r.id}`}
                  >
                    <span className="protein-card-id">{r.id}</span>
                    <span className="protein-card-title">{r.title}</span>
                    <span className="protein-card-meta">
                      {prettyMethod(r.method)} ·{" "}
                      {formatResolution(r.resolution)} · {r.year}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {list.items.length < list.total && (
              <div className="protein-more">
                <button
                  className="btn"
                  type="button"
                  onClick={loadMore}
                  disabled={moreState.loading}
                >
                  {moreState.loading ? "Loading…" : "Load more"}
                </button>
                {moreState.error && (
                  <p className="protein-more-error" role="alert">
                    {moreState.error}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
