import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import {
  ChevronRight, Target, MessageCircle, Mail, Clock,
  Zap, Send, Sparkles, CheckCircle,
  ArrowRight, User, GraduationCap, Calendar,
  BarChart3, Activity, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";
import { FirstReplyCelebration } from "../components/FirstReplyCelebration";
import UniversityLogo from "../components/UniversityLogo";

/* ── Pulse Stat ── */
function PulseStat({ icon: Icon, iconBg, iconColor, value, label, sub, dark, onClick }) {
  return (
    <div className={`px-5 py-4 lg:px-6 lg:py-5 border-r last:border-r-0${onClick ? " cursor-pointer transition-opacity hover:opacity-80" : ""}`} style={{ borderColor: dark ? "rgba(255,255,255,0.06)" : "var(--t-border)" }} onClick={onClick} data-testid={`pulse-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: iconColor }}>{value}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} strokeWidth={2} />
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: dark ? "rgba(255,255,255,0.4)" : "var(--t-text-muted)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: dark ? "rgba(255,255,255,0.25)" : "var(--t-text-faint)" }}>{sub}</p>}
    </div>
  );
}

/* ── Action Item Row ── */
function ActionRow({ domain, school, detail, badge, badgeBg, badgeColor, onClick }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b last:border-b-0"
      style={{ borderColor: "var(--t-border)" }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
    >
      <UniversityLogo domain={domain} name={school} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{school}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--t-text-muted)" }}>{detail}</p>
      </div>
      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: badgeBg, color: badgeColor }}>{badge}</span>
      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} />
    </div>
  );
}

/* ── Spotlight Card ── */
function SpotlightCard({ program, onClick }) {
  const colorMap = {
    "In Conversation": { bg: "rgba(16,185,129,0.12)", color: "#059669" },
    "Actively Recruiting": { bg: "rgba(168,85,247,0.12)", color: "#7c3aed" },
    "Active Communication": { bg: "rgba(236,72,153,0.12)", color: "#db2777" },
    "Contacted": { bg: "rgba(59,130,246,0.12)", color: "#2563eb" },
    "Offer Received": { bg: "rgba(245,158,11,0.12)", color: "#d97706" },
  };
  const statusStyle = colorMap[program.recruiting_status] || { bg: "rgba(107,114,128,0.12)", color: "#4b5563" };

  const nextStep = program.next_action || "Review this school's journey and plan your next move.";

  return (
    <div
      className="min-w-[250px] max-w-[250px] rounded-xl border p-5 flex-shrink-0 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      onClick={onClick}
      data-testid={`spotlight-${program.program_id}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <UniversityLogo domain={program.domain} name={program.university_name} size={40} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "var(--t-text)" }}>{program.university_name}</p>
          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{program.division || "—"}{program.conference ? ` · ${program.conference}` : ""}</p>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>{program.recruiting_status}</span>
        {program.next_action_due && new Date(program.next_action_due + "T00:00:00") <= new Date() && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>Overdue</span>
        )}
      </div>
      <div className="pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
          <span className="font-semibold" style={{ color: "#2ec4b6" }}>Next step: </span>
          {nextStep}
        </p>
      </div>
    </div>
  );
}

