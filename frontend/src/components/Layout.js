import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { 
  LayoutGrid, GraduationCap, Settings, 
  Bell, PlusCircle, Sparkles, Home, Kanban, Calendar,
  User, ChevronDown, ChevronRight, X, MessageSquare, Eye, Clock, Menu, Sidebar as SidebarIcon, Shield,
  Video, TrendingUp, LogOut, CreditCard, Crown, Sun, Moon, Receipt, Radio
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";
import SubscriptionBadge from "../components/SubscriptionBadge";
import { useSubscription } from "../lib/subscription";
import { useTheme } from "../lib/theme";
import AIAssistantDrawer from "../components/AIAssistantDrawer";
import InvitationBanner from "../components/InvitationBanner";
import UpgradeModal from "../components/UpgradeModal";

const TIER_LABELS = { basic: "Starter", pro: "Pro", premium: "Premium" };

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { planEvent, dismissPlanEvent, subscription } = useSubscription();
  const { theme, toggle: toggleTheme } = useTheme();
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

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

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

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
      case "weekly_summary": return <Sparkles className="w-4 h-4 text-slate-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
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
    { to: "/pipeline", icon: Kanban, label: "My Schools" },
    { to: "/spotlight", icon: Radio, label: "Social Spotlight" },
    { to: "/knowledge-base", icon: GraduationCap, label: "Find Schools" },
    { to: "/calendar", icon: Calendar, label: "Calendar" },
  ];

  const aiItems = [
    { to: "/outreach-analysis", icon: TrendingUp, label: "Engagement AI" },
    { to: "/highlight-advisor", icon: Video, label: "Highlight AI" },
  ];

  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div 
      className="min-h-screen flex" 
      style={{ backgroundColor: "var(--t-bg)" }} 
      data-testid="app-layout"
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Left Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-64 lg:w-20' : 'w-64 lg:w-60'} flex-shrink-0 flex flex-col border-r
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: "var(--t-sidebar-bg)", borderColor: "var(--t-sidebar-border)" }}
      >
        {/* Logo */}
        <div className="p-4 lg:p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--t-sidebar-divider)" }}>
          <div className="flex-1 flex items-center justify-center">
            <img src="/images/capymatch-logo-new.png" alt="CapyMatch" className={`object-contain ${sidebarCollapsed ? 'h-8' : 'h-12'}`} />
          </div>
          {/* Collapse button - Desktop only */}
          <button 
            className={`hidden lg:flex p-2 rounded-lg transition-colors ${sidebarCollapsed ? '!hidden' : ''}`}
            onClick={() => setSidebarCollapsed(true)}
            title="Collapse sidebar"
            data-testid="sidebar-collapse-btn"
            style={{ color: "var(--t-nav-text)" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <SidebarIcon className="w-5 h-5" />
          </button>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden p-2 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            style={{ color: "var(--t-nav-text)" }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expand button when collapsed - Desktop only */}
        {sidebarCollapsed && (
          <div className="hidden lg:block px-4 pt-4">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-300"
              data-testid="sidebar-expand-btn"
              title="Expand sidebar"
              style={{ color: "var(--t-nav-text)" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"; e.currentTarget.style.color = "var(--t-nav-text-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--t-nav-text)"; }}
            >
              <SidebarIcon className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1" data-testid="sidebar-nav">
          {sidebarItems.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase()}`}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? "var(--t-nav-active-bg)" : "transparent",
                  color: isActive ? "var(--t-nav-active-text)" : "var(--t-nav-text)",
                  fontWeight: isActive ? 600 : 500,
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.classList.contains('active')) {
                    e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)";
                    e.currentTarget.style.color = "var(--t-nav-text-hover)";
                  }
                }}
                onMouseLeave={e => {
                  const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--t-nav-text)";
                  }
                }}
              >
                <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              </NavLink>
            );
          })}

          {/* AI Features Accordion */}
          <div className="pt-1">
            <button
              onClick={() => setAiOpen(!aiOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
              }`}
              data-testid="nav-ai-features-toggle"
              title={sidebarCollapsed ? "AI Features" : undefined}
              style={{ color: "var(--t-nav-text)" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"; e.currentTarget.style.color = "var(--t-nav-text-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--t-nav-text)"; }}
            >
              <Sparkles className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
              <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>AI Features</span>
              {!sidebarCollapsed && (
                <>
                  {(!subscription?.tier || subscription.tier !== "premium") && (
                    <Crown className="ml-auto w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                  )}
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${aiOpen ? 'rotate-90' : ''}`} style={{ color: "var(--t-text-muted)" }} />
                </>
              )}
            </button>
            {aiOpen && !sidebarCollapsed && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: "var(--t-sidebar-divider)" }}>
                {aiItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group"
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? "var(--t-nav-active-bg)" : "transparent",
                      color: isActive ? "var(--t-nav-active-text)" : "var(--t-nav-text)",
                      fontWeight: isActive ? 600 : 500,
                    })}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                <button
                  onClick={() => {
                    const tier = subscription?.tier;
                    if (tier !== "premium") {
                      setShowUpgrade(true);
                    } else {
                      setShowAssistant(true);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group"
                  data-testid="nav-ai-advisor"
                  style={{ color: "var(--t-nav-text)" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <Sparkles className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                  <span>AI Advisor</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Admin Link — only for admin users */}
        {user?.email === "douglas@yeslms.com" && (
        <div className="px-4 pb-2 mt-auto">
          <div className="border-t mb-3" style={{ borderColor: "var(--t-sidebar-divider)" }} />
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            title={sidebarCollapsed ? "Admin" : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
              sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
            }`}
            style={{ color: "var(--t-nav-text)", opacity: 0.7 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--t-nav-active-bg)"; e.currentTarget.style.opacity = "1"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.opacity = "0.7"; }}
          >
            <Shield className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Admin</span>
          </NavLink>
        </div>
        )}

        {/* Bottom spacing */}
        <div className="p-4" />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        {/* Top Header */}
        <header 
          className="h-14 lg:h-16 flex items-center justify-between px-4 lg:px-6 border-b backdrop-blur-xl relative z-50"
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
              const titles = { "/board": "Dashboard", "/pipeline": "My Schools", "/spotlight": "Social Spotlight", "/calendar": "Calendar", "/knowledge-base": "Schools", "/school": "School Info", "/outreach-analysis": "Engagement Analysis", "/highlight-advisor": "Highlight Advisor", "/settings": "Settings", "/account": "Account", "/billing": "Billing", "/profile": "Profile", "/journey": "Journey", "/programs": "Program Details" };
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
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-14 sm:top-full sm:mt-2 sm:w-80 rounded-xl border shadow-xl overflow-hidden z-50"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
                  data-testid="notifications-dropdown"
                >
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead}
                        className="text-xs text-teal-600 hover:text-slate-500 font-medium"
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
                              const replyPid = notif.data?.program_id;
                              if (replyPid) navigate(`/journey/${replyPid}`);
                              else navigate("/pipeline");
                            } else if (notif.type === "follow_up_due") {
                              navigate("/pipeline");
                            } else if (notif.type === "profile_view_edu") {
                              navigate("/board");
                            } else if (notif.type === "coach_watch") {
                              navigate("/outreach-analysis");
                            }
                            setNotifOpen(false);
                          }}
                          className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-[var(--t-surface-hover)] ${!notif.read ? "bg-teal-600/5" : ""}`}
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
                                      <span className="w-1 h-1 rounded-full bg-slate-500 flex-shrink-0" />
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
                              <div className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl transition-all hover:bg-[var(--t-surface-alt)]"
              style={{ color: "var(--t-text-muted)" }}
              data-testid="theme-toggle-btn"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" strokeWidth={1.5} /> : <Moon className="w-5 h-5" strokeWidth={1.5} />}
            </button>

            {/* Divider */}
            <div className="w-px h-8 hidden lg:block" style={{ backgroundColor: "var(--t-border)" }} />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 lg:gap-2.5 px-1.5 lg:px-2 py-1.5 rounded-xl transition-colors hover:bg-[var(--t-surface-alt)]"
                data-testid="profile-dropdown-trigger"
              >
                <Avatar className="w-8 h-8 ring-2 ring-slate-500/20">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-500 to-teal-700 text-white text-xs font-bold">
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
                      <Avatar className="w-10 h-10 ring-2 ring-slate-500/30">
                        <AvatarImage src={user?.picture} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-500 to-teal-700 text-white text-sm font-bold">
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
                      onClick={() => { setProfileOpen(false); navigate("/account"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left"
                      style={{ color: "var(--t-text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      data-testid="profile-account-link"
                    >
                      <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                      Account
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/billing"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left"
                      style={{ color: "var(--t-text-secondary)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      data-testid="profile-billing-link"
                    >
                      <Receipt className="w-4 h-4" strokeWidth={1.5} />
                      Billing
                    </button>
                    <div className="border-t my-1" style={{ borderColor: "var(--t-border)" }} />
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left text-teal-600 hover:text-slate-300"
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.5} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Plan Change Banner */}
        {planEvent && (
          <div
            className={`flex items-center justify-between px-4 lg:px-6 py-3 text-sm font-medium ${
              planEvent.isUpgrade
                ? "bg-teal-700/15 border-b border-slate-500/30"
                : "bg-amber-600/15 border-b border-amber-500/30"
            }`}
            data-testid="plan-change-banner"
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${planEvent.isUpgrade ? "text-teal-600" : "text-amber-400"}`} />
              <span style={{ color: "var(--t-text)" }}>
                Your plan was changed from <strong>{TIER_LABELS[planEvent.old_plan] || planEvent.old_plan}</strong> to <strong>{TIER_LABELS[planEvent.new_plan] || planEvent.new_plan}</strong>
              </span>
            </div>
            <button
              onClick={dismissPlanEvent}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: "var(--t-text-muted)" }}
              data-testid="plan-change-banner-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <InvitationBanner />
          <Outlet context={{ user }} />
        </main>
      </div>

      <AIAssistantDrawer isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="ai_drafts" currentTier={subscription?.tier || "basic"} />
    </div>
  );
}
