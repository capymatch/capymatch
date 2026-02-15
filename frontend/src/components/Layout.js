import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { 
  LayoutGrid, Inbox, GraduationCap, Settings, 
  Bell, Mail, PlusCircle, Sparkles, Home, Kanban, Calendar,
  User, ChevronDown, X, MessageSquare, Eye, Clock, Menu, Sidebar as SidebarIcon, Shield,
  Video, TrendingUp, LogOut, CreditCard
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import api from "../lib/api";
import { toast } from "sonner";
import Tour from "../components/Tour";
import SubscriptionBadge from "../components/SubscriptionBadge";
import { useSubscription } from "../lib/subscription";
import AIAssistantDrawer from "../components/AIAssistantDrawer";
import InvitationBanner from "../components/InvitationBanner";
import UpgradeModal from "../components/UpgradeModal";

const TIER_LABELS = { basic: "Basic", pro: "Pro", premium: "Premium" };

export default function Layout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("tour_completed"));
  const [showAssistant, setShowAssistant] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { planEvent, dismissPlanEvent, subscription } = useSubscription();
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
      case "weekly_summary": return <Sparkles className="w-4 h-4 text-pink-500" />;
      default: return <Bell className="w-4 h-4 text-pink-500" />;
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
    { to: "/knowledge-base", icon: GraduationCap, label: "Schools" },
    { to: "/outreach-analysis", icon: TrendingUp, label: "Engagement AI", premium: true },
    { to: "/highlight-advisor", icon: Video, label: "Highlight AI", premium: true },
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
          ${sidebarCollapsed ? 'w-64 lg:w-20' : 'w-64 lg:w-60'} flex-shrink-0 flex flex-col border-r
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: "linear-gradient(180deg, #c0375a 0%, #8e1b3d 50%, #6b1530 100%)", borderColor: "transparent" }}
      >
        {/* Logo */}
        <div className="p-4 lg:p-5 border-b flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <span className="font-heading text-lg font-bold block leading-tight text-white">Recruiting HQ</span>
              <span className="text-[10px] uppercase tracking-widest text-white/60">
                {subscription?.tier ? `${TIER_LABELS[subscription.tier] || subscription.tier} Edition` : "Basic Edition"}
              </span>
            </div>
          </div>
          {/* Collapse button - Desktop only */}
          <button 
            className={`hidden lg:flex p-2 rounded-lg hover:bg-white/10 transition-colors ${sidebarCollapsed ? '!hidden' : ''}`}
            onClick={() => setSidebarCollapsed(true)}
            title="Collapse sidebar"
            data-testid="sidebar-collapse-btn"
          >
            <SidebarIcon className="w-5 h-5 text-white/60" />
          </button>
          {/* Close button for mobile */}
          <button 
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Expand button when collapsed - Desktop only */}
        {sidebarCollapsed && (
          <div className="hidden lg:block px-4 pt-4">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-300 text-white/70 hover:bg-white/10 hover:text-white"
              data-testid="sidebar-expand-btn"
              title="Expand sidebar"
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
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                    sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
                  } ${
                    isActive
                      ? "bg-white/18 text-white shadow-lg font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                }
                style={() => ({})}
              >
                <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
                <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                {item.premium && !sidebarCollapsed && (() => {
                  const isBasic = !subscription?.tier || subscription.tier === "basic";
                  return isBasic ? (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Pro</span>
                  ) : null;
                })()}
              </NavLink>
            );
          })}

          {/* AI Assistant Button */}
          <button
            onClick={() => {
              const tier = subscription?.tier;
              if (!tier || tier === "basic") {
                setShowUpgrade(true);
              } else {
                setShowAssistant(true);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group text-white/70 hover:bg-white/10 hover:text-white mt-1 ${
              sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
            }`}
            data-testid="nav-ai-assistant"
          >
            <Sparkles className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>AI Advisor</span>
            {!sidebarCollapsed && (
              <span className="ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Pro</span>
            )}
          </button>
        </nav>

        {/* Subscription Badge + Admin Link */}
        <div className="px-4 pb-2 mt-auto">
          <div className="border-t mb-3" style={{ borderColor: "rgba(255,255,255,0.15)" }} />
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            title={sidebarCollapsed ? "Admin" : undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
              sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''
            } text-white/50 hover:bg-white/10 hover:text-white`}
          >
            <Shield className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" strokeWidth={1.5} />
            <span className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>Admin</span>
          </NavLink>
        </div>

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
              const titles = { "/board": "Dashboard", "/pipeline": "Pipeline", "/calendar": "Calendar", "/inbox": "Inbox", "/knowledge-base": "Schools", "/outreach-analysis": "Engagement Analysis", "/highlight-advisor": "Highlight Advisor", "/settings": "Settings", "/account": "Account", "/profile": "Profile", "/journey": "Journey", "/programs": "Program Details" };
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
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
                        className="text-xs text-pink-600 hover:text-pink-500 font-medium"
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
                              navigate("/board");
                            } else if (notif.type === "coach_watch") {
                              navigate("/outreach-analysis");
                            }
                            setNotifOpen(false);
                          }}
                          className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-[var(--t-surface-hover)] ${!notif.read ? "bg-pink-600/5" : ""}`}
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
                                      <span className="w-1 h-1 rounded-full bg-pink-500 flex-shrink-0" />
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
                              <div className="w-2 h-2 rounded-full bg-pink-600 flex-shrink-0 mt-1.5" />
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
              <button onClick={() => navigate("/inbox")} className="relative p-2 lg:p-2.5 rounded-xl transition-all hover:bg-[var(--t-surface-alt)]" style={{ color: "var(--t-text-muted)" }} data-testid="header-mail-btn">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 hidden lg:block" style={{ backgroundColor: "var(--t-border)" }} />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 lg:gap-2.5 px-1.5 lg:px-2 py-1.5 rounded-xl transition-colors hover:bg-[var(--t-surface-alt)]"
                data-testid="profile-dropdown-trigger"
              >
                <Avatar className="w-8 h-8 ring-2 ring-pink-500/20">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-700 text-white text-xs font-bold">
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
                      <Avatar className="w-10 h-10 ring-2 ring-pink-500/30">
                        <AvatarImage src={user?.picture} alt={user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-700 text-white text-sm font-bold">
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
                    <div className="border-t my-1" style={{ borderColor: "var(--t-border)" }} />
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors text-left text-rose-400 hover:text-rose-300"
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
                ? "bg-emerald-600/15 border-b border-emerald-500/30"
                : "bg-amber-600/15 border-b border-amber-500/30"
            }`}
            data-testid="plan-change-banner"
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${planEvent.isUpgrade ? "text-emerald-400" : "text-amber-400"}`} />
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
          <Outlet />
        </main>
      </div>

      {/* Guided Tour */}
      {showTour && <Tour onComplete={() => setShowTour(false)} />}
      <AIAssistantDrawer isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
    </div>
  );
}
