import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { STEPS } from "../data.js";
import { StatusBadge, PriorityBadge } from "../components/Badges.jsx";

export default function StudentDashboard() {
  const { reports } = useApp();
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState("");
  const [tracked, setTracked] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");

  const count = (s) => reports.filter((r) => r.status === s).length;
  const shown = reports.filter(
    (r) => (filter === "All" || r.status === filter) && r.title.toLowerCase().includes(q.toLowerCase())
  );

  const track = async () => {
    setTracked(null);
    setTrackError("");
    if (!trackId.trim()) {
      setTrackError("Enter a tracking ID first.");
      return;
    }
    try {
      const d = await api.get(`/api/track/${encodeURIComponent(trackId.trim())}`);
      setTracked(d.report);
    } catch (e) {
      setTrackError(e.message);
    }
  };

  return (
    <>
      <div className="row sp">
        <h2>My dashboard</h2>
        <Link className="btn a" to="/report">Report a problem</Link>
      </div>

      <div className="grid g3 sec">
        {STEPS.map((s) => (
          <div className="card" key={s}>
            <p className="muted">{s}</p>
            <p className="stat" style={{ marginTop: 8 }}>{count(s)}</p>
          </div>
        ))}
      </div>

      <div className="grid sec" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>My reports</h3>
          <input type="text" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my reports" />
          <div className="filters">
            {["All", ...STEPS].map((f) => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {reports.length === 0 && <p className="muted" style={{ padding: "14px 0" }}>You have not reported anything yet. Use &ldquo;Report a problem&rdquo; to start.</p>}
          {reports.length > 0 && shown.length === 0 && <p className="muted" style={{ padding: "14px 0" }}>No reports match. Try a different search or filter.</p>}
          {shown.map((r) => (
            <div className="item" key={r.id} onClick={() => navigate(`/report/${r.id}`)}>
              <div>
                <h3>{r.title}</h3>
                <p className="muted" style={{ fontSize: 14 }}>{r.building} &bull; {r.times[0]}</p>
              </div>
              <div className="row"><PriorityBadge priority={r.priority} /><StatusBadge status={r.status} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Track an anonymous report</h3>
          <p className="muted" style={{ margin: "8px 0 14px", fontSize: 14 }}>Enter the tracking ID you received.</p>
          <div className="f">
            <input type="text" value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="e.g. CS-7F3K9A" />
          </div>
          <button className="btn p" style={{ width: "100%" }} onClick={track}>Track report</button>
          {trackError && <p style={{ marginTop: 10, fontSize: 14, fontWeight: 700 }}>{trackError}</p>}
          {tracked && (
            <div style={{ marginTop: 14 }}>
              <h3>{tracked.title}</h3>
              <div className="row" style={{ marginTop: 8 }}>
                <StatusBadge status={tracked.status} />
                <PriorityBadge priority={tracked.priority} />
              </div>
              <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>{tracked.building} &bull; sent to {tracked.dept}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
