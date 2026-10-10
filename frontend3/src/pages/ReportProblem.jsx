import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import { api } from "../api.js";
import { BUILDINGS } from "../data.js";
import CampusMap from "../components/CampusMap.jsx";
import { StatusBadge, PriorityBadge, DeptBadge } from "../components/Badges.jsx";

export default function ReportProblem() {
  const { createReport } = useApp();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [building, setBuilding] = useState(BUILDINGS[0].name);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [pin, setPin] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [result, setResult] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const focusB = BUILDINGS.find((b) => b.name === building);
  const focus = focusB ? [focusB.lat, focusB.lng] : null;

  // Live duplicate warning: ask the backend while the student types (waits 400 ms after the last key)
  useEffect(() => {
    if (title.trim().length < 4) { setDuplicates([]); return; }
    const timer = setTimeout(() => {
      api.post("/api/duplicates", { title, description: desc, building })
        .then((d) => setDuplicates(d.duplicates))
        .catch(() => setDuplicates([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [title, desc, building]);

  const onPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", desc);
      fd.append("building", building);
      fd.append("anonymous", anonymous ? "true" : "false");
      if (pin) { fd.append("lat", pin[0]); fd.append("lng", pin[1]); }
      if (photoFile) fd.append("photo", photoFile);

      const d = await createReport(fd);
      setResult({ id: d.report.id, priority: d.ai.priority, dept: d.ai.dept, tid: d.trackingId });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <>
        <h2>Report a problem</h2>
        <div className="ai sec">
          <h3>Report submitted</h3>
          <p style={{ margin: "8px 0 14px" }}>AI has sorted your report.</p>
          <div className="row"><PriorityBadge priority={result.priority} /><DeptBadge dept={result.dept} /><StatusBadge status="Pending" /></div>
          {result.tid && <p style={{ marginTop: 14 }}>Your tracking ID: <b>{result.tid}</b>. Save it, because it is the only way to follow this anonymous report.</p>}
          <div className="row" style={{ marginTop: 18 }}>
            {!result.tid && <Link className="btn p" to={`/report/${result.id}`}>View report</Link>}
            <Link className="btn" to="/dashboard">Back to dashboard</Link>
          </div>
        </div>
      </>
    );
  }

  const dup = duplicates[0];

  return (
    <>
      <h2>Report a problem</h2>
      <p className="muted" style={{ marginTop: 6 }}>Tell us what is wrong. We will route it to the right team.</p>

      <div className="grid g2 sec" style={{ alignItems: "start" }}>
        <form className="card" onSubmit={submit}>
          {dup && <div className="warn">Someone already reported this: &ldquo;{dup.title}&rdquo;. Check before you submit.</div>}
          {error && <div className="warn" role="alert">{error}</div>}

          <div className="f">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wi-Fi not working in the library" required />
          </div>
          <div className="f">
            <label htmlFor="desc">Description</label>
            <textarea id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What happened? Where exactly?" required />
          </div>
          <div className="f">
            <label htmlFor="building">Building</label>
            <select id="building" value={building} onChange={(e) => setBuilding(e.target.value)}>
              {BUILDINGS.map((b) => <option key={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div className="f">
            <label>Photo</label>
            <label className="drop">
              {photoPreview ? <img src={photoPreview} alt="Selected" /> : "Tap to upload a photo"}
              <input type="file" accept="image/*" hidden onChange={onPhoto} />
            </label>
          </div>
          <label className="row" style={{ fontWeight: 500, margin: "0 0 18px" }}>
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Report anonymously (your name is hidden)
          </label>
          <button className="btn a" style={{ width: "100%" }} type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit report"}
          </button>
        </form>

        <div className="card">
          <h3>Drop a pin</h3>
          <p className="muted" style={{ margin: "6px 0 12px", fontSize: 14 }}>Click the map where the problem is.</p>
          <CampusMap pin={pin} onPick={setPin} focus={focus} />
          <p className="chip" style={{ marginTop: 10 }}>{pin ? "Pin placed" : "No pin yet"}</p>
        </div>
      </div>
    </>
  );
}
