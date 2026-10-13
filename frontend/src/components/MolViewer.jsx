import { useEffect, useRef, useState } from "react";
import "molstar/build/viewer/molstar.css";
import "../styles/MolViewer.css";

// Full Mol* panels only when the viewer's OWN box is at least this wide.
// (Container-based, so the half-width viewers on Compare get the compact layout too.)
const WIDE_MIN_REM = 45;

// Module-level: every new instance waits for ALL previous instances to be
// fully disposed before it is created (StrictMode, fast navigation, resizes,
// and Compare's two viewers unmounting together all queue up here).
let lastTeardown = Promise.resolve();

// null until the first measurement, then true/false
function useIsWide(ref, minRem) {
  const [wide, setWide] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rootPx =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const min = minRem * rootPx;
    const update = (width) => setWide(width >= min);
    update(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, minRem]);
  return wide;
}

export default function MolViewer({ url, format, isBinary = false }) {
  const wrapRef = useRef(null);
  const hostRef = useRef(null);
  const viewerRef = useRef(null);
  const [engineReady, setEngineReady] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable | error
  const wide = useIsWide(wrapRef, WIDE_MIN_REM);

  // 1) Create the viewer (again if the container crosses the width threshold)
  useEffect(() => {
    if (wide === null) return; // wait for the first measurement
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
        layoutShowControls: wide, // compact: canvas + toolbar only
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
      const teardown = creation.then((viewer) => {
        try {
          viewer?.plugin.dispose();
        } catch {
          /* already gone */
        }
        el.remove();
      });
      // chain (don't overwrite) so simultaneous unmounts are all awaited
      lastTeardown = Promise.all([lastTeardown, teardown]);
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
    <div className="mol-viewer" ref={wrapRef}>
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
