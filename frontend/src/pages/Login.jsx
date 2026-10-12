// Login.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Log in with", form.email); // backend comes in the auth phase
  };

  return (
    <section className="page auth">
      <form className="glass-card auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Log in</h1>
        <input
          className="field"
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="field"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button className="btn btn-primary" type="submit">
          Log in
        </button>
        <p className="muted">
          No account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </section>
  );
}

export default Login;
