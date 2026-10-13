import { useEffect, useState } from "react";
import { loadLigand, loadProtein } from "../services/compare";

const IDLE = { status: "idle", item: null, error: null };

export default function useCompareItem(type, query) {
  const [state, setState] = useState(
    query ? { ...IDLE, status: "loading" } : IDLE,
  );

  useEffect(() => {
    if (!query) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    setState({ status: "loading", item: null, error: null });
    const load = type === "protein" ? loadProtein : loadLigand;
    load(query)
      .then(
        (item) =>
          !cancelled && setState({ status: "success", item, error: null }),
      )
      .catch(
        (error) =>
          !cancelled && setState({ status: "error", item: null, error }),
      );
    return () => {
      cancelled = true;
    };
  }, [type, query]);

  return state;
}
