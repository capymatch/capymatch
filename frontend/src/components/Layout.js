import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, Inbox, CheckSquare, GraduationCap, BarChart3, Settings, 
  LogOut, Search, Bell, Mail, PlusCircle, Sparkles, Home, Kanban, Calendar
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";

export default function Layout({ user }) {
  const navigate = useNavigate();

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
      style={{ 
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 25%, #16213e 50%, #1a1a2e 75%, #0f0f1a 100%)"
      }} 
      data-testid="app-layout"
    >
      {/* Animated background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-3/4 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Left Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/5 relative z-10 backdrop-blur-xl" style={{ backgroundColor: "rgba(15, 15, 25, 0.8)" }}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="font-heading text-lg font-bold text-white block leading-tight">Recruiting HQ</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Pro Edition</span>
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
                    ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-white shadow-lg shadow-purple-500/10 border border-purple-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Add Group Button */}
        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 px-4 py-3 text-sm text-white/40 hover:text-white/70 transition-all w-full rounded-xl hover:bg-white/5 group">
            <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={1.5} />
            Add Group
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <Avatar className="w-10 h-10 ring-2 ring-purple-500/30">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-bold">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name || "User"}</p>
              <p className="text-white/40 text-xs truncate">{user?.email || "user@example.com"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 backdrop-blur-xl" style={{ backgroundColor: "rgba(15, 15, 25, 0.5)" }}>
          <div className="flex items-center gap-6">
            <h1 className="font-heading text-xl font-bold text-white tracking-tight" data-testid="app-title">
              Recruiting HQ
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-purple-400 transition-colors" />
              <input
                type="text"
                placeholder="Search schools, coaches..."
                className="w-72 pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                data-testid="header-search"
              />
            </div>

            {/* Notification Icons */}
            <div className="flex items-center gap-1">
              <button className="relative p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <CheckSquare className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30">2</span>
              </button>
              <button className="relative p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-purple-500/30">3</span>
              </button>
              <button className="relative p-2.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-orange-500/30">5</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/10" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="p-2.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
