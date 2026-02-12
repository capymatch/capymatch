import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { 
  LayoutGrid, Inbox, CheckSquare, GraduationCap, BarChart3, Settings, 
  LogOut, Bell, Mail, PlusCircle, Sparkles, Home, Kanban, Calendar,
  User, ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";
import Tour from "../components/Tour";

export default function Layout({ user }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("tour_completed"));
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    navigate("/login", { replace: true });
    toast.success("Logged out");
  };

  const sidebarItems = [
    { to: "/board", icon: Home, label: "Dashboard" },
    { to: "/pipeline", icon: Kanban, label: "Pipeline" },
    { to: "/calendar", icon: Calendar, label: "Calendar" },
    { to: "/inbox", icon: Inbox, label: "Inbox" },
    { to: "/follow-ups", icon: CheckSquare, label: "Tasks" },
    { to: "/knowledge-base", icon: GraduationCap, label: "Schools" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div 
      className="min-h-screen flex" 
      style={{ backgroundColor: "var(--t-bg)" }} 
      data-testid="app-layout"
    >
      {/* Left Sidebar */}
      <aside 
        className="w-60 flex-shrink-0 flex flex-col border-r relative z-10"
        style={{ backgroundColor: "var(--t-sidebar-bg)", borderColor: "var(--t-border)" }}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="font-heading text-lg font-bold block leading-tight" style={{ color: "var(--t-text)" }}>Recruiting HQ</span>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t-text-muted)" }}>Pro Edition</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" data-testid="sidebar-nav">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg"
                    : ""
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? "#ffffff" : "var(--t-text-secondary)",
                backgroundColor: isActive ? undefined : "transparent",
              })}
            >
              <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Add Group Button */}
        <div className="p-4 border-t" style={{ borderColor: "var(--t-border)" }}>
          <button 
            className="flex items-center gap-3 px-4 py-3 text-sm transition-all w-full rounded-xl group"
            style={{ color: "var(--t-text-muted)" }}
          >
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={1.5} />
            Add Group
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header 
          className="h-16 flex items-center justify-between px-6 border-b"
          style={{ backgroundColor: "var(--t-header-bg)", borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center gap-6">
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Icons */}
            <div className="flex items-center gap-1">
              <button className="relative p-2.5 rounded-xl transition-all" style={{ color: "var(--t-text-muted)" }}>
                <CheckSquare className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">2</span>
              </button>
              <button className="relative p-2.5 rounded-xl transition-all" style={{ color: "var(--t-text-muted)" }}>
                <Mail className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">3</span>
              </button>
              <button className="relative p-2.5 rounded-xl transition-all" style={{ color: "var(--t-text-muted)" }}>
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">5</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8" style={{ backgroundColor: "var(--t-border)" }} />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors hover:bg-[var(--t-surface-alt)]"
                data-testid="profile-dropdown-trigger"
              >
                <Avatar className="w-8 h-8 ring-2 ring-purple-500/20">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden lg:block" style={{ color: "var(--t-text)" }}>{user?.name?.split(" ")[0] || "User"}</span>
                <ChevronDown className="w-3.5 h-3.5 hidden lg:block" style={{ color: "var(--t-text-muted)" }} />
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl border shadow-xl overflow-hidden z-50"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
                  data-testid="profile-dropdown-menu"
                >
                  <div className="px-4 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-purple-500/30">
                        <AvatarImage src={user?.picture} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-bold">
                          {user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{user?.name || "User"}</p>
                        <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>{user?.email || ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left"
                      style={{ color: "var(--t-text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      data-testid="profile-link"
                    >
                      <User className="w-4 h-4" strokeWidth={1.5} />
                      Athlete Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left"
                      style={{ color: "var(--t-text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      data-testid="profile-settings-link"
                    >
                      <Settings className="w-4 h-4" strokeWidth={1.5} />
                      Settings
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left text-red-500 hover:bg-red-500/10"
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.5} />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Guided Tour */}
      {showTour && <Tour onComplete={() => setShowTour(false)} />}
    </div>
  );
}
