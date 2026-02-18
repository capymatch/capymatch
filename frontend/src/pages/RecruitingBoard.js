import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, AlertTriangle, Clock, MessageSquare, Archive, Sparkles,
  Mail, AlertCircle, CheckCircle2, Send, ChevronRight, X, Loader2,
  ArrowRight, Filter, PartyPopper, Rocket
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import EmptyBoardState from "./pipeline/EmptyBoardState";
import UniversityLogo from "../components/UniversityLogo";

/* ── Stage Config ── */
const STAGES = {
  overdue:          { label: "Overdue",          icon: AlertTriangle,  color: "rose",    ring: "#f43f5e" },
  needs_outreach:   { label: "Needs Outreach",   icon: Send,           color: "amber",   ring: "#f59e0b" },
  waiting_on_reply: { label: "Waiting on Reply",  icon: Clock,          color: "blue",    ring: "#3b82f6" },
  in_conversation:  { label: "In Conversation",  icon: MessageSquare,  color: "emerald", ring: "#10b981" },
  archived:         { label: "Archived",         icon: Archive,        color: "gray",    ring: "#6b7280" },
};

const STAGE_ORDER = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"];

const pillClass = (color) => ({
  rose:    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
  amber:   "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  blue:    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  gray:    "bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25",
}[color]);

/* ── Contextual subtitle for each program ── */
function getSubtitle(p) {
  const s = p.signals || {};
  const stage = p.board_group;
  if (stage === "overdue" && p.next_action_due) {
    const days = Math.abs(Math.ceil((new Date(p.next_action_due) - new Date()) / 86400000));
    return `Follow-up was due ${days} day${days !== 1 ? "s" : ""} ago`;
  }
  if (stage === "needs_outreach") return "Send your first email to introduce yourself";
  if (stage === "waiting_on_reply") {
    if (s.days_since_outreach !== null && s.days_since_outreach !== undefined)
      return `Reached out ${s.days_since_outreach} day${s.days_since_outreach !== 1 ? "s" : ""} ago — no reply yet`;
    return "Waiting to hear back from coach";
  }
  if (stage === "in_conversation") {
    if (s.days_since_reply !== null && s.days_since_reply !== undefined) {
      if (s.days_since_reply === 0) return "Coach replied today";
      return `Coach replied ${s.days_since_reply} day${s.days_since_reply !== 1 ? "s" : ""} ago`;
    }
    return "In active conversation with coach";
  }
  if (stage === "archived") return "Not pursuing";
  return "";
}

/* ── Quick action label for each stage ── */
function getQuickAction(stage) {
  if (stage === "overdue") return { label: "Follow Up", icon: Send };
  if (stage === "needs_outreach") return { label: "Start Outreach", icon: Send };
  if (stage === "waiting_on_reply") return { label: "Follow Up", icon: Send };
  return null;
}

