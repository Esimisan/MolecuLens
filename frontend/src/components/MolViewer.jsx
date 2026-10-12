import { useEffect, useRef, useState } from "react";
import "molstar/build/viewer/molstar.css";
import "../styles/MolViewer.css";

const WIDE_QUERY = "(min-width: 51.25em)";

// Module-level: guarantees only one Mol* instance exists at a time
// (StrictMode, fast navigation and breakpoint changes all queue up here).
let lastTeardown = Promise.resolve();

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function MolViewer({ url, format, isBinary = false }) {
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable | error
  const wide = useMediaQuery(WIDE_QUERY);

  // 1) Create the viewer (again if the breakpoint changes)
  useEffect(() => {
    let cancelled = false;
    const el = document.createElement("div");
    el.className = "mol-viewer__canvas";
    hostRef.current.appendChild(el);

    const creation = (async () => {
      await lastTeardown; // wait for any previous instance to die
      if (cancelled) return null;
      const { Viewer } = await import("molstar/lib/apps/viewer/app");
      if (cancelled) return null;

      const viewer = await Viewer.create(el, {
        layoutIsExpanded: false,
        layoutShowControls: wide, // phone: canvas + toolbar only
        layoutShowLeftPanel: wide,
        layoutShowSequence: wide,
        layoutShowLog: false,
        layoutShowRemoteState: false,
        layoutControlsDisplay: wide ? "reactive" : "portrait",
        viewportShowExpand: true, // fullscreen button
        viewportShowControls: true, // small toggle to open the panels
        viewportShowSettings: true,
        viewportShowSelectionMode: wide,
        viewportShowAnimation: false,
        pdbProvider: "rcsb",
      });

      if (cancelled) return viewer; // teardown below disposes it
      viewerRef.current = viewer;
      setEngineReady(true);
      return viewer;
    })().catch(() => {
      if (!cancelled) setStatus("error");
      return null;
    });

    return () => {
      cancelled = true;
      viewerRef.current = null;
      setEngineReady(false);
      lastTeardown = creation.then((viewer) => {
        try {
          viewer?.plugin.dispose();
        } catch {
          /* already gone */
        }
        el.remove();
      });
    };
  }, [wide]);

  // 2) (Re)load whenever the structure changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!engineReady || !viewer) return;

    let stale = false;
    const controller = new AbortController();
    setStatus("loading");

    (async () => {
      try {
        await viewer.plugin.clear();
        if (isBinary) {
          await viewer.loadStructureFromUrl(url, format, true);
        } else {
          const res = await fetch(url, { signal: controller.signal });
          if (res.status === 404) {
            if (!stale) setStatus("unavailable");
            return;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          if (stale) return;
          await viewer.loadStructureFromData(text, format);
        }
        if (!stale) setStatus("ready");
      } catch (err) {
        if (!stale && err.name !== "AbortError") setStatus("error");
      }
    })();

    return () => {
      stale = true;
      controller.abort();
    };
  }, [engineReady, url, format, isBinary]);

  return (
    <div className="mol-viewer">
      <div ref={hostRef} className="mol-viewer__host" />
      {status !== "ready" && (
        <div className="mol-viewer__status" role="status">
          {status === "loading" && <p>Loading 3D structure…</p>}
          {status === "unavailable" && (
            <p>No 3D conformer is available for this compound.</p>
          )}
          {status === "error" && (
            <p>
              Couldn’t load the 3D viewer. Check your connection and reload the
              page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
