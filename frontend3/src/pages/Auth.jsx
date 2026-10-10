import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useApp();

  const [tab, setTab] = useState(location.state?.tab || "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", admin_code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = tab === "register";

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = isRegister ? await register(form) : await login(form.email, form.password);
      navigate(user.role === "admin" ? "/board" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-grid">
      <div className="auth-art">
        <h2 className="grad-text">Your campus, safer and faster.</h2>
        <p>Report a problem, watch AI route it, and see it fixed.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <h2 style={{ marginBottom: 20 }}>{isRegister ? "Create account" : "Welcome back"}</h2>

        <div className="tabs" style={{ marginBottom: 20 }}>
          <button type="button" className={!isRegister ? "on" : ""} onClick={() => { setTab("login"); setError(""); }}>Login</button>
          <button type="button" className={isRegister ? "on" : ""} onClick={() => { setTab("register"); setError(""); }}>Register</button>
        </div>

        {error && <div className="warn" role="alert">{error}</div>}

        {isRegister && (
          <div className="f">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" value={form.name} onChange={change} placeholder="Your name" required />
          </div>
        )}
        <div className="f">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={change} placeholder="you@college.edu" required />
        </div>
        <div className="f">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={change} placeholder="At least 8 characters" minLength={8} required />
        </div>
        {isRegister && (
          <div className="f">
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={form.role} onChange={change}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        {isRegister && form.role === "admin" && (
          <div className="f">
            <label htmlFor="admin_code">Admin code</label>
            <input id="admin_code" name="admin_code" type="password" value={form.admin_code} onChange={change} placeholder="Ask your administrator" required />
          </div>
        )}
        <button className="btn p" style={{ width: "100%" }} type="submit" disabled={busy}>
          {busy ? "Please wait..." : isRegister ? "Create account" : "Login"}
        </button>
      </form>
    </div>
  );
}
