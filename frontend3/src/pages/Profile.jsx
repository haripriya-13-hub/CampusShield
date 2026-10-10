import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";

export default function Profile() {
  const { role, user, updateProfile, reports } = useApp();
  const [form, setForm] = useState({ name: user.name, department: user.department || "", year: user.year || "" });
  const [email, setEmail] = useState(true);
  const [anon, setAnon] = useState(false);
  const [msg, setMsg] = useState("");

  const change = (e) => { setMsg(""); setForm({ ...form, [e.target.name]: e.target.value }); };
  const initials = (form.name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const save = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(form);
      setMsg("Saved");
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <>
      <h2>Profile</h2>
      <div className="grid g2 sec" style={{ alignItems: "start" }}>
        <form className="card" onSubmit={save}>
          <div className="row" style={{ marginBottom: 20 }}>
            <div className="avatar">{initials}</div>
            <div>
              <h3>{form.name || "Your name"}</h3>
              <span className="badge dept" style={{ marginTop: 6 }}>{role === "admin" ? "Admin" : "Student"}</span>
            </div>
          </div>
          <div className="f"><label htmlFor="pn">Full name</label><input id="pn" name="name" type="text" value={form.name} onChange={change} required /></div>
          <div className="f"><label htmlFor="pe">Email</label><input id="pe" type="email" value={user.email} readOnly /></div>
          <div className="f"><label htmlFor="pd">Department</label><input id="pd" name="department" type="text" value={form.department} onChange={change} /></div>
          {role === "student" && (
            <div className="f"><label htmlFor="py">Year</label><input id="py" name="year" type="text" value={form.year} onChange={change} /></div>
          )}
          <button className="btn p" type="submit">Save changes</button>
          {msg && <span className="chip" style={{ marginLeft: 12 }}>{msg}</span>}
        </form>

        <div className="grid">
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Preferences</h3>
            <label className="row" style={{ fontWeight: 500 }}><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email me when a report status changes</label>
            {role === "student" && (
              <label className="row" style={{ fontWeight: 500, marginTop: 12 }}><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Report anonymously by default</label>
            )}
          </div>
          {role === "student" && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>My activity</h3>
              <p className="stat">{reports.length}</p>
              <p className="muted" style={{ marginTop: 6 }}>reports submitted</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
