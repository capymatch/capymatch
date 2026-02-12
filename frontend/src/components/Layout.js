import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, Bell, LogOut, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useTheme } from "../lib/theme";
import api from "../lib/api";
import { toast } from "sonner";

export default function Layout({ user }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    navigate("/login", { replace: true });
    toast.success("Logged out");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/board", icon: ClipboardList, label: "Recruiting Board" },
    { to: "/knowledge-base", icon: BookOpen, label: "Knowledge Base" },
    { to: "/follow-ups", icon: Bell, label: "Needs Follow-Up" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--t-bg)" }} data-testid="app-layout">
      <header className="sticky top-0 z-50 shadow-sm t-nav border-b" style={{ backgroundColor: "var(--t-nav-bg)", borderColor: "var(--t-nav-border)" }}>
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <h1 className="font-heading text-xl font-bold tracking-wide" style={{ color: "var(--t-text)" }} data-testid="app-title">
              Volleyball Recruiting CRM
            </h1>
            <nav className="flex items-center gap-1" data-testid="main-nav">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? "border-b-2"
                        : ""
                    }`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? "var(--t-nav-active-text)" : "var(--t-text-secondary)",
                    backgroundColor: isActive ? "var(--t-nav-active-bg)" : "transparent",
                    borderColor: isActive ? "var(--t-nav-active-text)" : "transparent",
                  })}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.5} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              data-testid="theme-toggle"
              className="p-2 rounded-md transition-colors"
              style={{ color: "var(--t-text-secondary)" }}
              title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
            </button>
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-slate-600 text-white text-xs">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm hidden md:block" style={{ color: "var(--t-text-secondary)" }}>{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="p-2 rounded-md transition-colors hover:text-red-400"
              style={{ color: "var(--t-text-muted)" }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
