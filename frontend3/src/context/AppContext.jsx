import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken } from "../api.js";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken()); // true while we check a saved login
  const [reports, setReports] = useState([]);
  const [log, setLog] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const role = user ? user.role : null;

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setReports([]);
    setLog([]);
    setNotifications([]);
  }, []);

  // Restore the login after a page refresh
  useEffect(() => {
    if (!getToken()) return;
    api.get("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // Load reports, notifications (and the audit log for admins)
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [r, n] = await Promise.all([api.get("/api/reports"), api.get("/api/notifications")]);
      setReports(r.reports);
      setNotifications(n.notifications);
      if (user.role === "admin") {
        const a = await api.get("/api/audit");
        setLog(a.log);
      }
    } catch (e) {
      if (e.status === 401) logout();
    }
  }, [user, logout]);

  // Load once after login, then check for updates every 15 seconds
  useEffect(() => {
    if (!user) return;
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [user, refresh]);

  const login = async (email, password) => {
    const d = await api.post("/api/login", { email, password });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  const register = async (form) => {
    const d = await api.post("/api/register", {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      admin_code: form.admin_code,
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  };

  const createReport = async (formData) => {
    const d = await api.upload("/api/reports", formData);
    await refresh();
    return d;
  };

  const moveReport = async (id, status) => {
    const previous = reports;
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r))); // instant feedback
    try {
      await api.patch(`/api/reports/${id}/status`, { status });
      await refresh();
    } catch (e) {
      setReports(previous);
      alert(e.message);
    }
  };

  const markAllRead = async () => {
    await api.post("/api/notifications/read");
    await refresh();
  };

  const updateProfile = async (body) => {
    const d = await api.put("/api/profile", body);
    setUser(d.user);
  };

  return (
    <AppContext.Provider
      value={{
        user, role, loading, reports, log, notifications,
        login, register, logout, createReport, moveReport, markAllRead, updateProfile, refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
