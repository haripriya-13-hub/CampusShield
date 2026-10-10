import { useState } from "react";
import { useApp } from "../context/AppContext.jsx";

export default function Notifications() {
  const { notifications, markAllRead } = useApp();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={() => setOpen(!open)} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && <span className="dot">{unread}</span>}
      </button>
      {open && (
        <div className="panel">
          <div className="row sp" style={{ marginBottom: 8 }}>
            <h3>Notifications</h3>
            <button className="btn s" onClick={markAllRead}>Mark all read</button>
          </div>
          {notifications.length === 0 && <p className="muted">Nothing new.</p>}
          {notifications.map((n) => (
            <div key={n.id} className={"nitem" + (n.read ? "" : " unread")}>
              <p>{n.text}</p>
              <span className="muted" style={{ fontSize: 13 }}>{n.at}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