/* ── Progress Ring (SVG donut) ── */
function ProgressRing({ counts, total }) {
  const size = 130;

  // Build conic-gradient segments
  const segments = STAGE_ORDER.filter(k => (counts[k] || 0) > 0).map(k => ({
    key: k, count: counts[k], pct: (counts[k] / Math.max(total, 1)) * 100, color: STAGES[k].ring
  }));

  let gradientParts = [];
  let cumPct = 0;
  segments.forEach(seg => {
    gradientParts.push(`${seg.color} ${cumPct}% ${cumPct + seg.pct}%`);
    cumPct += seg.pct;
  });
  // Fill remaining with transparent if needed
  if (cumPct < 100) gradientParts.push(`rgba(255,255,255,0.08) ${cumPct}% 100%`);

  const gradient = `conic-gradient(from 0deg, ${gradientParts.join(", ")})`;

  return (
    <div className="flex items-center gap-6" data-testid="progress-ring">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {/* Donut via conic-gradient + mask */}
        <div
          className="rounded-full"
          style={{
            width: size, height: size,
            background: gradient,
            WebkitMask: `radial-gradient(circle, transparent ${size/2 - 18}px, black ${size/2 - 17}px)`,
            mask: `radial-gradient(circle, transparent ${size/2 - 18}px, black ${size/2 - 17}px)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{total}</span>
          <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>schools</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {STAGE_ORDER.filter(k => (counts[k] || 0) > 0).map(k => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGES[k].ring }} />
            <span className="text-xs font-medium" style={{ color: "var(--t-text)" }}>{counts[k]}</span>
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{STAGES[k].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Focus Card ── */
function FocusCard({ program, onAction, onSnooze, onDismiss }) {
  if (!program) return null;
  const stage = program.board_group;
  const cfg = STAGES[stage];
  const subtitle = getSubtitle(program);
  const action = getQuickAction(stage);
  const isUrgent = stage === "overdue";

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all h-full ${isUrgent ? "border-rose-500/30 bg-rose-500/[0.04]" : "border-pink-600/20 bg-pink-600/[0.03]"}`}
      style={{ borderColor: isUrgent ? undefined : "var(--t-border)" }}
      data-testid="focus-card"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? "bg-rose-500/15" : "bg-pink-600/10"}`}>
          {isUrgent ? <AlertTriangle className="w-5 h-5 text-rose-400" /> : <cfg.icon className="w-5 h-5 text-pink-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${isUrgent ? "text-rose-400" : "text-pink-500"}`}>
              {isUrgent ? "Needs Attention" : "Up Next"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pillClass(cfg.color)}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-base font-semibold mb-0.5" style={{ color: "var(--t-text)" }}>{program.university_name}</p>
          <p className="text-xs mb-3" style={{ color: "var(--t-text-muted)" }}>{subtitle}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {action && (
              <Button
                className={`text-xs h-8 px-4 ${isUrgent ? "bg-rose-600 hover:bg-rose-700" : "bg-pink-700 hover:bg-pink-800"} text-white shadow-md`}
                onClick={() => onAction(program)}
                data-testid="focus-card-action"
              >
                <action.icon className="w-3.5 h-3.5 mr-1.5" />{action.label}
              </Button>
            )}
            {stage === "overdue" && (
              <Button size="sm" variant="outline" className="text-xs h-8"
                style={{ color: "var(--t-text-muted)", borderColor: "var(--t-border)" }}
                onClick={() => onSnooze(program)}
                data-testid="focus-card-snooze"
              >
                Snooze 3 days
              </Button>
            )}
            {stage === "waiting_on_reply" && (
              <Button size="sm" variant="outline" className="text-xs h-8 border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/10"
                onClick={() => onDismiss(program)}
                data-testid="focus-card-mark-replied"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Mark as Replied
              </Button>
            )}
          </div>
        </div>
        <button onClick={() => onAction(program)} className="text-pink-500 hover:text-pink-400 p-1 flex-shrink-0" data-testid="focus-card-go">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ── Mark Replied Inline Modal ── */
function InlineMarkReplied({ program, onSaved, onCancel }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!note.trim()) { toast.error("Describe what the coach said"); return; }
    setSaving(true);
    try {
      await api.post(`/programs/${program.program_id}/mark-replied`, { note: note.trim() });
      toast.success(`${program.university_name} moved to In Conversation`);
      onSaved();
    } catch { toast.error("Failed to log reply"); } finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="inline-mark-replied">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />Mark {program.university_name} as Replied
        </p>
        <button onClick={onCancel} className="p-1 rounded hover:bg-white/5"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <textarea placeholder="What did the coach say?" value={note} onChange={e => setNote(e.target.value)} rows={2}
        className="w-full px-3 py-2 rounded-lg border text-xs resize-none outline-none focus:ring-1 focus:ring-emerald-600"
        style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
        data-testid="inline-replied-note" />
      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs w-full h-8" onClick={save} disabled={saving} data-testid="inline-replied-save">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}Log Coach Reply
      </Button>
    </div>
  );
}

