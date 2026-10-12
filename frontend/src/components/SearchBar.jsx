import { useEffect, useState } from "react";
import "../styles/SearchBar.css";

export default function SearchBar({
  initialValue = "",
  placeholder,
  suggestions = [],
  onSearch,
}) {
  const [value, setValue] = useState(initialValue);

  // keep the input in sync when the URL's ?q= changes (chips, back button)
  useEffect(() => setValue(initialValue), [initialValue]);

  function handleSubmit(e) {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  }

  return (
    <div className="searchbar">
      <form className="searchbar-form" onSubmit={handleSubmit}>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <button className="btn" type="submit">
          Search
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="searchbar-chips">
          <span className="eyebrow">Try</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              onClick={() => onSearch(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
