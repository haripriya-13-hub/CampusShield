import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext.jsx";
import Logo from "./Logo.jsx";
import Notifications from "./Notifications.jsx";

export default function Navbar() {
  const { role, logout: doLogout } = useApp();
  const navigate = useNavigate();

  const links =
    role === "student"
      ? [["/dashboard", "Dashboard"], ["/report", "Report a problem"], ["/profile", "Profile"]]
      : role === "admin"
      ? [["/board", "Admin board"], ["/analytics", "Analytics"], ["/profile", "Profile"]]
      : [["/", "Home"]];

  const logout = () => {
    doLogout();
    navigate("/");
  };

  return (
    <nav>
      <div className="nav">
        <Link to="/" className="brand"><Logo size={30} />CampusShield AI</Link>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => "l" + (isActive ? " on" : "")}>{label}</NavLink>
        ))}
        {role && <Notifications />}
        {role ? (
          <button className="btn s" onClick={logout}>Log out</button>
        ) : (
          <Link className="btn s" to="/auth">Login / Register</Link>
        )}
      </div>
    </nav>
  );
}