/* ── School Card (Smart List) ── */
function SchoolCard({ p, navigate, matchScore, onMarkReplied }) {
  const stage = p.board_group || "needs_outreach";
  const cfg = STAGES[stage];
  const Icon = cfg.icon;
  const subtitle = getSubtitle(p);
  const divLabel = { D1: "D1", D2: "D2", D3: "D3", NAIA: "NAIA", JUCO: "JUCO" }[p.division] || "—";
  const divColor = { D1: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400", D2: "bg-blue-500/20 text-blue-600 dark:text-blue-400", D3: "bg-violet-500/20 text-violet-600 dark:text-violet-400", NAIA: "bg-orange-500/20 text-orange-600 dark:text-orange-400", JUCO: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" }[p.division] || "bg-gray-500/20 text-gray-600 dark:text-gray-400";
  const scoreColor = matchScore?.match_score >= 80 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : matchScore?.match_score >= 60 ? "text-amber-700 dark:text-amber-400 bg-amber-500/10" : "text-gray-600 dark:text-gray-400 bg-gray-500/10";

  const dueDateFormatted = p.next_action_due && stage !== "overdue"
    ? new Date(p.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const quickAction = getQuickAction(stage);

  return (
    <div
      className="group flex items-center gap-3 px-4 py-4 rounded-xl border transition-all hover:border-pink-600/20 cursor-pointer"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      onClick={() => navigate(`/journey/${p.program_id}`)}
      data-testid={`school-card-${p.program_id}`}
    >
      {/* University logo */}
      <UniversityLogo domain={p.domain} name={p.university_name} size={40} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</span>
          {matchScore && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreColor}`}>{matchScore.match_score}%</span>}
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${pillClass(cfg.color)}`}>
            <Icon className="w-2.5 h-2.5 inline mr-1" />{cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: "var(--t-text-muted)" }}>
          <span>{subtitle}</span>
          {dueDateFormatted && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
              <Clock className="w-2.5 h-2.5" />Due {dueDateFormatted}
            </span>
          )}
        </div>
      </div>

      {/* Quick action + navigate */}
      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {stage === "waiting_on_reply" && (
          <button
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
            onClick={() => onMarkReplied(p)}
            data-testid={`quick-mark-replied-${p.program_id}`}
          >
            <CheckCircle2 className="w-3 h-3" />Mark as Replied
          </button>
        )}
        {quickAction && (
          <button
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-pink-600 dark:text-pink-400 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/20 transition-colors"
            onClick={() => navigate(`/journey/${p.program_id}`)}
            data-testid={`quick-action-${p.program_id}`}
          >
            <quickAction.icon className="w-3 h-3" />{quickAction.label}
          </button>
        )}
        <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:text-pink-500 transition-all" style={{ color: "var(--t-text-muted)" }} />
      </div>
    </div>
  );
}

