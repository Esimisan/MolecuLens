import { Link, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/Header.css";

function Header({ onOpenSaved }) {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/");
    }
  }

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

        {/* Render nothing until we know who is logged in, to avoid a flash. */}
        {status === "ready" &&
          (user ? (
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
          ))}
      </nav>
    </header>
  );
}

export default Header;
