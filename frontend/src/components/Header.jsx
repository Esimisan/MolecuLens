import { Link, NavLink } from "react-router-dom";

function Header({ onOpenSaved }) {
  return (
    <header className="header">
      <Link to="/" className="wordmark">
        <span>Molecu</span>
        <span className="wordmark-light">Lens</span>
      </Link>

      <nav className="nav">
        <NavLink to="/ligands" className="nav-link">
          Ligands
        </NavLink>
        <NavLink to="/proteins" className="nav-link">
          Proteins
        </NavLink>
        <NavLink to="/compare" className="nav-link">
          Compare
        </NavLink>
        <button className="nav-link nav-button" onClick={onOpenSaved}>
          Saved
        </button>
        <Link to="/login" className="btn btn-outline">
          Log in
        </Link>
        <Link to="/register" className="btn btn-primary">
          Sign up
        </Link>
      </nav>
    </header>
  );
}

export default Header;