/* ── Filter Chips ── */
function FilterChips({ counts, total, active, onFilter }) {
  const chips = [
    { key: null, label: "All", count: total, color: "pink" },
    ...STAGE_ORDER.filter(k => (counts[k] || 0) > 0).map(k => ({ key: k, label: STAGES[k].label, count: counts[k], color: STAGES[k].color })),
  ];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 pt-1" data-testid="filter-chips">
      {chips.map(c => {
        const isActive = active === c.key;
        return (
          <button key={c.key || "all"} onClick={() => onFilter(isActive ? null : c.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 border ${
              isActive ? "ring-1 ring-pink-600 bg-pink-600/10 border-pink-600/30" : "hover:bg-white/[0.03] border-transparent"
            }`}
            style={!isActive ? { color: "var(--t-text-secondary)" } : {}}
            data-testid={`chip-${c.key || "all"}`}
          >
            <span className={isActive ? "text-pink-600 dark:text-pink-400" : ""}>{c.label}</span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-pink-600/20 text-pink-600 dark:text-pink-400" : `bg-${c.color}-500/10 text-${c.color}-600 dark:text-${c.color}-400`}`}>{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Main Board ── */
export default function RecruitingBoard() {
  const [groupedData, setGroupedData] = useState({ groups: {}, counts: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [activeFilter, setActiveFilter] = useState(null);
  const [matchScores, setMatchScores] = useState({});
  const [markRepliedProgram, setMarkRepliedProgram] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCongrats, setShowCongrats] = useState(false);

  // Handle congrats param
  useEffect(() => {
    if (searchParams.get("congrats") === "true") {
      setShowCongrats(true);
      searchParams.delete("congrats");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    api.get("/match-scores").then(res => {
      if (res.data?.scores) {
        const map = {};
        res.data.scores.forEach(s => { map[s.program_id] = s; });
        setMatchScores(map);
      }
    }).catch(() => {});
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const params = { grouped: true };
      if (search) params.search = search;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      const res = await api.get("/programs", { params });
      setGroupedData(res.data);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [search, filterDivision, filterRegion]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  useEffect(() => {
    if (!loading && location.hash) {
      setActiveFilter(location.hash.replace("#", ""));
    }
  }, [loading, location.hash]);

  // Build sorted flat list
  const allPrograms = [];
  for (const stage of STAGE_ORDER) {
    const progs = (groupedData.groups || {})[stage] || [];
    // Sort within stage: most stale first (longest days_since_outreach or days_since_activity)
    const sorted = [...progs].sort((a, b) => {
      const aD = a.signals?.days_since_activity ?? -1;
      const bD = b.signals?.days_since_activity ?? -1;
      return bD - aD;
    });
    allPrograms.push(...sorted);
  }

  const filteredPrograms = activeFilter
    ? allPrograms.filter(p => p.board_group === activeFilter)
    : allPrograms;

  // Focus card: first actionable program (overdue > waiting > needs_outreach)
  // Focus card: most urgent school (overdue first, then waiting_on_reply, then needs_outreach)
  const focusPriority = ["overdue", "waiting_on_reply", "needs_outreach"];
  const focusProgram = focusPriority.reduce((found, stage) =>
    found || allPrograms.find(p => p.board_group === stage), null
  );

  const handleFocusAction = (p) => navigate(`/journey/${p.program_id}`);
  const handleSnooze = async (p) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 3);
    try {
      await api.put(`/programs/${p.program_id}`, { next_action_due: newDate.toISOString().split("T")[0] });
      toast.success("Snoozed for 3 days");
      fetchPrograms();
    } catch { toast.error("Failed to snooze"); }
  };

  const { counts = {}, total = 0 } = groupedData;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading your board...</span>
        </div>
      </div>
    );
  }

  // All caught up state
  const allCaughtUp = total > 0 && !focusProgram;

  // Congrats screen — shown after first school is added
  if (showCongrats && total > 0) {
    const firstSchool = allPrograms[0];
    return (
      <div className="flex items-center justify-center min-h-[70vh]" data-testid="congrats-screen">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Celebration icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(232,69,107,0.1)" }}>
              <PartyPopper className="w-10 h-10" style={{ color: "#e8456b" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--t-text)", letterSpacing: "-0.5px" }}>
            Congratulations!
          </h1>
          <p className="text-base mb-2" style={{ color: "var(--t-text-secondary)" }}>
            You added <strong style={{ color: "var(--t-text)" }}>{firstSchool?.university_name || "your first school"}</strong> to your board.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--t-text-muted)" }}>
            Your recruiting journey starts now. Let's set up your first outreach.
          </p>

          <button
            className="inline-flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#e8456b", color: "white", boxShadow: "0 4px 14px rgba(232,69,107,0.3)" }}
            onClick={() => {
              if (firstSchool?.program_id) {
                navigate(`/journey/${firstSchool.program_id}`);
              } else {
                setShowCongrats(false);
              }
            }}
            data-testid="start-journey-btn"
          >
            <Rocket className="w-5 h-5" />
            Start Your Journey
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            className="block mx-auto mt-4 text-sm font-medium transition-colors"
            style={{ color: "var(--t-text-muted)" }}
            onClick={() => setShowCongrats(false)}
            data-testid="skip-congrats-btn"
          >
            or continue to My Schools
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="recruiting-board" className="flex flex-col gap-5">
      {/* ─── Empty Board State ─── */}
      {total === 0 && (
        <EmptyBoardState onSchoolAdded={fetchPrograms} />
      )}

      {/* ─── Top: Progress Ring + Focus Card ─── */}
      {total > 0 && (
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-5">
        {/* Progress Ring */}
        {total > 0 && (
          <div className="rounded-2xl border p-5 flex-shrink-0 flex items-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="progress-section">
            <ProgressRing counts={counts} total={total} />
          </div>
        )}

        {/* Focus Card or All Caught Up */}
        <div className="flex-1 min-w-0 flex flex-col">
          {focusProgram && !markRepliedProgram && (
            <FocusCard
              program={focusProgram}
              onAction={handleFocusAction}
              onSnooze={handleSnooze}
              onDismiss={(p) => setMarkRepliedProgram(p)}
            />
          )}
          {markRepliedProgram && (
            <InlineMarkReplied
              program={markRepliedProgram}
              onSaved={() => { setMarkRepliedProgram(null); fetchPrograms(); }}
              onCancel={() => setMarkRepliedProgram(null)}
            />
          )}
          {allCaughtUp && !markRepliedProgram && (
            <div className="rounded-2xl border p-6 text-center h-full" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="all-caught-up">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--t-text)" }}>You're on top of your recruiting!</p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>All schools are in conversation or archived. Time to add more?</p>
              <Button className="mt-3 bg-pink-700 hover:bg-pink-800 text-white text-xs h-8" onClick={() => navigate("/knowledge-base")} data-testid="add-more-schools">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add School
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ─── Filter Chips + Search ─── */}
      {total > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FilterChips counts={counts} total={total} active={activeFilter} onFilter={setActiveFilter} />
            <button onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-lg border transition-colors hover:bg-white/[0.03] flex-shrink-0 ml-auto"
              style={{ borderColor: "var(--t-border)" }}
              data-testid="toggle-filters"
            >
              <Filter className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
            </button>
            <Button data-testid="add-school-btn" onClick={() => navigate("/knowledge-base")}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs shadow-md flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />Add School
            </Button>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-2" data-testid="board-filters">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                <Input data-testid="board-search" placeholder="Search universities..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 border rounded-lg text-xs h-9"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
              </div>
              <Select value={filterDivision} onValueChange={setFilterDivision}>
                <SelectTrigger data-testid="filter-division" className="w-28 rounded-lg text-xs h-9" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger data-testid="filter-region" className="w-28 rounded-lg text-xs h-9" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                  <SelectItem value="all">All Regions</SelectItem>
                  {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ─── Smart List ─── */}
      {filteredPrograms.length > 0 && (
        <div className="flex flex-col gap-4" data-testid="smart-list">
          {filteredPrograms.map(p => (
            <SchoolCard key={p.program_id} p={p} navigate={navigate} matchScore={matchScores[p.program_id]} onMarkReplied={(prog) => setMarkRepliedProgram(prog)} />
          ))}
        </div>
      )}

      {/* Filtered empty state */}
      {activeFilter && filteredPrograms.length === 0 && (
        <div className="text-center py-8 text-xs" style={{ color: "var(--t-text-muted)" }} data-testid="filtered-empty">
          No schools in {STAGES[activeFilter]?.label || activeFilter}
        </div>
      )}
    </div>
  );
}
