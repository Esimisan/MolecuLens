import { useState } from "react";
import { useSaved } from "../hooks/useSaved.js";
import "../styles/SaveButton.css";

export default function SaveButton({
  type,
  id,
  title,
  subtitle,
  compact = false,
}) {
  const { isSaved, toggle, status } = useSaved();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const saved = isSaved(type, id);
  const disabled = busy || status === "loading" || !id;

  async function handleClick() {
    if (disabled) return;
    setBusy(true);
    setFailed(false);
    const ok = await toggle({ type, id, title, subtitle });
    setFailed(!ok);
    setBusy(false);
  }

  const label = failed ? "Try again" : saved ? "Saved" : "Save";

  return (
    <button
      type="button"
      className={`btn btn-outline save-btn${saved ? " is-saved" : ""}${compact ? " save-btn--compact" : ""}`}
      aria-pressed={saved}
      aria-label={`Save ${title || id}`}
      disabled={disabled}
      onClick={handleClick}
    >
      <svg
        className="save-btn__icon"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M4 2.5h8a.5.5 0 0 1 .5.5v10.2a.3.3 0 0 1-.48.24L8 10.4l-4.02 3.04a.3.3 0 0 1-.48-.24V3a.5.5 0 0 1 .5-.5Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
