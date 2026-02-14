import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { 
  LayoutGrid, Inbox, CheckSquare, GraduationCap, BarChart3, Settings, 
  Bell, Mail, PlusCircle, Sparkles, Home, Kanban, Calendar,
  User, ChevronDown, X, MessageSquare, Eye, Clock, Menu
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";
import Tour from "../components/Tour";

export default function Layout({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("tour_completed"));
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      } catch {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Auth bypassed: logout disabled
  const handleLogout = () => {};

  const markNotificationRead = async (notifId) => {
    try {
      await api.post(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case "coach_reply": return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "profile_view_edu": return <Eye className="w-4 h-4 text-blue-500" />;
      case "follow_up_due": return <Clock className="w-4 h-4 text-orange-500" />;
      case "weekly_summary": return <Sparkles className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-purple-500" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 lg:w-60 flex-shrink-0 flex flex-col border-r
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: "var(--t-sidebar-bg)", borderColor: "var(--t-border)" }}
      >
        {/* Logo */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="font-heading text-lg font-bold block leading-tight" style={{ color: "var(--t-text)" }}>Recruiting HQ</span>
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t-text-muted)" }}>Pro Edition</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" style={{ color: "var(--t-text-muted)" }} />
          </button>
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

        {/* Bottom spacing */}
        <div className="p-4" />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header */}
        <header 
          className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b"
          style={{ backgroundColor: "var(--t-header-bg)", borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center gap-3" data-testid="header-page-title">
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" style={{ color: "var(--t-text)" }} />
            </button>
            {(() => {
              const titles = { "/board": "Dashboard", "/pipeline": "Pipeline", "/calendar": "Calendar", "/inbox": "Inbox", "/follow-ups": "Tasks", "/knowledge-base": "Schools", "/analytics": "Analytics", "/settings": "Settings", "/profile": "Profile", "/journey": "Journey", "/programs": "Program Details" };
              const match = Object.entries(titles).find(([path]) => location.pathname.startsWith(path));
              const icon = match ? sidebarItems.find(s => s.to === match[0])?.icon : null;
              const Icon = icon || Home;
              return (
                <>
                  <Icon className="w-5 h-5 hidden lg:block" style={{ color: "var(--t-text-muted)" }} strokeWidth={1.5} />
                  <h2 className="text-sm lg:text-base font-semibold" style={{ color: "var(--t-text)" }}>{match?.[1] || "Dashboard"}</h2>
                </>
              );
            })()}
          </div>

          <div className="flex items-center gap-5">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl transition-all hover:bg-[var(--t-surface-alt)]" 
                style={{ color: "var(--t-text-muted)" }} 
                data-testid="header-notifications-btn"
              >
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl overflow-hidden z-50"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
                  data-testid="notifications-dropdown"
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-xs text-purple-500 hover:text-purple-400 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--t-text-muted)" }} />
                        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.notification_id}
                          onClick={() => {
                            if (!notif.read) markNotificationRead(notif.notification_id);
                            const pid = notif.data?.program_id;
                            if (notif.type === "weekly_summary") {
                              navigate("/pipeline");
                            } else if (pid) {
                              navigate(`/journey/${pid}`);
                            } else if (notif.type === "coach_reply") {
                              navigate("/inbox");
                            } else if (notif.type === "follow_up_due") {
                              navigate("/pipeline");
                            } else if (notif.type === "profile_view_edu") {
                              navigate("/analytics");
                            }
                            setNotifOpen(false);
                          }}
                          className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-[var(--t-surface-hover)] ${!notif.read ? "bg-purple-500/5" : ""}`}
                          style={{ borderColor: "var(--t-border)" }}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotifIcon(notif.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{notif.title}</p>
                              {notif.type === "weekly_summary" ? (
                                <div className="mt-1 space-y-0.5">
                                  {notif.message.split(" • ").map((line, i) => (
                                    <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: "var(--t-text-muted)" }}>
                                      <span className="w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>{notif.message}</p>
                              )}
                              <p className="text-[10px] mt-1" style={{ color: "var(--t-text-muted)" }}>{formatTimeAgo(notif.created_at)}</p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Icons */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigate("/follow-ups")} className="relative p-2.5 rounded-xl transition-all hover:bg-[var(--t-surface-alt)]" style={{ color: "var(--t-text-muted)" }} data-testid="header-tasks-btn">
                <CheckSquare className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button onClick={() => navigate("/inbox")} className="relative p-2.5 rounded-xl transition-all hover:bg-[var(--t-surface-alt)]" style={{ color: "var(--t-text-muted)" }} data-testid="header-mail-btn">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Guided Tour */}
      {showTour && <Tour onComplete={() => setShowTour(false)} />}
    </div>
  );
}
