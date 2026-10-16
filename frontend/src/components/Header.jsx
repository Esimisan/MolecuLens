import { useEffect, useRef, useState } from "react";
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

  // Phone menu: open/closed, plus a ref so focus can return to the button.
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);

  // Close the menu whenever the page changes (links, back/forward buttons).
  // Comparing against the previous location key resets state during render,
  // which avoids a flash of the open menu on the new page.
  const [menuKey, setMenuKey] = useState(location.key);
  if (menuKey !== location.key) {
    setMenuKey(location.key);
    setMenuOpen(false);
  }

  // Escape closes the menu and puts focus back on the hamburger button.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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

  // Any tap on a link or button inside the menu closes it.
  function handleNavClick(e) {
    if (e.target.closest("a, button")) setMenuOpen(false);
  }

  return (
    <>
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

        {/* Phones only (hidden by CSS on larger screens) */}
        <button
          ref={toggleRef}
          type="button"
          className={`menu-toggle${menuOpen ? " is-open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle__bar" aria-hidden="true" />
          <span className="menu-toggle__bar" aria-hidden="true" />
          <span className="menu-toggle__bar" aria-hidden="true" />
        </button>

        <nav
          id="site-nav"
          className={`nav${menuOpen ? " is-open" : ""}`}
          onClick={handleNavClick}
        >
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

          <div className="nav-auth">
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
          </div>
        </nav>
      </header>

      {/* Dims the page and catches outside taps. It sits outside <header> on purpose:
          the header's backdrop-filter would otherwise trap a fixed-position child. */}
      {menuOpen && (
        <div
          className="menu-backdrop"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}

export default Header;
