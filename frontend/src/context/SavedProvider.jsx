import { useCallback, useEffect, useMemo, useState } from "react";
import { SavedContext } from "./savedContext.js";
import useAuth from "../hooks/useAuth.js";
import {
  addSaved,
  listSaved,
  normalizeId,
  removeSaved,
} from "../services/saved.js";

const EMPTY = { ligand: [], protein: [] };

export function SavedProvider({ children }) {
  const { user, status: authStatus } = useAuth();

  // Who do the saved items belong to?
  //   null    = still waiting to find out who is logged in
  //   "guest" = nobody is logged in (nothing is ever saved for guests)
  //   user id = a logged-in account
  const ownerKey = authStatus === "ready" ? (user?.id ?? "guest") : null;

  const [owner, setOwner] = useState(ownerKey);
  const [items, setItems] = useState(EMPTY);
  const [status, setStatus] = useState(
    ownerKey === "guest" ? "ready" : "loading", // loading | ready | error
  );

  // When the owner changes (login / logout), clear the old user's items right
  // away so they never flash on screen. Guests have nothing to load, so they
  // are "ready" immediately; accounts wait for the effect below.
  if (owner !== ownerKey) {
    setOwner(ownerKey);
    setItems(EMPTY);
    setStatus(ownerKey === "guest" ? "ready" : "loading");
  }

  useEffect(() => {
    // Nothing to fetch while we don't know who it is, or for guests.
    if (!ownerKey || ownerKey === "guest") return;
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
  }, [ownerKey]);

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
