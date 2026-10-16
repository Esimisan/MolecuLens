import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/Header.css";

// The sections whose last-visited URL (path + query) we remember.
const SECTIONS = ["/ligands", "/proteins", "/compare"];
const MEMORY_KEY = "moleculens.lastNav.v1";

function loadLast() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(MEMORY_KEY) || "{}");
    const out = {};
    for (const section of SECTIONS) {
      // Only trust values that really belong to that section.
      if (
        typeof parsed[section] === "string" &&
        parsed[section].startsWith(section)
      ) {
        out[section] = parsed[section];
      }
    }
    return out;
  } catch {
    return {};
  }
}

function Header({ onOpenSaved }) {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // e.g. { "/ligands": "/ligands?q=aspirin", "/proteins": "/proteins?id=4HHB" }
  const [last, setLast] = useState(loadLast);

  // Each time the URL changes inside a section, remember it.
  useEffect(() => {
    if (!SECTIONS.includes(location.pathname)) return;
    const url = location.pathname + location.search;
    setLast((prev) =>
      prev[location.pathname] === url
        ? prev
        : { ...prev, [location.pathname]: url },
    );
  }, [location.pathname, location.search]);

  // Keep the memory for this browser tab (survives refresh, cleared when the tab closes).
  useEffect(() => {
    try {
      sessionStorage.setItem(MEMORY_KEY, JSON.stringify(last));
    } catch {
      /* storage unavailable: the memory just lasts until refresh */
    }
  }, [last]);

  // Where a nav link should go: the remembered URL, or the bare section.
  const target = (section) => last[section] || section;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  }

  return (
    <header className="header">
      <Link to="/" className="wordmark" aria-label="MolecuLens home">
        <span className="wordmark-text">
          <span>Molecu</span>
          <span className="wordmark-light">Lens</span>
        </span>
        <img
          src="/header-logo.png"
          alt=""
          className="wordmark-logo"
          draggable="false"
        />
      </Link>
      <nav className="nav">
        <NavLink to={target("/ligands")} className="nav-link">
          Ligands
        </NavLink>
        <NavLink to={target("/proteins")} className="nav-link">
          Proteins
        </NavLink>
        <NavLink to={target("/compare")} className="nav-link">
          Compare
        </NavLink>
        <button className="nav-link nav-button" onClick={onOpenSaved}>
          Saved
        </button>

        {/* While the server is answering, show placeholders so the layout doesn't jump */}
        {status !== "ready" ? (
          <span className="nav-auth-skeleton" aria-hidden="true">
            <span className="skeleton skeleton-pill" />
            <span className="skeleton skeleton-pill" />
          </span>
        ) : user ? (
          <>
            <span className="nav-user">{user.name}</span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleLogout}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline">
              Log in
            </Link>
            <Link to="/register" className="btn btn-primary">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;
