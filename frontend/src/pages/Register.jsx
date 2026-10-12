// Register.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Auth.css";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Register", form.name, form.email); // backend comes later
  };

  return (
    <section className="page auth">
      <form className="glass-card auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Create your account</h1>
        <input
          className="field"
          name="name"
          type="text"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />
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
          minLength={8}
          required
        />
        <p className="muted small">Use at least 8 characters.</p>
        <button className="btn btn-primary" type="submit">
          Create account
        </button>
        <p className="muted">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </section>
  );
}

export default Register;
