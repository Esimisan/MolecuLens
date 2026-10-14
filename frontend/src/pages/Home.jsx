import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MoleculeHero from "../components/MoleculeHero";
import "../styles/Home.css";
import useAuth from "../hooks/useAuth.js";

const MODES = {
  ligand: {
    path: "/ligands",
    placeholder: "Search a compound, e.g. aspirin",
    examples: [
      { label: "Aspirin", q: "aspirin" },
      { label: "Caffeine", q: "caffeine" },
      { label: "Ibuprofen", q: "ibuprofen" },
      { label: "Glucose", q: "glucose" },
    ],
  },
  protein: {
    path: "/proteins",
    placeholder: "Search a protein name or PDB ID, e.g. 4EY7",
    examples: [
      { label: "4EY7 · Acetylcholinesterase", q: "4EY7" },
      { label: "1HSG · HIV-1 protease", q: "1HSG" },
      { label: "1A3N · Hemoglobin", q: "1A3N" },
      { label: "1LYZ · Lysozyme", q: "1LYZ" },
    ],
  },
};

function Home() {
  const [mode, setMode] = useState("ligand");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user, greeting } = useAuth();
  const current = MODES[mode];

  const goSearch = (term) => {
    if (!term.trim()) return;
    navigate(`${current.path}?q=${encodeURIComponent(term.trim())}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    goSearch(query);
  };

  return (
    <section className="home">
      <div className="hero">
        <MoleculeHero />
        <div className="hero-content">
          {user && greeting && <p className="hero-greeting">{greeting}</p>}
          <p className="eyebrow">MolecuLens / PubChem + RCSB PDB</p>
          <h1 className="hero-title">
            Explore
            <br />
            Molecules
          </h1>

          <div className="mode-toggle" role="tablist">
            {Object.keys(MODES).map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={mode === key}
                className={`mode-option ${mode === key ? "mode-option-active" : ""}`}
                onClick={() => setMode(key)}
              >
                {key === "ligand" ? "Ligand" : "Protein"}
              </button>
            ))}
          </div>

          <form className="search" onSubmit={handleSubmit}>
            <input
              className="search-input"
              type="text"
              placeholder={current.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search"
            />
            <button className="search-button" type="submit" aria-label="Search">
              →
            </button>
          </form>

          <div className="chips">
            <span className="eyebrow">Try</span>
            {current.examples.map((ex) => (
              <button
                key={ex.q}
                className="chip"
                onClick={() => goSearch(ex.q)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card guide">
        <p className="eyebrow">01 / Guide</p>
        <h2 className="guide-title">How it works</h2>
        <ol className="guide-list">
          <li>Pick Ligand or Protein and search by name or ID.</li>
          <li>
            View structures, SMILES and other identifiers, and all available
            data.
          </li>
          <li>Download structure files and compare entries side by side.</li>
          <li>Save favourites to your account.</li>
        </ol>
      </div>
    </section>
  );
}

export default Home;
