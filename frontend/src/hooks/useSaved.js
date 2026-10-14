import { useContext } from "react";
import { SavedContext } from "../context/savedContext.js";

export function useSaved() {
  const ctx = useContext(SavedContext);
  if (!ctx) throw new Error("useSaved must be used inside <SavedProvider>");
  return ctx;
}
