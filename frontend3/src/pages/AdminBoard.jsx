import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { STEPS, COLUMN_LABEL, DEPARTMENTS } from "../data.js";
import { PriorityBadge } from "../components/Badges.jsx";

export default function AdminBoard() {
  const { reports, moveReport, log } = useApp();
  const navigate = useNavigate();
  const [dept, setDept] = useState("IT");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [q, setQ] = useState("");

  const onDrop = (e, status) => {
    e.preventDefault();
    setOverCol(null);
    if (dragId !== null) moveReport(dragId, status);
    setDragId(null);
  };

  return (
    <>
      <div className="row sp">
        <h2>Admin board</h2>
        <div className="tabs">
          {DEPARTMENTS.map((d) => (
            <button key={d} className={dept === d ? "on" : ""} onClick={() => setDept(d)}>{d}</button>
          ))}
        </div>
      </div>

      <div className="f sec" style={{ maxWidth: 420, marginBottom: 0 }}>
        <input type="text" className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports on this board" />
      </div>

      <div className="board" style={{ marginTop: 16 }}>
        {STEPS.map((status) => {
          const items = reports.filter((r) => r.dept === dept && r.status === status && r.title.toLowerCase().includes(q.toLowerCase()));
          return (
            <div
              key={status}
              className={"col" + (overCol === status ? " over" : "")}
              onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => onDrop(e, status)}
            >
              <h3>{COLUMN_LABEL[status]}<span className="badge dept">{items.length}</span></h3>
              {items.map((r) => (
                <div
                  key={r.id}
                  className={"kc" + (dragId === r.id ? " drag" : "")}
                  draggable
                  onDragStart={() => setDragId(r.id)}
                  onDragEnd={() => setDragId(null)}
                >
                  <h3 style={{ cursor: "pointer" }} onClick={() => navigate(`/report/${r.id}`)}>{r.title}</h3>
                  <div className="row"><PriorityBadge priority={r.priority} /><span className="chip">{r.building}</span></div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="card sec">
        <h3 style={{ marginBottom: 8 }}>Audit log</h3>
        <ul className="log">
          {log.map((l, i) => (
            <li key={i}><b>{l.who}</b> {l.what} <span className="muted">&bull; {l.at}</span></li>
          ))}
        </ul>
      </div>
    </>
  );
}
