import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, AlertTriangle, Clock, MessageSquare, Archive, Send,
  ChevronRight, X, Loader2, Filter, PartyPopper, Rocket, CheckCircle2,
  MapPin, Lightbulb, Sparkles
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import EmptyBoardState from "./pipeline/EmptyBoardState";

/* ── Stage Config (Clean palette) ── */
const STAGES = {
  overdue:          { label: "Overdue",         shortLabel: "Overdue",   icon: AlertTriangle, ring: "#dc2626",  opacity: 1 },
  needs_outreach:   { label: "Needs Outreach",  shortLabel: "Outreach",  icon: Send,          ring: "#2ec4b6",  opacity: 1 },
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
  const activeStages = STAGE_ORDER.filter(k => (counts[k] || 0) > 0);

  const gradientStops = [];
  let accumulated = 0;
  activeStages.forEach(k => {
    const pct = (counts[k] || 0) / Math.max(total, 1) * 100;
    gradientStops.push(`${STAGES[k].ring} ${accumulated}% ${accumulated + pct}%`);
    accumulated += pct;
  });
  if (accumulated < 100) {
    gradientStops.push(`var(--t-border, #e5e7eb) ${accumulated}% 100%`);
  }

  const gradient = gradientStops.length > 0
    ? `conic-gradient(from 0deg, ${gradientStops.join(", ")})`
    : `conic-gradient(var(--t-border, #e5e7eb) 0% 100%)`;

  return (
    <div className="flex items-center gap-4" data-testid="progress-ring">
      <div className="flex-shrink-0 w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full flex items-center justify-center" style={{ background: gradient }}>
        <div className="w-[76px] h-[76px] md:w-[108px] md:h-[108px] rounded-full flex flex-col items-center justify-center" style={{ backgroundColor: "var(--t-surface, #fff)" }}>
          <span className="text-xl md:text-3xl font-extrabold" style={{ color: "var(--t-text)", lineHeight: 1 }}>{total}</span>
          <span className="text-[9px] md:text-xs" style={{ color: "var(--t-text-muted)" }}>schools</span>
        </div>
      </div>
      <div className="flex flex-col gap-y-1.5">
        {activeStages.map(k => (
          <div key={k} className="flex items-center gap-1.5 text-[10px] md:text-sm">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGES[k].ring }} />
            <span className="font-bold" style={{ color: "var(--t-text)", minWidth: 10 }}>{counts[k]}</span>
            <span style={{ color: "var(--t-text-muted)" }}>{STAGES[k].shortLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══ Custom Pipeline Tour ═══ */
function PipelineTour({ step, steps, onNext, onBack, onClose }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (step < 0 || step >= steps.length) { setPos(null); return; }
    const el = document.querySelector(steps[step].target);
    if (!el) { setPos(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setPos(null); return; }
      // Clamp to visible viewport so tall/off-screen elements still show the tooltip
      const visTop = Math.max(0, rect.top);
      const visBottom = Math.min(window.innerHeight, rect.bottom);
      const visHeight = Math.max(visBottom - visTop, 40);
      setPos({ top: visTop, left: rect.left, width: rect.width, height: visHeight });
    };
    const t1 = setTimeout(update, 400);
    const t2 = setTimeout(update, 700);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [step, steps]);

  if (step < 0 || step >= steps.length || !pos) return null;
  const s = steps[step];
  const isLast = step === steps.length - 1;

  // Position tooltip below or above target, clamped to viewport
  const tooltipBelow = pos.top + pos.height + 200 < window.innerHeight;
  const tooltipStyle = {
    position: "fixed",
    zIndex: 10002,
    left: Math.max(12, Math.min(pos.left, window.innerWidth - 340)),
    maxWidth: 320,
    ...(tooltipBelow
      ? { top: Math.min(pos.top + pos.height + 12, window.innerHeight - 220) }
      : { top: Math.max(12, pos.top - 200) }),
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10000]"
        style={{ background: "rgba(0,0,0,0.55)", pointerEvents: "auto" }}
        onClick={onClose}
      />
      {/* Spotlight cutout */}
      <div
        className="fixed z-[10001] rounded-xl transition-all duration-300"
        style={{
          top: pos.top - 6, left: pos.left - 6,
          width: pos.width + 12, height: Math.min(pos.height + 12, window.innerHeight - pos.top + 6),
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          pointerEvents: "none",
        }}
      />
      {/* Tooltip */}
      <div style={tooltipStyle} className="rounded-xl shadow-2xl" data-testid="tour-tooltip">
        <div style={{ background: "#1e1e2e", borderRadius: 12, padding: "18px 20px" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold" style={{ color: "#2ec4b6" }}>{step + 1} of {steps.length}</span>
            <button onClick={onClose} className="text-xs" style={{ color: "#666" }}>Skip</button>
          </div>
          <h4 className="text-sm font-bold mb-1" style={{ color: "#f1f1f1" }}>{s.title}</h4>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#aaa" }}>{s.content}</p>
          <div className="flex items-center gap-2 justify-end">
            {step > 0 && (
              <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#999" }}>Back</button>
            )}
            <button
              onClick={isLast ? onClose : onNext}
              className="text-xs px-4 py-1.5 rounded-lg font-semibold"
              style={{ backgroundColor: "#2ec4b6", color: "#fff" }}
              data-testid="tour-next-btn"
            >
              {isLast ? "Done!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
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
  const kickerColor = isUrgent ? "#f87171" : "#2ec4b6";

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
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ color: kickerColor, background: "rgba(46,196,182,0.12)" }}>
              {urgencyText}
            </span>
          )}
        </div>

        <p className="text-lg font-extrabold mb-1.5 leading-tight tracking-tight text-white">{program.university_name}</p>

        <div className="flex items-center gap-2 mb-2.5">
          {divLabel && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(46,196,182,0.12)", color: "rgba(255,255,255,0.6)" }}>{divLabel}</span>}
          {conf && <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}><MapPin className="w-2.5 h-2.5" />{conf}</span>}
          {loc && <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{loc}</span>}
        </div>

        {advice && (
          <div className="rounded-lg p-3 flex gap-2.5" style={{ background: "rgba(46,196,182,0.06)", border: "1px solid rgba(46,196,182,0.12)", borderLeft: "3px solid #2ec4b6" }}>
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#2ec4b6" }} />
            <div>
              <span className="text-[10px] font-bold block mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>What to do next</span>
              <p className="text-[13px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{advice}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex sm:flex-col gap-1.5 flex-shrink-0 sm:min-w-[130px]">
        {quickAction && (
          <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer w-full"
            style={{ background: "#2ec4b6", color: "white", border: "none" }}
            onClick={() => onAction(program)} data-testid="hero-action-btn">
            <Send className="w-3 h-3" />{quickAction.label}
          </button>
        )}
        {!quickAction && (
          <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer w-full"
            style={{ background: "#2ec4b6", color: "white", border: "none" }}
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
        style={{ background: "#2ec4b6", color: "white", border: "none" }}
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
        className="w-full px-3 py-2 rounded-lg border text-xs resize-none outline-none focus:ring-1 focus:ring-teal-700"
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
              background: isUrgent ? "rgba(220,38,38,0.06)" : "rgba(46,196,182,0.07)",
              color: isUrgent ? "#dc2626" : "#2ec4b6",
              border: `1px solid ${isUrgent ? "rgba(220,38,38,0.08)" : "rgba(46,196,182,0.08)"}`,
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
  const [tourStep, setTourStep] = useState(-1);

  const tourSteps = [
    {
      target: '[data-testid="progress-section"]',
      title: "Pipeline Overview",
      content: "This shows how many schools you're tracking and where each one stands in the recruiting process.",
    },
    {
      target: '[data-testid="hero-card"]',
      title: "Your #1 Priority",
      content: "We surface the most important action you need to take right now. No guessing — just do this next.",
    },
    {
      target: '[data-testid="filter-chips"]',
      title: "Filter by Stage",
      content: "Quickly see all schools in Outreach, Waiting, Replied, or any stage. Numbers update as you progress.",
    },
    {
      target: '[data-testid="school-list"]',
      title: "Your School List",
      content: "Every school you're tracking lives here. Click any school to see its full journey and log activity.",
    },
    {
      target: '[data-testid="add-school-btn"]',
      title: "Add Schools",
      content: "Browse 1,000+ volleyball programs with coach contacts, school stats, and more.",
    },
  ];

  // Auto-start tour on first visit (check backend, not just localStorage)
  useEffect(() => {
    if (groupedData.total > 0 && !loading) {
      const hasSeenLocal = localStorage.getItem("pipeline_tour_done");
      if (hasSeenLocal) return; // Already seen locally, skip API call
      api.get("/user/tours").then(res => {
        if (res.data?.pipeline_tour) {
          localStorage.setItem("pipeline_tour_done", "true");
        } else {
          setTimeout(() => setTourStep(0), 800);
        }
      }).catch(() => {
        // Fallback: show tour if API fails and localStorage not set
        setTimeout(() => setTourStep(0), 800);
      });
    }
  }, [groupedData.total, loading]);

  const closeTour = () => {
    setTourStep(-1);
    localStorage.setItem("pipeline_tour_done", "true");
    api.post("/user/tours/pipeline_tour/complete").catch(() => {});
  };

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
  const boardNames = new Set(allPrograms.map(p => p.university_name));

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
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(46,196,182,0.1)" }}>
              <PartyPopper className="w-10 h-10" style={{ color: "#2ec4b6" }} />
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
            style={{ backgroundColor: "#2ec4b6", color: "white", boxShadow: "0 4px 14px rgba(46,196,182,0.3)" }}
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
      {/* Custom Tour */}
      <PipelineTour step={tourStep} steps={tourSteps} onNext={() => setTourStep(s => s + 1)} onBack={() => setTourStep(s => s - 1)} onClose={closeTour} />
      {/* Tour replay button */}
      {total > 0 && tourStep < 0 && (
        <button
          onClick={() => setTourStep(0)}
          className="fixed bottom-20 right-4 z-50 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#2ec4b6", color: "#fff" }}
          data-testid="tour-replay-btn"
          title="Take the tour"
        >
          ?
        </button>
      )}
      {/* Empty Board */}
      {total === 0 && (
        <EmptyBoardState onSchoolAdded={fetchPrograms} />
      )}

      {/* Top: Ring + Hero */}
      {total > 0 && (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-[auto_1fr] items-stretch">
          <div className="rounded-xl border p-3 md:p-5 flex items-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="progress-section">
            <ProgressRing counts={counts} total={total} />
          </div>
          {markRepliedProgram ? (
            <InlineMarkReplied program={markRepliedProgram} onSaved={() => { setMarkRepliedProgram(null); fetchPrograms(); }} onCancel={() => setMarkRepliedProgram(null)} />
          ) : focusProgram ? (
            <HeroCard program={focusProgram} onAction={handleFocusAction} onSnooze={handleSnooze} onDismiss={(p) => setMarkRepliedProgram(p)} navigate={navigate} />
          ) : allCaughtUp ? (
            <AllCaughtUpCard navigate={navigate} />
          ) : <div />}
        </div>
      )}

      {/* Chips + Filters */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto" data-testid="filter-chips">
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
                style={{ background: "#2ec4b6", padding: "6px 14px", height: "auto" }}
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
        <div className="flex flex-col" data-testid="school-list">
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
