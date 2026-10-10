import { useApp } from "../context/AppContext.jsx";
import { STEPS, DEPARTMENTS } from "../data.js";

export default function Analytics() {
  const { reports } = useApp();

  const statusCount = (s) => reports.filter((r) => r.status === s).length;

  const byBuilding = {};
  reports.forEach((r) => { byBuilding[r.building] = (byBuilding[r.building] || 0) + 1; });
  const buildings = Object.keys(byBuilding).sort((a, b) => byBuilding[b] - byBuilding[a]);
  const max = byBuilding[buildings[0]] || 1;

  const byDept = {};
  DEPARTMENTS.forEach((d) => { byDept[d] = reports.filter((r) => r.dept === d).length; });
  const total = reports.length || 1;
  const a = Math.round((byDept.IT / total) * 360);
  const b = a + Math.round((byDept.Maintenance / total) * 360);
  const colors = { IT: "var(--pri)", Maintenance: "var(--acc)", Security: "var(--ok)" };

  return (
    <>
      <h2>Analytics</h2>

      <div className="grid g3 sec">
        {STEPS.map((s) => (
          <div className="card" key={s}>
            <p className="muted">{s}</p>
            <p className="stat" style={{ marginTop: 8 }}>{statusCount(s)}</p>
          </div>
        ))}
      </div>

      <div className="grid g2 sec" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Hotspots: reports by building</h3>
          {buildings.map((name) => (
            <div key={name} style={{ display: "grid", gridTemplateColumns: "90px 1fr 24px", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <span>{name}</span>
              <div><div className="bar" style={{ width: `${(byBuilding[name] / max) * 100}%` }} /></div>
              <b>{byBuilding[name]}</b>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Reports by department</h3>
          <div className="row" style={{ gap: 28 }}>
            <div
              className="dn"
              role="img"
              aria-label="Department split"
              style={{ background: `conic-gradient(var(--pri) 0 ${a}deg, var(--acc) ${a}deg ${b}deg, var(--ok) ${b}deg 360deg)` }}
            />
            <div className="grid" style={{ gap: 8 }}>
              {DEPARTMENTS.map((d) => (
                <span className="chip" key={d}>
                  <i style={{ width: 12, height: 12, borderRadius: 3, background: colors[d], display: "inline-block" }} />
                  {d}: {byDept[d]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
