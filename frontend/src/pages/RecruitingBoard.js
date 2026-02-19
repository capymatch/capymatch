import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, AlertTriangle, Clock, MessageSquare, Archive, Send,
  ChevronRight, X, Loader2, Filter, PartyPopper, Rocket, CheckCircle2,
  MapPin, Lightbulb
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import EmptyBoardState from "./pipeline/EmptyBoardState";
import UniversityLogo from "../components/UniversityLogo";

/* ── Stage Config (Clean palette) ── */
const STAGES = {
  overdue:          { label: "Overdue",         shortLabel: "Overdue",   icon: AlertTriangle, ring: "#dc2626",  opacity: 1 },
  needs_outreach:   { label: "Needs Outreach",  shortLabel: "Outreach",  icon: Send,          ring: "#e8456b",  opacity: 1 },
  waiting_on_reply: { label: "Waiting on Reply", shortLabel: "Waiting",   icon: Clock,         ring: "#f59e0b",  opacity: 1 },
  in_conversation:  { label: "In Conversation", shortLabel: "In Convo",  icon: MessageSquare, ring: "#10b981",  opacity: 1 },
  archived:         { label: "Archived",        shortLabel: "Archived",  icon: Archive,       ring: "#6b7280",  opacity: 1 },
};
const STAGE_ORDER = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"];

