import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";

export default function ProtectedRoute({ allow, children }) {
  const { role, loading } = useApp();
  if (loading) return <p className="muted">Loading...</p>;
  if (!role) return <Navigate to="/auth" replace />;
  if (!allow.includes(role)) {
    return <Navigate to={role === "admin" ? "/board" : "/dashboard"} replace />;
  }
  return children;
}
