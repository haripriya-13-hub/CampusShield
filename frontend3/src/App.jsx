import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import ReportProblem from "./pages/ReportProblem.jsx";
import ReportDetails from "./pages/ReportDetails.jsx";
import AdminBoard from "./pages/AdminBoard.jsx";
import Analytics from "./pages/Analytics.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          <Route path="/dashboard" element={<ProtectedRoute allow={["student"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute allow={["student"]}><ReportProblem /></ProtectedRoute>} />

          <Route path="/report/:id" element={<ProtectedRoute allow={["student", "admin"]}><ReportDetails /></ProtectedRoute>} />

          <Route path="/board" element={<ProtectedRoute allow={["admin"]}><AdminBoard /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute allow={["admin"]}><Analytics /></ProtectedRoute>} />

          <Route path="/profile" element={<ProtectedRoute allow={["student", "admin"]}><Profile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
