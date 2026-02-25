import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, Zap, GraduationCap, BarChart3,
  Settings, ArrowLeft, Shield, ChevronDown, Menu, X, Plug, MessageSquarePlus
} from "lucide-react";

const adminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { to: "/admin/contributions", icon: MessageSquarePlus, label: "Contributions" },
  { to: "/admin/integrations", icon: Plug, label: "Integrations" },
  { to: "/admin/universities", icon: GraduationCap, label: "Universities" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", disabled: true },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--t-bg)" }} data-testid="admin-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-56 flex-shrink-0 flex flex-col border-r transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)", borderColor: "rgba(255,255,255,0.08)" }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-600/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-teal-600" strokeWidth={2} />
            </div>
            <div>
              <span className="font-semibold text-sm text-white block leading-tight">Admin Panel</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">CapyMatch</span>
            </div>
          </div>
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5" data-testid="admin-nav">
          {adminNav.map((item) => (
            item.disabled ? (
              <div
                key={item.to}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/25 cursor-not-allowed"
                title="Coming soon"
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded text-white/30">Soon</span>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`admin-nav-${item.label.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-teal-600/15 text-teal-600"
                      : "text-white/60 hover:bg-white/5 hover:text-white/80"
                  }`
                }
              >
                <item.icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            )
          ))}
        </nav>

        {/* Back to app */}
        <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => navigate("/board")}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:bg-white/5 hover:text-white/70 transition-all w-full"
            data-testid="admin-back-to-app"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="h-14 flex items-center justify-between px-4 lg:px-6 border-b"
          style={{ backgroundColor: "var(--t-header-bg)", borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(true)} data-testid="admin-mobile-menu">
              <Menu className="w-5 h-5" style={{ color: "var(--t-text)" }} />
            </button>
            <Shield className="w-4 h-4 text-slate-500 hidden lg:block" />
            <h2 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
              {location.pathname === "/admin" ? "Admin Dashboard" : location.pathname.includes("/subscriptions") ? "Subscription Management" : location.pathname.includes("/users/") ? "User Detail" : location.pathname.includes("/users") ? "User Management" : location.pathname.includes("/universities") ? "University Manager" : location.pathname.includes("/integrations") ? "Integrations" : "Admin"}
            </h2>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
