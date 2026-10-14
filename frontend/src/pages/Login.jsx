// Login.jsx
import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/Auth.css";

function Login() {
  const { user, status, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({}); // per-field messages
  const [formError, setFormError] = useState(""); // general message
  const [busy, setBusy] = useState(false);

  // Where to go after logging in: the page the user came from, else Home.
  const from = location.state?.from;
  const destination = from
    ? `${from.pathname}${from.search || ""}${from.hash || ""}`
    : "/";

  // Already logged in (or just became logged in): leave this page.
  if (status === "ready" && user) {
    return <Navigate to={destination} replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear the error for the field being edited.
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setFormError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErrors({ email: "Enter a valid email address." });
      setBusy(false);
      return;
    }
    try {
      await login(form.email.trim(), form.password);
      // Success: `user` is now set, so the <Navigate> above takes over.
    } catch (err) {
      const fields = err.fields ?? {};
      setErrors(fields);
      setFormError(
        Object.keys(fields).length
          ? ""
          : err.message || "Something went wrong. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <section className="page auth">
      <form className="glass-card auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-title">Log in</h1>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <input
          className={`field${errors.email ? " field--invalid" : ""}`}
          name="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          required
        />
        {errors.email && (
          <p id="login-email-error" className="field-error">
            {errors.email}
          </p>
        )}

        <input
          className={`field${errors.password ? " field--invalid" : ""}`}
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "login-password-error" : undefined
          }
          required
        />
        {errors.password && (
          <p id="login-password-error" className="field-error">
            {errors.password}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="muted">
          No account?{" "}
          <Link to="/register" state={location.state}>
            Sign up
          </Link>
        </p>
      </form>
    </section>
  );
}

export default Login;
