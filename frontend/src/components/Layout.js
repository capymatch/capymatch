import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, BookOpen, Bell, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";

export default function Layout({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
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
    <div className="min-h-screen bg-[#0f172a]" data-testid="app-layout">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0f172a]/90 border-b border-white/10">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-8">
            <h1 className="font-heading text-xl font-bold tracking-wide text-white" data-testid="app-title">
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
                        ? "text-blue-400 bg-blue-500/10 border-b-2 border-blue-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-300 hidden md:block">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