/* ── Contextual subtitle ── */
function getSubtitle(p) {
  const s = p.signals || {};
  const stage = p.board_group;
  if (stage === "overdue" && p.next_action_due) {
    const days = Math.abs(Math.ceil((new Date(p.next_action_due) - new Date()) / 86400000));
    return { text: `${days} day${days !== 1 ? "s" : ""} overdue`, urgent: true };
  }
  if (stage === "needs_outreach") return { text: "Send your first email to introduce yourself" };
  if (stage === "waiting_on_reply") {
    const d = s.days_since_outreach;
    const dueDate = p.next_action_due
      ? new Date(p.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : null;
    const base = d != null ? `Reached out ${d} day${d !== 1 ? "s" : ""} ago` : "Waiting to hear back";
    return { text: base + (dueDate ? ` · Due ${dueDate}` : "") };
  }
  if (stage === "in_conversation") {
    const d = s.days_since_reply;
    if (d === 0) return { text: "Coach replied today" };
    if (d != null) return { text: `Coach replied ${d} day${d !== 1 ? "s" : ""} ago` };
    return { text: "In active conversation with coach" };
  }
  if (stage === "archived") return { text: "Not pursuing" };
  return { text: "" };
}

/* ── What to do next text for hero card ── */
function getHeroAdvice(p) {
  if (!p) return "";
  const stage = p.board_group;
  const s = p.signals || {};
  if (stage === "overdue") {
    const days = p.next_action_due ? Math.abs(Math.ceil((new Date(p.next_action_due) - new Date()) / 86400000)) : "several";
    return `Coach hasn't heard from you in ${days} days. Send a short follow-up mentioning your recent results.`;
  }
  if (stage === "needs_outreach") return "This school matches your profile well. Send an introductory email with your highlight reel.";
  if (stage === "waiting_on_reply") {
    const d = s.days_since_outreach;
    return d > 5 ? "It's been a while since your outreach. Consider a brief follow-up." : "Give the coach a bit more time, then follow up.";
  }
  if (stage === "in_conversation") return "You've got momentum — keep the conversation going.";
  return "";
}

/* ── Quick action label ── */
function getQuickAction(stage) {
  if (stage === "overdue") return { label: "Follow Up", icon: Send };
  if (stage === "needs_outreach") return { label: "Start Outreach", icon: Send };
  if (stage === "waiting_on_reply") return { label: "Follow Up", icon: Send };
  return null;
}

/* ═══ Progress Ring ═══ */
function ProgressRing({ counts, total }) {
  const size = 80, thickness = 10;
  const activeStages = STAGE_ORDER.filter(k => (counts[k] || 0) > 0);

  // Build conic-gradient stops
  const gradientStops = [];
  let accumulated = 0;
  activeStages.forEach(k => {
    const pct = (counts[k] || 0) / Math.max(total, 1) * 100;
    gradientStops.push(`${STAGES[k].ring} ${accumulated}% ${accumulated + pct}%`);
    accumulated += pct;
  });
  // Fill remaining with border color
  if (accumulated < 100) {
    gradientStops.push(`var(--t-border, #e5e7eb) ${accumulated}% 100%`);
  }

  const gradient = gradientStops.length > 0
    ? `conic-gradient(from 0deg, ${gradientStops.join(", ")})`
    : `conic-gradient(var(--t-border, #e5e7eb) 0% 100%)`;

  return (
    <div className="flex flex-col items-center gap-3" data-testid="progress-ring">
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative"
      }}>
        <div style={{
          width: size - thickness * 2, height: size - thickness * 2,
          borderRadius: "50%", backgroundColor: "var(--t-surface, #fff)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <span className="text-xl font-extrabold" style={{ color: "var(--t-text)", lineHeight: 1 }}>{total}</span>
          <span className="text-[9px]" style={{ color: "var(--t-text-muted)" }}>schools</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 w-full">
        {activeStages.map(k => (
          <div key={k} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STAGES[k].ring }} />
            <span className="font-bold" style={{ color: "var(--t-text)", minWidth: 10 }}>{counts[k]}</span>
            <span style={{ color: "var(--t-text-muted)" }}>{STAGES[k].shortLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Dark + Pink Hero Card ═══ */
function HeroCard({ program, onAction, onSnooze, onDismiss, navigate }) {
  if (!program) return null;
  const stage = program.board_group;
  const isUrgent = stage === "overdue";
  const isWaiting = stage === "waiting_on_reply";
  const quickAction = getQuickAction(stage);
  const advice = getHeroAdvice(program);

  const kicker = isUrgent ? "Needs Attention" : stage === "needs_outreach" ? "Up Next" : stage === "waiting_on_reply" ? "Keeping Warm" : "Momentum";
  const kickerColor = isUrgent ? "#f87171" : "#e8456b";

  let urgencyText = "";
  if (isUrgent && program.next_action_due) {
    const days = Math.abs(Math.ceil((new Date(program.next_action_due) - new Date()) / 86400000));
    urgencyText = `${days} day${days !== 1 ? "s" : ""} overdue`;
  } else if (isWaiting && program.next_action_due) {
    const d = Math.ceil((new Date(program.next_action_due) - new Date()) / 86400000);
    urgencyText = d > 0 ? `Due in ${d} day${d !== 1 ? "s" : ""}` : "Due today";
  }

  const divLabel = program.division || "";
  const conf = program.conference || "";
  const loc = program.location || program.city_state || "";

  return (
    <div className="rounded-xl overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6" style={{ background: "#1e1e2e", padding: "16px 18px" }} data-testid="hero-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[1.5px] flex items-center gap-1" style={{ color: kickerColor }}>
            {isUrgent && <AlertTriangle className="w-3 h-3" />}
            {!isUrgent && isWaiting && <Clock className="w-3 h-3" />}
            {kicker}
          </span>
          {urgencyText && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ color: kickerColor, background: "rgba(232,69,107,0.12)" }}>
              {urgencyText}
            </span>
          )}
        </div>

        <p className="text-lg font-extrabold mb-1.5 leading-tight tracking-tight text-white">{program.university_name}</p>

        <div className="flex items-center gap-2 mb-2.5">
          {divLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(232,69,107,0.12)", color: "rgba(255,255,255,0.6)" }}>{divLabel}</span>}
          {conf && <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}><MapPin className="w-2.5 h-2.5" />{conf}</span>}
          {loc && <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{loc}</span>}
        </div>

        {advice && (
          <div className="rounded-lg p-3 flex gap-2.5" style={{ background: "rgba(232,69,107,0.06)", border: "1px solid rgba(232,69,107,0.12)", borderLeft: "3px solid #e8456b" }}>
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#e8456b" }} />
            <div>
              <span className="text-[10px] font-bold block mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>What to do next</span>
              <p className="text-[13px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{advice}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-shrink-0" style={{ minWidth: 130 }}>
        {quickAction && (
          <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer w-full"
            style={{ background: "#e8456b", color: "white", border: "none" }}
            onClick={() => onAction(program)} data-testid="hero-action-btn">
            <Send className="w-3 h-3" />{quickAction.label}
          </button>
        )}
        {!quickAction && (
          <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer w-full"
            style={{ background: "#e8456b", color: "white", border: "none" }}
            onClick={() => navigate(`/journey/${program.program_id}`)} data-testid="hero-action-btn">
            View Journey <ChevronRight className="w-3 h-3" />
          </button>
        )}
        {isUrgent && (
          <button className="flex items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-semibold cursor-pointer w-full"
            style={{ background: "transparent", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={() => onSnooze(program)} data-testid="hero-snooze-btn">
            Snooze 3 days
          </button>
        )}
        {isWaiting && (
          <button className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-[10px] font-semibold cursor-pointer w-full"
            style={{ background: "rgba(22,163,74,0.1)", color: "#4ade80", border: "1px solid rgba(22,163,74,0.15)" }}
            onClick={() => onDismiss(program)} data-testid="hero-mark-replied-btn">
            <CheckCircle2 className="w-3 h-3" />Mark Replied
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ All Caught Up Hero ═══ */
function AllCaughtUpCard({ navigate }) {
  return (
    <div className="rounded-xl overflow-hidden flex items-center gap-6" style={{ background: "#1e1e2e", padding: "18px 22px" }} data-testid="all-caught-up">
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-[1.5px] mb-1.5 block" style={{ color: "#4ade80" }}>All Caught Up</span>
        <p className="text-lg font-extrabold text-white mb-1 leading-tight">You're on top of recruiting!</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>All schools are in conversation or archived.</p>
      </div>
      <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer flex-shrink-0"
        style={{ background: "#e8456b", color: "white", border: "none" }}
        onClick={() => navigate("/knowledge-base")} data-testid="add-more-schools">
        <Plus className="w-3 h-3" />Add School
      </button>
    </div>
  );
}

/* ═══ Mark Replied Modal ═══ */
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
          <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />Mark {program.university_name} as Replied
        </p>
        <button onClick={onCancel} className="p-1 rounded hover:opacity-70"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <textarea placeholder="What did the coach say?" value={note} onChange={e => setNote(e.target.value)} rows={2}
        className="w-full px-3 py-2 rounded-lg border text-xs resize-none outline-none focus:ring-1 focus:ring-emerald-600"
        style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
        data-testid="inline-replied-note" />
      <Button className="text-white text-xs w-full h-8" style={{ background: "#16a34a" }} onClick={save} disabled={saving} data-testid="inline-replied-save">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}Log Coach Reply
      </Button>
    </div>
  );
}

/* ═══ Compact School Row ═══ */
function SchoolRow({ p, navigate, matchScore, onMarkReplied }) {
  const stage = p.board_group || "needs_outreach";
  const { text: subtitle, urgent } = getSubtitle(p);
  const quickAction = getQuickAction(stage);
  const isUrgent = stage === "overdue";
  const isConvo = stage === "in_conversation";

  // Extra info
  const conf = p.conference || "";
  const loc = p.location || p.city_state || "";
  const extra = [conf, loc].filter(Boolean).join(" · ");
  const subParts = [subtitle, extra].filter(Boolean).join(" · ");

  return (
    <div
      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
      style={{
        backgroundColor: "var(--t-surface)",
        borderColor: "var(--t-border)",
        borderLeft: isUrgent ? "3px solid #dc2626" : undefined,
      }}
      onClick={() => navigate(`/journey/${p.program_id}`)}
      data-testid={`school-card-${p.program_id}`}
    >
      <UniversityLogo domain={p.domain} name={p.university_name} size={32} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[13px] truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</span>
          {matchScore?.match_score && (
            <span className="text-[10px] font-bold" style={{ color: "var(--t-text-muted, #999)" }}>{matchScore.match_score}%</span>
          )}
          {p.division && (
            <span className="text-[9px] font-bold px-1.5 py-px rounded" style={{ background: "var(--t-surface-alt, #f5f5f5)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}>
              {p.division}
            </span>
          )}
          {isConvo && (
            <span className="text-[9px] font-semibold px-1.5 py-px rounded" style={{ background: "rgba(22,163,74,0.06)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.1)" }}>
              Active
            </span>
          )}
        </div>
        <div className="text-[11px] mt-px truncate" style={{ color: "var(--t-text-muted)" }}>
          {urgent ? <span style={{ color: "#dc2626", fontWeight: 500 }}>{subtitle}</span> : subParts}
          {!urgent && subtitle !== subParts && extra && ""}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {stage === "waiting_on_reply" && (
          <button
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors"
            style={{ background: "rgba(22,163,74,0.06)", color: "#16a34a", border: "1px solid rgba(22,163,74,0.08)" }}
            onClick={() => onMarkReplied(p)}
            data-testid={`quick-mark-replied-${p.program_id}`}
          >
            <CheckCircle2 className="w-3 h-3" />Mark Replied
          </button>
        )}
        {quickAction && (
          <button
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-colors"
            style={{
              background: isUrgent ? "rgba(220,38,38,0.06)" : "rgba(232,69,107,0.07)",
              color: isUrgent ? "#dc2626" : "#e8456b",
              border: `1px solid ${isUrgent ? "rgba(220,38,38,0.08)" : "rgba(232,69,107,0.08)"}`,
            }}
            onClick={() => navigate(`/journey/${p.program_id}`)}
            data-testid={`quick-action-${p.program_id}`}
          >
            <Send className="w-3 h-3" />{quickAction.label}
          </button>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 opacity-25 group-hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
    </div>
  );
}

/* ═══ Filter Chips ═══ */
function FilterChips({ counts, total, active, onFilter }) {
  const chips = [
    { key: null, label: "All", count: total },
    ...STAGE_ORDER.filter(k => (counts[k] || 0) > 0).map(k => ({
      key: k, label: STAGES[k].shortLabel, count: counts[k], isUrgent: k === "overdue"
    })),
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5" data-testid="filter-chips">
      {chips.map(c => {
        const isActive = active === c.key;
        return (
          <button key={c.key || "all"} onClick={() => onFilter(isActive ? null : c.key)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex-shrink-0 border whitespace-nowrap"
            style={isActive
              ? { background: "var(--t-text)", color: "var(--t-bg, #fff)", borderColor: "var(--t-text)" }
              : { background: "var(--t-surface)", color: "var(--t-text-secondary, #6b6b6b)", borderColor: "var(--t-border)" }
            }
            data-testid={`chip-${c.key || "all"}`}
          >
            {c.isUrgent && !isActive && <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#dc2626" }} />}
            {c.label}
            <span className="text-[10px] font-bold px-1 rounded" style={{ background: isActive ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.04)" }}>{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══ Section Divider ═══ */
function SectionLabel({ stage, count }) {
  const cfg = STAGES[stage];
  if (!cfg) return null;
  const isUrgent = stage === "overdue";
  return (
    <div className="text-[9px] font-bold uppercase tracking-[1.5px] pt-3 pb-1" style={{ color: isUrgent ? "#dc2626" : "var(--t-text-muted)" }} data-testid={`section-${stage}`}>
      {isUrgent && <span style={{ fontSize: 4, verticalAlign: "middle", marginRight: 4 }}>&#9679;</span>}
      {cfg.label}
    </div>
  );
}

/* ═══ Main Board ═══ */
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
    if (!loading && location.hash) setActiveFilter(location.hash.replace("#", ""));
  }, [loading, location.hash]);

  // Build sorted flat list
  const allPrograms = [];
  for (const stage of STAGE_ORDER) {
    const progs = (groupedData.groups || {})[stage] || [];
    const sorted = [...progs].sort((a, b) => (b.signals?.days_since_activity ?? -1) - (a.signals?.days_since_activity ?? -1));
    allPrograms.push(...sorted);
  }

  const filteredPrograms = activeFilter ? allPrograms.filter(p => p.board_group === activeFilter) : allPrograms;

  // Focus: most urgent
  const focusPriority = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];
  const focusProgram = focusPriority.reduce((found, stage) => found || allPrograms.find(p => p.board_group === stage), null);

  const handleFocusAction = (p) => navigate(`/journey/${p.program_id}`);
  const handleSnooze = async (p) => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    try {
      await api.put(`/programs/${p.program_id}`, { next_action_due: d.toISOString().split("T")[0] });
      toast.success("Snoozed for 3 days");
      fetchPrograms();
    } catch { toast.error("Failed to snooze"); }
  };

  const { counts = {}, total = 0 } = groupedData;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--t-border)", borderTopColor: "var(--t-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading your board...</span>
        </div>
      </div>
    );
  }

  const allCaughtUp = total > 0 && !focusProgram;

  // Congrats screen
  if (showCongrats && total > 0) {
    const firstSchool = allPrograms[0];
    return (
      <div className="flex items-center justify-center min-h-[70vh]" data-testid="congrats-screen">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(232,69,107,0.1)" }}>
              <PartyPopper className="w-10 h-10" style={{ color: "#e8456b" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--t-text)", letterSpacing: "-0.5px" }}>Congratulations!</h1>
          <p className="text-base mb-2" style={{ color: "var(--t-text-secondary)" }}>
            You added <strong style={{ color: "var(--t-text)" }}>{firstSchool?.university_name || "your first school"}</strong> to your board.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--t-text-muted)" }}>Your recruiting journey starts now.</p>
          <button
            className="inline-flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#e8456b", color: "white", boxShadow: "0 4px 14px rgba(232,69,107,0.3)" }}
            onClick={() => firstSchool?.program_id ? navigate(`/journey/${firstSchool.program_id}`) : setShowCongrats(false)}
            data-testid="start-journey-btn"
          >
            <Rocket className="w-5 h-5" />Start Your Journey<ChevronRight className="w-5 h-5" />
          </button>
          <button className="block mx-auto mt-4 text-sm font-medium" style={{ color: "var(--t-text-muted)" }} onClick={() => setShowCongrats(false)} data-testid="skip-congrats-btn">
            or continue to My Schools
          </button>
        </div>
      </div>
    );
  }

  // Group programs by stage for section rendering
  const groupedByStage = {};
  filteredPrograms.forEach(p => {
    const s = p.board_group || "needs_outreach";
    if (!groupedByStage[s]) groupedByStage[s] = [];
    groupedByStage[s].push(p);
  });

  return (
    <div data-testid="recruiting-board" className="flex flex-col gap-4">
      {/* Empty Board */}
      {total === 0 && <EmptyBoardState onSchoolAdded={fetchPrograms} />}

      {/* Top: Ring + Hero */}
      {total > 0 && (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-[180px_1fr]">
          <div className="rounded-xl border p-4 flex items-center justify-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="progress-section">
            <ProgressRing counts={counts} total={total} />
          </div>
          <div>
            {markRepliedProgram ? (
              <InlineMarkReplied program={markRepliedProgram} onSaved={() => { setMarkRepliedProgram(null); fetchPrograms(); }} onCancel={() => setMarkRepliedProgram(null)} />
            ) : focusProgram ? (
              <HeroCard program={focusProgram} onAction={handleFocusAction} onSnooze={handleSnooze} onDismiss={(p) => setMarkRepliedProgram(p)} navigate={navigate} />
            ) : allCaughtUp ? (
              <AllCaughtUpCard navigate={navigate} />
            ) : null}
          </div>
        </div>
      )}

      {/* Chips + Filters */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FilterChips counts={counts} total={total} active={activeFilter} onFilter={setActiveFilter} />
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <button onClick={() => setShowFilters(!showFilters)}
                className="p-1.5 rounded-lg border transition-colors hover:opacity-70"
                style={{ borderColor: "var(--t-border)" }}
                data-testid="toggle-filters"
              >
                <Filter className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
              </button>
              <Button data-testid="add-school-btn" onClick={() => navigate("/knowledge-base")}
                className="text-white text-xs shadow-md flex-shrink-0"
                style={{ background: "var(--t-text)", padding: "6px 14px", height: "auto" }}
              >
                <Plus className="w-3 h-3 mr-1" />Add School
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2" data-testid="board-filters">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                <Input data-testid="board-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 border rounded-lg text-xs h-8"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
              </div>
              <Select value={filterDivision} onValueChange={setFilterDivision}>
                <SelectTrigger data-testid="filter-division" className="w-28 rounded-lg text-xs h-8" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger data-testid="filter-region" className="w-28 rounded-lg text-xs h-8" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
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

      {/* School List with Section Headers */}
      {filteredPrograms.length > 0 && (
        <div className="flex flex-col" data-testid="smart-list">
          {STAGE_ORDER.filter(stage => groupedByStage[stage]?.length > 0).map(stage => (
            <React.Fragment key={stage}>
              {!activeFilter && <SectionLabel stage={stage} count={groupedByStage[stage].length} />}
              <div className="flex flex-col gap-1">
                {groupedByStage[stage].map(p => (
                  <SchoolRow key={p.program_id} p={p} navigate={navigate} matchScore={matchScores[p.program_id]} onMarkReplied={(prog) => setMarkRepliedProgram(prog)} />
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {activeFilter && filteredPrograms.length === 0 && (
        <div className="text-center py-8 text-xs" style={{ color: "var(--t-text-muted)" }} data-testid="filtered-empty">
          No schools in {STAGES[activeFilter]?.label || activeFilter}
        </div>
      )}
    </div>
  );
}
