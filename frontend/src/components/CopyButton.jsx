import { useState } from "react";
import "../styles/CopyButton.css";

export default function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard can be blocked (e.g. non-secure context); fail quietly
    }
  }

  return (
    <button
      type="button"
      className="copy-btn"
      onClick={handleCopy}
      aria-label={`${label} ${copied ? "(copied)" : ""}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
