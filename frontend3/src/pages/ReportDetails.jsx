import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { STEPS } from "../data.js";
import CampusMap from "../components/CampusMap.jsx";
import { StatusBadge, PriorityBadge, DeptBadge } from "../components/Badges.jsx";

export default function ReportDetails() {
  const { id } = useParams();
  const { reports, role } = useApp();
  const fromList = reports.find((r) => String(r.id) === id);
  const [fetched, setFetched] = useState(null);
  const [missing, setMissing] = useState(false);
  const back = role === "admin" ? "/board" : "/dashboard";

  // If the report is not in the loaded list yet, ask the backend for it
  useEffect(() => {
    if (fromList) return;
    api.get(`/api/reports/${id}`).then((d) => setFetched(d.report)).catch(() => setMissing(true));
  }, [id, fromList]);

  const report = fromList || fetched;

  if (!report) {
    return missing ? <p>Report not found. <Link to={back}>Go back</Link></p> : <p className="muted">Loading...</p>;
  }

  const current = STEPS.indexOf(report.status);

  return (
    <>
      <Link to={back}>&larr; Back</Link>
      <div className="row sp" style={{ margin: "12px 0 4px" }}>
        <h2>{report.title}</h2>
        <StatusBadge status={report.status} />
      </div>
      <div className="row" style={{ marginBottom: 20 }}>
        <PriorityBadge priority={report.priority} />
        <DeptBadge dept={report.dept} />
        <span className="chip">{report.building}{report.anonymous ? " \u2022 Anonymous" : report.reporter ? ` \u2022 ${report.reporter}` : ""}</span>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="grid">
          <div className="card"><h3>Complaint</h3><p style={{ marginTop: 8 }}>{report.desc}</p></div>
          <div className="card">
            <h3>Photo</h3>
            <div className="muted" style={{ marginTop: 10, minHeight: 120, borderRadius: 10, background: "var(--bg)", border: "2px dashed var(--ink)", display: "grid", placeItems: "center", padding: 8 }}>
              {report.photo ? <img src={report.photo} alt="Report" style={{ maxHeight: 220, maxWidth: "100%", borderRadius: 8 }} /> : "No photo attached"}
            </div>
          </div>
          <div className="card">
            <h3>AI result</h3>
            <div className="row" style={{ marginTop: 10 }}><PriorityBadge priority={report.priority} /><DeptBadge dept={report.dept} /></div>
          </div>
        </div>

        <div className="grid">
          <div className="card"><h3 style={{ marginBottom: 10 }}>Location</h3><CampusMap pin={report.pin} /></div>
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Status timeline</h3>
            <ul className="tl">
              {STEPS.map((s, i) => {
                const done = i < current || (i === current && s === "Fixed");
                const cur = i === current && !done;
                return (
                  <li key={s} className={done ? "done" : cur ? "cur" : ""}>
                    <b>{s}</b>
                    <p className="muted" style={{ fontSize: 14 }}>{report.times[i] || "Waiting"}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
