import { useCallback, useEffect, useMemo, useState } from "react";
import { SavedContext } from "./savedContext.js";
import {
  addSaved,
  listSaved,
  normalizeId,
  removeSaved,
} from "../services/saved.js";

const EMPTY = { ligand: [], protein: [] };

export function SavedProvider({ children }) {
  const [items, setItems] = useState(EMPTY);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let alive = true;
    listSaved()
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  // After a failed write, reload the truth from the adapter.
  const resync = useCallback(async () => {
    try {
      setItems(await listSaved());
    } catch {
      /* keep what we have */
    }
  }, []);

  const isSaved = useCallback(
    (type, id) => {
      const key = normalizeId(type, id);
      return (items[type] ?? []).some((i) => i.id === key);
    },
    [items],
  );

  // Optimistic: the UI updates first, the adapter call follows.
  const save = useCallback(
    async ({ type, id, title, subtitle }) => {
      const entry = {
        type,
        id: normalizeId(type, id),
        title: title || "",
        subtitle: subtitle || "",
        savedAt: Date.now(),
      };
      setItems((prev) =>
        prev[type].some((i) => i.id === entry.id)
          ? prev
          : { ...prev, [type]: [entry, ...prev[type]] },
      );
      try {
        await addSaved(entry);
        return true;
      } catch {
        await resync();
        return false;
      }
    },
    [resync],
  );

  const remove = useCallback(
    async (type, id) => {
      const key = normalizeId(type, id);
      setItems((prev) => ({
        ...prev,
        [type]: prev[type].filter((i) => i.id !== key),
      }));
      try {
        await removeSaved(type, key);
        return true;
      } catch {
        await resync();
        return false;
      }
    },
    [resync],
  );

  const toggle = useCallback(
    (item) =>
      isSaved(item.type, item.id) ? remove(item.type, item.id) : save(item),
    [isSaved, remove, save],
  );

  const value = useMemo(
    () => ({ items, status, isSaved, save, remove, toggle }),
    [items, status, isSaved, save, remove, toggle],
  );

  return (
    <SavedContext.Provider value={value}>{children}</SavedContext.Provider>
  );
}
