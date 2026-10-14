// Register.jsx
import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import "../styles/Auth.css";

function Register() {
  const { user, status, register } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;
  const destination = from
    ? `${from.pathname}${from.search || ""}${from.hash || ""}`
    : "/";

  if (status === "ready" && user) {
    return <Navigate to={destination} replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
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
        <h1 className="auth-title">Create your account</h1>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <input
          className={`field${errors.name ? " field--invalid" : ""}`}
          name="name"
          type="text"
          placeholder="Name"
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "reg-name-error" : undefined}
          required
        />
        {errors.name && (
          <p id="reg-name-error" className="field-error">
            {errors.name}
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
          aria-describedby={errors.email ? "reg-email-error" : undefined}
          required
        />
        {errors.email && (
          <p id="reg-email-error" className="field-error">
            {errors.email}
          </p>
        )}

        <input
          className={`field${errors.password ? " field--invalid" : ""}`}
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "reg-password-error" : "reg-password-hint"
          }
          minLength={8}
          required
        />
        {errors.password ? (
          <p id="reg-password-error" className="field-error">
            {errors.password}
          </p>
        ) : (
          <p id="reg-password-hint" className="muted small">
            Use at least 8 characters.
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="muted">
          Already have an account?{" "}
          <Link to="/login" state={location.state}>
            Log in
          </Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