/* ── Feed Item ── */
function FeedItem({ dotColor, title, titleHighlight, detail, time, showLine = true }) {
  return (
    <div className="flex gap-3.5 px-5 py-3.5 transition-colors border-b last:border-b-0" style={{ borderColor: "var(--t-border)" }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
        {showLine && <div className="w-px flex-1 mt-1.5" style={{ backgroundColor: "var(--t-border)" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
          {title} {titleHighlight && <span style={{ color: "#2ec4b6" }}>{titleHighlight}</span>}
        </p>
        {detail && <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{detail}</p>}
      </div>
      <span className="text-[10px] pt-1 flex-shrink-0" style={{ color: "var(--t-text-faint)" }}>{time}</span>
    </div>
  );
}

/* ── Funnel Bar ── */
function FunnelBar({ count, maxCount, label, color }) {
  const height = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
  return (
    <div className="flex-1 flex flex-col items-center justify-end gap-1.5" style={{ height: "100%" }}>
      <span className="text-base font-extrabold tracking-tight" style={{ color }}>{count}</span>
      <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${height}%`, background: `linear-gradient(to top, ${color}, ${color}dd)`, minHeight: "4px" }} />
      <span className="text-[10px] font-medium text-center leading-tight mt-1" style={{ color: "var(--t-text-muted)" }}>{label}</span>
    </div>
  );
}

/* ── Event Card ── */
function EventCard({ event, onClick }) {
  const typeBg = {
    Camp: { bg: "rgba(232,98,138,0.12)", color: "#2ec4b6" },
    Showcase: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
    Tournament: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
    Visit: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
    Tryout: { bg: "rgba(236,72,153,0.12)", color: "#ec4899" },
    Meeting: { bg: "rgba(6,182,212,0.12)", color: "#06b6d4" },
    Deadline: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  };
  const style = typeBg[event.event_type] || { bg: "rgba(107,114,128,0.12)", color: "#6b7280" };
  const dt = new Date(event.start_date + "T00:00:00");
  const month = dt.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = dt.getDate();

  return (
    <div
      className="flex-1 px-5 py-4 border-r last:border-r-0 cursor-pointer transition-colors"
      style={{ borderColor: "var(--t-border)" }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
    >
      <div className="w-11 h-12 rounded-lg flex flex-col items-center justify-center mb-3" style={{ backgroundColor: style.bg, color: style.color }}>
        <span className="text-[9px] font-bold tracking-wider">{month}</span>
        <span className="text-lg font-extrabold leading-none">{day}</span>
      </div>
      <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--t-text)" }}>{event.title}</p>
      <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
        {event.location || ""}
        {event.end_date && event.end_date !== event.start_date ? ` · ${Math.ceil((new Date(event.end_date) - new Date(event.start_date)) / 86400000) + 1} days` : ""}
      </p>
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md mt-2" style={{ backgroundColor: style.bg, color: style.color }}>{event.event_type}</span>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Dashboard ── */
/* ══════════════════════════════════════════ */
export default function Dashboard() {
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [spotlightExpanded, setSpotlightExpanded] = useState(false);
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/programs"),
      api.get("/events"),
      api.get("/interactions"),
      api.get("/athlete-profile").catch(() => ({ data: {} })),
      api.get("/gmail/status").catch(() => ({ data: { connected: false } })),
    ])
      .then(([progRes, evtRes, intRes, profRes, gmailRes]) => {
        setPrograms(progRes.data || []);
        setEvents(evtRes.data || []);
        setInteractions(Array.isArray(intRes.data) ? intRes.data : []);
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
  const athleteName = profile?.athlete_name || profile?.name || "";
  const firstName = athleteName.split(" ")[0] || "there";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const totalSchools = programs.length;
  const contacted = programs.filter(p => p.recruiting_status && p.recruiting_status !== "Not Contacted" && p.recruiting_status !== "Not a Fit / Closed").length;
  const replied = programs.filter(p => p.reply_status === "Replied").length;
  const responseRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

  // Replies this week
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const repliesThisWeek = interactions.filter(i =>
    i.type === "coach_reply" && i.date_time && i.date_time >= weekAgo
  );
  const lastReply = repliesThisWeek.length > 0
    ? repliesThisWeek.sort((a, b) => (b.date_time || "").localeCompare(a.date_time || ""))[0]
    : null;

  // Awaiting reply
  const awaitingReply = programs.filter(p =>
    p.recruiting_status && p.recruiting_status !== "Not Contacted" && p.recruiting_status !== "Not a Fit / Closed"
    && p.reply_status !== "Replied"
  );

  const today = now.toISOString().split("T")[0];

  // Follow-ups due (overdue + today)
  const followUpsDue = programs.filter(p =>
    p.next_action_due && p.next_action_due <= today
    && p.recruiting_status !== "Not a Fit / Closed"
  ).sort((a, b) => (a.next_action_due || "").localeCompare(b.next_action_due || ""));

  // Needs first outreach
  const needsOutreach = programs.filter(p =>
    p.recruiting_status === "Not Contacted"
  ).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  // Spotlight: active programs that aren't closed or not contacted
  const spotlightSchools = programs.filter(p =>
    p.recruiting_status && p.recruiting_status !== "Not Contacted" && p.recruiting_status !== "Not a Fit / Closed"
  ).sort((a, b) => {
    // Prioritize those with overdue follow-ups
    const aOverdue = a.next_action_due && a.next_action_due <= today ? 0 : 1;
    const bOverdue = b.next_action_due && b.next_action_due <= today ? 0 : 1;
    return aOverdue - bOverdue || (b.updated_at || "").localeCompare(a.updated_at || "");
  });

  // Pipeline status counts
  const statusMap = {};
  programs.forEach(p => { const s = p.recruiting_status || "Not Contacted"; statusMap[s] = (statusMap[s] || 0) + 1; });
  const pipelineStatuses = [
    { key: "Not Contacted", label: "Not\nContacted", color: "#6b7280" },
    { key: "Contacted", label: "Contacted", color: "#3b82f6" },
    { key: "Actively Recruiting", label: "Actively\nRecruiting", color: "#a855f7" },
    { key: "Active Communication", label: "In\nConversation", color: "#ec4899" },
    { key: "Offer Received", label: "Offer\nReceived", color: "#10b981" },
    { key: "Not a Fit / Closed", label: "Closed", color: "#ef4444" },
  ];
  const maxPipeline = Math.max(...pipelineStatuses.map(s => statusMap[s.key] || 0), 1);

  // Division breakdown for legend
  const divColors = { D1: "#10b981", D2: "#3b82f6", D3: "#a855f7", NAIA: "#f59e0b", JUCO: "#ef4444" };
  const divCounts = {};
  programs.forEach(p => { const d = p.division || "Unknown"; if (d !== "Unknown") divCounts[d] = (divCounts[d] || 0) + 1; });

  // Recent activity (last 7 interactions)
  const recentActivity = interactions.slice(0, 7);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diff = (now - d) / 1000;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return "Yesterday";
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const interactionDotColor = (type) => {
    const t = (type || "").toLowerCase();
    if (t.includes("reply") || t.includes("coach")) return "#10b981";
    if (t.includes("email") || t.includes("follow")) return "#2ec4b6";
    if (t.includes("camp")) return "#f59e0b";
    if (t.includes("visit")) return "#06b6d4";
    if (t.includes("note")) return "#3b82f6";
    return "#a855f7";
  };

  const interactionTitle = (ix) => {
    const t = (ix.type || "").toLowerCase();
    const school = ix.university_name || "";
    if (t.includes("coach_reply") || t.includes("reply")) return { text: "Coach replied — ", highlight: school };
    if (t.includes("email") || t.includes("intro")) return { text: "Sent email to ", highlight: school };
    if (t.includes("follow")) return { text: "Sent follow-up to ", highlight: school };
    if (t.includes("visit")) return { text: "Campus visit at ", highlight: school };
    if (t.includes("showcase")) return { text: "Showcase for ", highlight: school };
    if (t.includes("camp")) return { text: "Attended camp at ", highlight: school };
    if (t.includes("call") || t.includes("phone")) return { text: "Phone call with ", highlight: school };
    return { text: `${ix.type || "Activity"} — `, highlight: school };
  };

  // Upcoming events
  const upcoming = events.filter(e => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 4);

  const getDaysAgo = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.ceil((now - d) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "1 day ago";
    return `${diff} days ago`;
  };

  return (
    <div className="space-y-5" data-testid="dashboard">
      <FirstReplyCelebration />

      {/* ═══ Section 1: Greeting + Quick Pulse ═══ */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }} data-testid="greeting-pulse">
        {/* Pink accent line */}
        <div style={{ height: 2, background: "linear-gradient(90deg, #e8456b 0%, rgba(232,69,107,0.2) 100%)" }} />
        <div className="flex items-start justify-between px-6 py-5 lg:px-7 lg:py-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight" style={{ color: "#ffffff" }}>
              {greeting}, <span style={{ color: "#e8456b" }}>{firstName}</span>
            </h2>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {athleteName ? `Here's what's happening with ${athleteName.split(" ")[0]}'s recruiting today` : "Here's your recruiting overview for today"}
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
            {dateStr}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <PulseStat icon={Target} iconBg="rgba(232,69,107,0.15)" iconColor="#e8456b" value={totalSchools} label="Schools Tracked" sub={needsOutreach.length > 0 ? `${needsOutreach.length} need outreach` : "All contacted"} dark onClick={() => navigate("/pipeline")} />
          <PulseStat icon={MessageCircle} iconBg="rgba(59,130,246,0.15)" iconColor="#60a5fa" value={`${responseRate}%`} label="Response Rate" sub={`${replied} of ${contacted} contacted`} dark />
          <PulseStat icon={Mail} iconBg="rgba(16,185,129,0.15)" iconColor="#34d399" value={repliesThisWeek.length} label="Replies This Week" sub={lastReply ? `Last: ${lastReply.university_name || ""}` : "—"} dark />
          <PulseStat icon={Clock} iconBg="rgba(245,158,11,0.15)" iconColor="#fbbf24" value={awaitingReply.length} label="Awaiting Reply" sub={awaitingReply.length > 0 ? `Oldest: ${getDaysAgo(awaitingReply.sort((a, b) => (a.last_follow_up || a.created_at || "").localeCompare(b.last_follow_up || b.created_at || ""))[0]?.last_follow_up || "")}` : "—"} dark />
        </div>
      </div>

      {/* ═══ Section 2: Today's Actions ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="todays-actions">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
              <Zap className="w-4 h-4" style={{ color: "#ef4444" }} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Today's Actions</h3>
          </div>
          <button onClick={() => navigate("/pipeline")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#2ec4b6" }} data-testid="view-all-schools-btn">
            View all schools <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Follow-ups Due */}
          <div className="border-r-0 lg:border-r" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Follow-ups Due</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{followUpsDue.length}</span>
            </div>
            {followUpsDue.length > 0 ? followUpsDue.slice(0, 4).map((p, i) => (
              <ActionRow
                key={p.program_id}
                domain={p.domain}
                school={p.university_name}
                detail={p.next_action_due === today ? "Follow-up due today" : `Follow-up overdue · ${getDaysAgo(p.next_action_due)}`}
                badge={p.next_action_due === today ? "Today" : "Overdue"}
                badgeBg={p.next_action_due === today ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"}
                badgeColor={p.next_action_due === today ? "#f59e0b" : "#ef4444"}
                onClick={() => navigate(`/journey/${p.program_id}`)}
              />
            )) : (
              <div className="text-center py-8 px-5">
                <CheckCircle className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>All caught up! No follow-ups due.</p>
              </div>
            )}
          </div>
          {/* Right: Needs First Outreach */}
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-t lg:border-t-0" style={{ borderColor: "var(--t-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>Needs First Outreach</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>{needsOutreach.length}</span>
            </div>
            {needsOutreach.length > 0 ? needsOutreach.slice(0, 4).map((p, i) => (
              <ActionRow
                key={p.program_id}
                domain={p.domain}
                school={p.university_name}
                detail={`${p.division || "—"} · Added ${getDaysAgo(p.created_at?.split("T")[0] || "")} · No contact yet`}
                badge={p.division || "—"}
                badgeBg="rgba(168,85,247,0.12)"
                badgeColor="#a855f7"
                onClick={() => navigate(`/journey/${p.program_id}`)}
              />
            )) : (
              <div className="text-center py-8 px-5">
                <Send className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>All schools contacted!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Section 3: School Spotlight ═══ */}
      {spotlightSchools.length > 0 && (
        <div data-testid="school-spotlight" className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(168,85,247,0.12)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>School Spotlight</h3>
            </div>
            {spotlightSchools.length > 4 && (
              <button
                onClick={() => setSpotlightExpanded(!spotlightExpanded)}
                className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ color: "#2ec4b6" }}
                data-testid="spotlight-toggle-btn"
              >
                {spotlightExpanded ? "Show less" : `View all ${spotlightSchools.length}`}
                {spotlightExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {(spotlightExpanded ? spotlightSchools : spotlightSchools.slice(0, 6)).map(p => (
              <SpotlightCard key={p.program_id} program={p} onClick={() => navigate(`/journey/${p.program_id}`)} />
            ))}
            <div
              className="min-w-[250px] max-w-[250px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
              onClick={() => navigate("/knowledge-base")}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--t-border-strong)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--t-border)"}
              data-testid="add-school-spotlight"
            >
              <span className="text-2xl mb-1" style={{ color: "var(--t-text-faint)" }}>+</span>
              <span className="text-xs font-semibold">Browse Schools</span>
              <span className="text-[11px] mt-0.5" style={{ color: "var(--t-text-faint)" }}>Find more programs</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Section 4 + 5: Pipeline + Activity ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pipeline Snapshot */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="pipeline-snapshot">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(232,98,138,0.12)" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "#2ec4b6" }} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Pipeline Snapshot</h3>
            </div>
            <button onClick={() => navigate("/pipeline")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#2ec4b6" }} data-testid="open-board-btn">
              Open board <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {totalSchools > 0 ? (
            <>
              <div className="px-6 py-5">
                <div className="flex gap-2 items-end" style={{ height: "130px" }}>
                  {pipelineStatuses.map(s => (
                    <FunnelBar key={s.key} count={statusMap[s.key] || 0} maxCount={maxPipeline} label={s.label} color={s.color} />
                  ))}
                </div>
              </div>
              {Object.keys(divCounts).length > 0 && (
                <div className="flex gap-5 justify-center px-5 py-3 border-t" style={{ borderColor: "var(--t-border)" }}>
                  {Object.entries(divCounts).map(([div, count]) => (
                    <div key={div} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded" style={{ backgroundColor: divColors[div] || "#6b7280" }} />
                      <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{div} · {count}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 px-5">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Add schools to see your pipeline</p>
              <button onClick={() => navigate("/knowledge-base")} className="mt-2 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "#2ec4b6" }}>+ Add a school</button>
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="recent-activity">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
                <Activity className="w-4 h-4" style={{ color: "#3b82f6" }} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Recent Activity</h3>
            </div>
          </div>
          {recentActivity.length > 0 ? (
            <div>
              {recentActivity.map((ix, i) => {
                const t = interactionTitle(ix);
                return (
                  <FeedItem
                    key={ix.interaction_id || i}
                    dotColor={interactionDotColor(ix.type)}
                    title={t.text}
                    titleHighlight={t.highlight}
                    detail={ix.notes || ix.outcome || ""}
                    time={formatTimeAgo(ix.date_time || ix.created_at)}
                    showLine={i < recentActivity.length - 1}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-5">
              <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No activity yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-faint)" }}>Start by contacting a school</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Section 6: Upcoming Events ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="upcoming-events">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
              <Calendar className="w-4 h-4" style={{ color: "#f59e0b" }} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Coming Up</h3>
          </div>
          <button onClick={() => navigate("/calendar")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#2ec4b6" }} data-testid="open-calendar-btn">
            Open calendar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {upcoming.length > 0 ? (
          <div className="flex flex-col lg:flex-row">
            {upcoming.map(evt => (
              <EventCard key={evt.event_id} event={evt} onClick={() => navigate("/calendar")} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-5">
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No upcoming events</p>
            <button onClick={() => navigate("/calendar")} className="mt-2 text-sm font-semibold transition-opacity hover:opacity-80" style={{ color: "#2ec4b6" }}>+ Add event</button>
          </div>
        )}
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="max_schools" currentTier={subscription?.tier || "basic"} />
    </div>
  );
}
