import { Link } from "react-router-dom";
import { StatusBadge, PriorityBadge, DeptBadge } from "../components/Badges.jsx";

const STEPS = [
  ["Report", "Photo and map pin"],
  ["AI sorts", "Priority and team"],
  ["Admin fixes", "Drag across the board"],
  ["You track", "Live status timeline"],
];

export default function Landing() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="kicker">Campus safety, handled</p>
          <h1 className="grad-text">Spot it. Report it. Watch it get fixed.</h1>
          <p className="lead">
            CampusShield AI lets students report campus problems in a minute. AI sets the priority and sends each
            report to the right team, and everyone can follow it until it is fixed.
          </p>
          <div className="row">
            <Link className="btn p" to="/auth" state={{ tab: "register" }}>Get started</Link>
            <Link className="btn" to="/auth" state={{ tab: "login" }}>Login</Link>
          </div>
          <div className="row perks">
            <span className="pill">AI priority</span>
            <span className="pill">Live map pins</span>
            <span className="pill">Anonymous mode</span>
          </div>
        </div>

        <div className="photo-frame">
          <svg className="radar" viewBox="0 0 400 400" aria-hidden="true">
            <circle cx="200" cy="200" r="50" /><circle cx="200" cy="200" r="100" /><circle cx="200" cy="200" r="150" />
            <circle className="pulse" cx="200" cy="200" r="50" />
          </svg>
          {/* Put your own college photo at public/campus.jpg and it replaces the night illustration. */}
          <img src="/campus.jpg" alt="Campus" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <div className="float card">
            <div className="row sp">
              <h3>Water pipe leaking in Hostel B</h3>
              <StatusBadge status="In Progress" />
            </div>
            <p className="muted" style={{ margin: "6px 0 10px" }}>Reported 8:40 AM</p>
            <div className="row"><PriorityBadge priority="High" /><DeptBadge dept="Maintenance" /></div>
          </div>
        </div>
      </section>

      <section className="steps sec">
        {STEPS.map(([t, d], i) => (
          <div className="step" key={t}>
            <span className="num">{i + 1}</span>
            <div><h3>{t}</h3><p className="muted">{d}</p></div>
          </div>
        ))}
      </section>

      <section className="grid g3 sec">
        <div className="card feat"><h3>Report with proof</h3><p className="muted" style={{ marginTop: 8 }}>Add a photo and drop a pin on the real campus map.</p></div>
        <div className="card feat"><h3>AI does the sorting</h3><p className="muted" style={{ marginTop: 8 }}>Priority and department are set automatically. Wi-Fi goes to IT, pipes go to Maintenance.</p></div>
        <div className="card feat"><h3>Report anonymously</h3><p className="muted" style={{ marginTop: 8 }}>Hide your name and follow progress with a tracking ID.</p></div>
      </section>
    </>
  );
}
