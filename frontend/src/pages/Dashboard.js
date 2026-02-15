import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import {
  ChevronRight, Calendar, AlertTriangle, Sparkles, CheckCircle, Circle,
  ArrowRight, X, User, GraduationCap, Mail as MailIcon, Target, Mail,
  Eye, TrendingUp, BarChart3, PieChart, Users, ArrowUpRight, Minus
} from "lucide-react";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

/* ── Chart helpers ── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-32 text-right shrink-0 truncate" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
      <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: "var(--t-surface-alt)" }}>
        <div className="h-full rounded-md transition-all duration-700 flex items-center px-2" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}>
          {pct > 15 && <span className="text-[10px] font-bold text-white">{value}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs font-medium w-6" style={{ color: "var(--t-text-muted)" }}>{value}</span>}
    </div>
  );
}

function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {segments.map((seg, i) => {
        const dashLen = (seg.value / total) * circumference;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={20}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`} strokeDashoffset={-offset}
            className="transition-all duration-700" />
        );
        offset += dashLen;
        return el;
      })}
    </svg>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, trend }) {
  return (
    <div className="rounded-xl p-4 lg:p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-emerald-400" : "text-gray-400"}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-faint)" }}>{sub}</p>}
    </div>
  );
}

/* ── Dashboard ── */
export default function Dashboard() {
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [profileViews, setProfileViews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem("onboarding_dismissed") === "true");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/programs"),
      api.get("/events"),
      api.get("/profile-views").catch(() => ({ data: { total: 0, today: 0, this_week: 0 } })),
      api.get("/athlete-profile").catch(() => ({ data: {} })),
      api.get("/gmail/status").catch(() => ({ data: { connected: false } })),
    ])
      .then(([progRes, evtRes, viewsRes, profRes, gmailRes]) => {
        setPrograms(progRes.data || []);
        setEvents(evtRes.data || []);
        setProfileViews(viewsRes.data);
        setProfile(profRes.data);
        setGmailConnected(gmailRes.data?.connected || false);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Derived data ── */
  const totalSchools = programs.length;
  const contacted = programs.filter(p => p.recruiting_status && p.recruiting_status !== "Not Contacted").length;
  const replied = programs.filter(p => p.reply_status === "Replied").length;
  const responseRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;
  const offers = programs.filter(p => p.recruiting_status === "Offer Received").length;

  const divColors = { D1: "#10b981", D2: "#3b82f6", D3: "#8b5cf6", NAIA: "#f59e0b", JUCO: "#ef4444", Unknown: "#6b7280" };
  const statusColors = {
    "Not Contacted": "#6b7280", "Contacted": "#3b82f6", "Actively Recruiting": "#8b5cf6",
    "Active Communication": "#ec4899", "Offer Received": "#10b981", "Not a Fit / Closed": "#ef4444",
  };

  const divCounts = {};
  programs.forEach(p => { const d = p.division || "Unknown"; divCounts[d] = (divCounts[d] || 0) + 1; });
  const divSegments = Object.entries(divCounts).map(([k, v]) => ({ label: k, value: v, color: divColors[k] || "#6b7280" }));

  const statusMap = {};
  programs.forEach(p => { const s = p.recruiting_status || "Not Contacted"; statusMap[s] = (statusMap[s] || 0) + 1; });
  const statusEntries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusEntries.map(e => e[1]), 1);

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const schoolColors = ["bg-blue-500", "bg-pink-600", "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500"];
  const actionNeeded = programs
    .filter(p => p.next_action_due && p.recruiting_status !== "Not a Fit / Closed")
    .sort((a, b) => (a.next_action_due || "").localeCompare(b.next_action_due || ""))
    .slice(0, 5);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter(e => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);
  const typeBg = { Camp: "bg-pink-600/15 text-pink-500", Showcase: "bg-blue-500/15 text-blue-400", Tournament: "bg-amber-500/15 text-amber-400", Visit: "bg-emerald-500/15 text-emerald-400", Tryout: "bg-pink-500/15 text-pink-400", Meeting: "bg-cyan-500/15 text-cyan-400", Deadline: "bg-red-500/15 text-red-400", Other: "bg-gray-500/15 text-gray-400" };

  /* ── Onboarding ── */
  const profileDone = !!(profile?.athlete_name && profile?.position);
  const schoolsDone = programs.length > 0;
  const gmailDone = gmailConnected;
  const eventsDone = events.length > 0;
  const onboardingSteps = [
    { key: "profile", label: "Set up your athlete profile", description: "Add your name, position, stats, and a highlight video", icon: User, done: profileDone, action: () => navigate("/profile") },
    { key: "schools", label: "Add your first target school", description: "Browse the database and add schools to your pipeline", icon: GraduationCap, done: schoolsDone, action: () => navigate("/knowledge-base") },
    ...(subscription?.tier !== "basic" ? [{ key: "gmail", label: "Connect your Gmail", description: "Send and receive coach emails right from the app", icon: MailIcon, done: gmailDone, action: () => navigate("/settings") }] : []),
    { key: "events", label: "Add an upcoming event", description: "Camps, showcases, and visits — keep them all in one place", icon: Calendar, done: eventsDone, action: () => navigate("/calendar") },
  ];
  const completedCount = onboardingSteps.filter(s => s.done).length;
  const allDone = completedCount === onboardingSteps.length;
  const showOnboarding = !onboardingDismissed && !allDone;

  const dismissOnboarding = () => {
    localStorage.setItem("onboarding_dismissed", "true");
    setOnboardingDismissed(true);
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* ── Onboarding Checklist ── */}
      {showOnboarding && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "rgba(168, 85, 247, 0.25)" }} data-testid="onboarding-card">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Get started with Recruiting HQ</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{completedCount} of {onboardingSteps.length} complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                <div className="h-full rounded-full bg-gradient-to-r from-pink-600 to-indigo-500 transition-all duration-500" style={{ width: `${(completedCount / onboardingSteps.length) * 100}%` }} />
              </div>
              <button onClick={dismissOnboarding} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--t-text-muted)" }} data-testid="dismiss-onboarding-btn">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {onboardingSteps.map((s) => (
              <button key={s.key} onClick={s.action} className="flex items-center gap-4 w-full px-5 py-3.5 text-left transition-colors group"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                data-testid={`onboarding-step-${s.key}`}>
                {s.done ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <Circle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.done ? "line-through opacity-50" : ""}`} style={{ color: "var(--t-text)" }}>{s.label}</p>
                  {!s.done && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{s.description}</p>}
                </div>
                {!s.done && <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--t-text-muted)" }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={Target} iconBg="bg-pink-500/15" iconColor="text-pink-500" label="Schools Tracked" value={totalSchools} sub="In your pipeline" trend={totalSchools > 0 ? 12 : null} />
        <StatCard icon={Mail} iconBg="bg-blue-500/15" iconColor="text-blue-500" label="Response Rate" value={`${responseRate}%`} sub={`${replied} of ${contacted} contacted`} trend={responseRate > 0 ? 8 : null} />
        <StatCard icon={Eye} iconBg="bg-emerald-500/15" iconColor="text-emerald-500" label="Profile Views (7d)" value={profileViews?.this_week || 0} sub={`${profileViews?.today || 0} today`} trend={profileViews?.this_week > 0 ? 5 : null} />
        <StatCard icon={TrendingUp} iconBg="bg-amber-500/15" iconColor="text-amber-500" label="Offers Received" value={offers} sub={offers > 0 ? "Congratulations!" : "Keep going!"} trend={null} />
      </div>

      {/* ── Schools Requiring Action + Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Schools Requiring Action */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="schools-action-widget">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Schools Requiring Action</h3>
            </div>
            <button onClick={() => navigate("/pipeline")} className="text-xs text-pink-600 hover:text-pink-500 transition-colors flex items-center gap-1" data-testid="view-all-schools">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {actionNeeded.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
              {actionNeeded.map((prog, i) => (
                <div key={prog.program_id} className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors"
                  onClick={() => navigate("/pipeline")}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  data-testid={`school-action-${prog.program_id}`}>
                  <div className={`w-8 h-8 rounded-full ${schoolColors[i % schoolColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {(prog.university_name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{prog.university_name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>{prog.recruiting_status}{prog.division ? ` · ${prog.division}` : ""}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[11px] px-2.5 py-1 rounded-md" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-secondary)" }}>Follow Up</span>
                    <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{formatDate(prog.next_action_due)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-5">
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No schools need action right now</p>
              <button onClick={() => navigate("/knowledge-base")} className="mt-2 text-sm text-pink-600 hover:text-pink-500 transition-colors">+ Add a school</button>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="events-widget">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Upcoming Events</h3>
            </div>
            <button onClick={() => navigate("/calendar")} className="text-xs text-pink-600 hover:text-pink-500 transition-colors flex items-center gap-1" data-testid="view-all-events">

      {/* ── Pipeline Funnel + Division Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="pipeline-funnel">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Pipeline Funnel</h3>
          </div>
          {statusEntries.length > 0 ? (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => (
                <HBar key={status} label={status} value={count} max={maxStatus} color={statusColors[status] || "#ec4899"} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>Add schools to see your pipeline breakdown</p>
          )}
        </div>

        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="division-breakdown">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Division Breakdown</h3>
          </div>
          {divSegments.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center">
                <DonutChart segments={divSegments} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{totalSchools}</span>
                  <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>total</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                {divSegments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>{seg.label}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>Add schools to see division distribution</p>
          )}
        </div>
      </div>

      {/* ── Engagement Summary ── */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="engagement-summary">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Engagement Summary</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Not Contacted", value: statusMap["Not Contacted"] || 0, color: "#6b7280" },
            { label: "Contacted", value: contacted, color: "#3b82f6" },
            { label: "Got Replies", value: replied, color: "#10b981" },
            { label: "Offers", value: offers, color: "#f59e0b" },
          ].map(item => (
            <div key={item.label} className="rounded-lg p-4 text-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="max_schools" currentTier={subscription?.tier || "basic"} />
    </div>
  );
}
