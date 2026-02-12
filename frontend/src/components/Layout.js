import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, Inbox, CheckSquare, GraduationCap, BarChart3, Settings, 
  LogOut, Search, Bell, Mail, Plus, PlusCircle
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
    { to: "/board", icon: LayoutGrid, label: "Pipeline" },
    { to: "/inbox", icon: Inbox, label: "Inbox" },
    { to: "/follow-ups", icon: CheckSquare, label: "Tasks" },
    { to: "/knowledge-base", icon: GraduationCap, label: "Schools" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }} data-testid="app-layout">
      {/* Left Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/10" style={{ backgroundColor: "rgba(20, 20, 40, 0.8)" }}>
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-heading text-lg font-bold text-white">Recruiting HQ</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Add Group Button */}
        <div className="p-3 border-t border-white/10">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white transition-colors w-full">
            <PlusCircle className="w-5 h-5" strokeWidth={1.5} />
            Add Group
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-white/10" style={{ backgroundColor: "rgba(20, 20, 40, 0.5)" }}>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-lg font-semibold text-white" data-testid="app-title">
              Volleyball Recruiting - 2028
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search schools, coaches..."
                className="w-64 pl-9 pr-4 py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
                data-testid="header-search"
              />
            </div>

            {/* Icons */}
            <div className="flex items-center gap-2">
              <button className="relative p-2 text-white/60 hover:text-white transition-colors">
                <CheckSquare className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">2</span>
              </button>
              <button className="relative p-2 text-white/60 hover:text-white transition-colors">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">3</span>
              </button>
              <button className="relative p-2 text-white/60 hover:text-white transition-colors">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">5</span>
              </button>
            </div>

            {/* User */}
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <Avatar className="w-8 h-8 ring-2 ring-purple-500/50">
                <AvatarImage src={user?.picture} alt={user?.name} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-bold">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="p-2 text-white/40 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
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
