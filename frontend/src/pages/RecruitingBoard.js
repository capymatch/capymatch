import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, ChevronRight, ChevronDown, X, Loader2, Filter,
  PartyPopper, Rocket, CheckCircle2, Send, Clock, MapPin,
  StickyNote, MessageSquare, AlertTriangle, Lightbulb, ClipboardCheck
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import EmptyBoardState from "./pipeline/EmptyBoardState";
import UniversityLogo from "../components/UniversityLogo";

/* ── Section Config ── */
const SECTIONS = [
  { key: "outreach", label: "Needs Outreach", color: "#1a8a80" },
  { key: "waiting", label: "Waiting on Reply", color: "#f59e0b" },
  { key: "convo", label: "In Conversation", color: "#16a34a" },
  { key: "committed", label: "Committed", color: "#d97706" },
];

const BAR_COLORS = { outreach: "#1a8a80", waiting: "#f59e0b", convo: "#16a34a", committed: "#d97706" };

/* ── Helpers ── */
function groupIntoSections(programs) {
  const s = { outreach: [], waiting: [], convo: [], committed: [] };
  for (const p of programs) {
    if (p.recruiting_status === "Committed") { s.committed.push(p); continue; }
    const g = p.board_group;
    if (g === "needs_outreach") s.outreach.push(p);
    else if (g === "waiting_on_reply" || g === "overdue") s.waiting.push(p);
    else if (g === "in_conversation") s.convo.push(p);
    else if (g !== "archived") s.outreach.push(p);
  }
  return s;
}

function getStatusStyle(status) {
  const map = {
    "Not Contacted": { bg: "var(--t-surface-alt, #f5f5f5)", color: "var(--t-text-muted, #888)" },
    "Contacted": { bg: "rgba(26,138,128,0.08)", color: "#1a8a80" },
    "Some Interest": { bg: "rgba(59,130,246,0.08)", color: "#3b82f6" },
    "Camp Attended": { bg: "rgba(139,92,246,0.08)", color: "#8b5cf6" },
    "Active Conversation": { bg: "rgba(16,185,129,0.08)", color: "#10b981" },
    "Offer Received": { bg: "rgba(245,158,11,0.08)", color: "#f59e0b" },
    "Offer / Commit Talk": { bg: "rgba(245,158,11,0.08)", color: "#f59e0b" },
    "Committed": { bg: "rgba(22,163,74,0.1)", color: "#16a34a" },
  };
  return map[status] || { bg: "var(--t-surface-alt, #f5f5f5)", color: "var(--t-text-muted, #888)" };
}

function getMatchColor(m) {
  if (m >= 50) return "#16a34a";
  if (m >= 25) return "#f59e0b";
  return "#999";
}

/* ── Pipeline Card ── */
function PipelineCard({ program: p, section, matchScore, navigate, forceExpand }) {
  const [expanded, setExpanded] = useState(false);
  const [interactions, setInteractions] = useState(null);
  const [loadingIx, setLoadingIx] = useState(false);

  useEffect(() => { setExpanded(!!forceExpand); }, [forceExpand]);

  const signals = p.signals || {};
  const ss = getStatusStyle(p.recruiting_status);
  const match = matchScore?.match_score;
  const mc = match ? getMatchColor(match) : "#999";

  // Urgency badge
  let urgency = null;
  if (p.board_group === "overdue" && p.next_action_due) {
    const days = Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000));
    urgency = { text: `${days}d overdue`, type: "red" };
  } else if (section === "waiting" && p.next_action_due) {
    const d = Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000);
    if (d <= 3 && d > 0) urgency = { text: `Due in ${d}d`, type: "amber" };
    else if (d <= 0) urgency = { text: "Due today", type: "amber" };
  }

  // Activity text
  const actText = signals.days_since_activity != null
    ? (signals.days_since_activity === 0 ? "Today" : `${signals.days_since_activity}d ago`)
    : "—";

  // Section-based action buttons (no Mark Replied per user request)
  const sectionActions = section === "outreach"
    ? [{ label: "Start Outreach", cls: "primary" }]
    : section === "waiting"
    ? [{ label: "Follow Up", cls: "warn" }]
    : [];

  const handleToggle = (e) => {
    if (e.target.closest("[data-stop]")) return;
    const next = !expanded;
    setExpanded(next);
    if (next && interactions === null) {
      setLoadingIx(true);
      api.get(`/interactions?program_id=${p.program_id}`)
        .then(res => setInteractions(Array.isArray(res.data) ? res.data.slice(0, 5) : []))
        .catch(() => setInteractions([]))
        .finally(() => setLoadingIx(false));
    }
  };

  const meta = [p.conference, p.location || p.city_state || p.state].filter(Boolean).join(" \u00b7 ");

  return (
    <div
      className={`flex rounded-xl border overflow-hidden transition-all cursor-pointer ${expanded ? "shadow-md" : "hover:shadow-sm"}`}
      style={{ backgroundColor: "var(--t-surface)", borderColor: expanded ? "var(--t-border-strong, #ddd)" : "var(--t-border)" }}
      onClick={handleToggle}
      data-testid={`pipeline-card-${p.program_id}`}
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: BAR_COLORS[section] }} />
      <div className="flex-1 px-4 py-3 min-w-0">
        {/* ── Compact Row ── */}
        <div className="flex items-center gap-3">
          <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={34} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</span>
              {p.division && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                  style={{ background: "var(--t-surface-alt, #f0f0f0)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}>
                  {p.division}
                </span>
              )}
              {urgency && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xl inline-flex items-center gap-1"
                  style={{
                    backgroundColor: urgency.type === "red" ? "rgba(220,38,38,0.08)" : "rgba(245,158,11,0.08)",
                    color: urgency.type === "red" ? "#dc2626" : "#d97706",
                  }}>
                  <Clock className="w-2.5 h-2.5" />{urgency.text}
                </span>
              )}
              {!urgency && actText !== "—" && section !== "outreach" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xl inline-flex items-center gap-1"
                  style={{ backgroundColor: "rgba(22,163,74,0.08)", color: "#16a34a" }}>
                  <CheckCircle2 className="w-2.5 h-2.5" />{actText}
                </span>
              )}
              {p.questionnaire_url && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-xl inline-flex items-center gap-1"
                  title={p.questionnaire_completed ? "Questionnaire completed" : "Questionnaire pending"}
                  style={{
                    backgroundColor: p.questionnaire_completed ? "rgba(22,163,74,0.08)" : "rgba(245,158,11,0.08)",
                    color: p.questionnaire_completed ? "#16a34a" : "#d97706",
                  }}
                  data-testid={`quest-badge-${p.program_id}`}>
                  <ClipboardCheck className="w-2.5 h-2.5" />{p.questionnaire_completed ? "Questionnaire done" : "Questionnaire"}
                </span>
              )}
            </div>
            <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--t-text-muted)" }}>
              <MapPin className="w-2.5 h-2.5" />{meta || "—"}
            </div>
          </div>

          {/* Stats (desktop) */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--t-text-faint, #bbb)" }}>Status</div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block" style={{ backgroundColor: ss.bg, color: ss.color }}>
                {p.recruiting_status || "—"}
              </span>
            </div>
            {match != null && (
              <div className="text-center">
                <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--t-text-faint, #bbb)" }}>Match</div>
                <div className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>{match}%</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--t-text-faint, #bbb)" }}>Outreach</div>
              <div className="text-[13px] font-bold" style={{ color: "var(--t-text)" }}>{signals.outreach_count || 0}</div>
            </div>
            <div className="text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--t-text-faint, #bbb)" }}>Activity</div>
              <div className="text-[13px] font-bold" style={{ color: signals.days_since_activity > 7 ? "#f59e0b" : "var(--t-text)" }}>
                {actText}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0" data-stop="1">
            {sectionActions.length > 0 ? sectionActions.map((a, i) => (
              <button key={i}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:opacity-90"
                style={a.cls === "primary"
                  ? { backgroundColor: "#1a8a80", color: "#fff", borderColor: "#1a8a80" }
                  : { backgroundColor: "var(--t-surface)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.25)" }}
                onClick={() => navigate(`/journey/${p.program_id}`)}
                data-testid={`card-action-${p.program_id}`}
              >
                <Send className="w-3 h-3" /><span className="hidden sm:inline">{a.label}</span>
              </button>
            )) : (
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors hover:opacity-80"
                style={{ backgroundColor: "var(--t-surface)", color: "var(--t-text-secondary, #555)", borderColor: "var(--t-border)" }}
                onClick={() => navigate(`/journey/${p.program_id}`)}
                data-testid={`card-journey-${p.program_id}`}
              >
                <span className="hidden sm:inline">Journey</span><ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <ChevronRight
            className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            style={{ color: expanded ? "var(--t-text-muted)" : "var(--t-text-faint, #ccc)" }}
          />
        </div>

        {/* ── Expanded Content ── */}
        {expanded && (
          <div className="mt-3.5">
            {/* Info blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
              <div className="rounded-xl px-3.5 py-3" style={{ backgroundColor: "var(--t-surface-alt, #f9f9f9)", border: "1px solid var(--t-border)" }}>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-text-faint, #aaa)" }}>Coach</div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{p.primary_coach || "—"}</div>
                {p.coach_title && (
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{p.coach_title}</div>
                )}
                {p.coach_email && (
                  <div className="text-[11px] mt-0.5">
                    <a href={`mailto:${p.coach_email}`} className="hover:underline" style={{ color: "#1a8a80" }}
                      onClick={e => e.stopPropagation()} data-stop="1">{p.coach_email}</a>
                  </div>
                )}
                {!p.primary_coach && !p.coach_email && (
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--t-text-faint)" }}>Find on school website</div>
                )}
              </div>
              <div className="rounded-xl px-3.5 py-3" style={{ backgroundColor: "var(--t-surface-alt, #f9f9f9)", border: "1px solid var(--t-border)" }}>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-text-faint, #aaa)" }}>Next Step</div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
                  {p.next_action || (!(signals.outreach_count > 0) ? "Send introduction email" : signals.has_coach_reply ? "Review coach's reply" : "Follow up on your outreach")}
                </div>
                {p.next_action_due && (
                  <div className="text-[11px] mt-1 font-medium" style={{
                    color: new Date(p.next_action_due + "T00:00:00") < new Date(new Date().toISOString().split("T")[0] + "T00:00:00")
                      ? "#dc2626"
                      : Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date(new Date().toISOString().split("T")[0] + "T00:00:00")) / 86400000) <= 3
                        ? "#d97706"
                        : "var(--t-text-muted)"
                  }}>
                    {(() => {
                      const today = new Date().toISOString().split("T")[0];
                      const diff = Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
                      if (diff < 0) return `${Math.abs(diff)}d overdue`;
                      if (diff === 0) return "Due today";
                      if (diff === 1) return "Due tomorrow";
                      return `Due in ${diff}d`;
                    })()}
                  </div>
                )}
                {!p.next_action && (
                  <div className="text-[11px] mt-0.5 italic" style={{ color: "var(--t-text-faint)" }}>Suggested</div>
                )}
              </div>
              <div className="rounded-xl px-3.5 py-3" style={{ backgroundColor: "var(--t-surface-alt, #f9f9f9)", border: "1px solid var(--t-border)" }}>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--t-text-faint, #aaa)" }}>Communication</div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>
                  {signals.outreach_count || 0} sent &middot; {signals.has_coach_reply ? "1+ replies" : "0 replies"}
                </div>
                <div className="text-[11px] mt-1" style={{ color: actText !== "—" ? "var(--t-text-muted)" : "var(--t-text-faint)" }}>
                  {actText !== "—" ? `Last activity: ${actText}` : "No contact yet"}
                </div>
                {signals.outreach_count > 0 && (
                  <div className="text-[11px] mt-0.5" style={{ color: signals.has_coach_reply ? "#16a34a" : "#d97706" }}>
                    {signals.has_coach_reply ? "Coach has replied" : "Awaiting reply"}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {loadingIx && (
              <div className="flex items-center gap-2 py-2 mb-3">
                <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--t-text-faint)" }} />
                <span className="text-[11px]" style={{ color: "var(--t-text-faint)" }}>Loading timeline...</span>
              </div>
            )}
            {interactions && interactions.length > 0 && (
              <div className="mb-3">
                {interactions.map((ix, i) => (
                  <div key={ix.interaction_id || i}
                    className="flex gap-2.5 py-1.5 text-[11px] relative"
                    style={{ borderLeft: "2px solid var(--t-border)", marginLeft: 6, paddingLeft: 14 }}>
                    <div className="absolute w-2 h-2 rounded-full"
                      style={{ left: -5, top: 9, backgroundColor: i === 0 ? "#1a8a80" : "var(--t-border)" }} />
                    <span className="font-semibold flex-shrink-0" style={{ color: "var(--t-text-faint)", minWidth: 65 }}>
                      {ix.date_time ? new Date(ix.date_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </span>
                    <span style={{ color: "var(--t-text-secondary)" }}>
                      {ix.type || "Activity"}{ix.notes ? `: ${ix.notes}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded Actions */}
            <div className="flex gap-2 justify-end flex-wrap" data-stop="1">
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: "#1a8a80", color: "#fff" }}
                onClick={() => navigate(`/journey/${p.program_id}`)}
                data-testid={`card-full-journey-${p.program_id}`}>
                View Full Journey <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Progress Ring ── */
const RING_STAGES = [
  { key: "outreach", label: "Outreach", color: "#1a8a80" },
  { key: "waiting", label: "Waiting", color: "#f59e0b" },
  { key: "convo", label: "In Convo", color: "#16a34a" },
  { key: "committed", label: "Committed", color: "#d97706" },
];

function ProgressRing({ sectionCounts, total }) {
  const active = RING_STAGES.filter(s => (sectionCounts[s.key] || 0) > 0);
  const stops = [];
  let acc = 0;
  active.forEach(s => {
    const pct = (sectionCounts[s.key] || 0) / Math.max(total, 1) * 100;
    stops.push(`${s.color} ${acc}% ${acc + pct}%`);
    acc += pct;
  });
  if (acc < 100) stops.push(`var(--t-border, #e5e7eb) ${acc}% 100%`);
  const gradient = stops.length > 0 ? `conic-gradient(from 0deg, ${stops.join(", ")})` : `conic-gradient(var(--t-border) 0% 100%)`;

  return (
    <div className="flex items-center gap-4" data-testid="progress-ring">
      <div className="flex-shrink-0 w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full flex items-center justify-center" style={{ background: gradient }}>
        <div className="w-[76px] h-[76px] md:w-[108px] md:h-[108px] rounded-full flex flex-col items-center justify-center" style={{ backgroundColor: "var(--t-surface, #fff)" }}>
          <span className="text-xl md:text-3xl font-extrabold" style={{ color: "var(--t-text)", lineHeight: 1 }}>{total}</span>
          <span className="text-[9px] md:text-xs" style={{ color: "var(--t-text-muted)" }}>schools</span>
        </div>
      </div>
      <div className="flex flex-col gap-y-1.5">
        {active.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-[10px] md:text-sm">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-bold" style={{ color: "var(--t-text)", minWidth: 10 }}>{sectionCounts[s.key] || 0}</span>
            <span style={{ color: "var(--t-text-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Hero Card helpers ── */
function getHeroAdvice(p) {
  if (!p) return "";
  const g = p.board_group;
  const s = p.signals || {};
  if (g === "overdue") {
    const days = p.next_action_due ? Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000)) : "several";
    return `Coach hasn't heard from you in ${days} days. Send a short follow-up mentioning your recent results.`;
  }
  if (g === "needs_outreach") return "This school matches your profile well. Send an introductory email with your highlight reel.";
  if (g === "waiting_on_reply") {
    const d = s.days_since_outreach;
    return d > 5 ? "It's been a while since your outreach. Consider a brief follow-up." : "Give the coach a bit more time, then follow up.";
  }
  if (g === "in_conversation") return "You've got momentum — keep the conversation going.";
  return "";
}

function HeroCard({ program, navigate }) {
  if (!program) return null;
  const p = program;
  const stage = p.board_group;
  const isUrgent = stage === "overdue";
  const isWaiting = stage === "waiting_on_reply";
  const advice = getHeroAdvice(p);

  const kicker = isUrgent ? "Needs Attention" : stage === "needs_outreach" ? "Up Next" : isWaiting ? "Keeping Warm" : "Momentum";
  const kickerColor = isUrgent ? "#f87171" : "#1a8a80";

  let urgencyText = "";
  if (isUrgent && p.next_action_due) {
    const days = Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000));
    urgencyText = `${days} day${days !== 1 ? "s" : ""} overdue`;
  } else if (isWaiting && p.next_action_due) {
    const d = Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000);
    urgencyText = d > 0 ? `Due in ${d} day${d !== 1 ? "s" : ""}` : "Due today";
  }

  const quickLabel = (isUrgent || isWaiting) ? "Follow Up" : stage === "needs_outreach" ? "Start Outreach" : "View Journey";

  return (
    <div className="rounded-xl overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6" style={{ background: "#1e1e2e", padding: "16px 18px" }} data-testid="hero-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[1.5px] flex items-center gap-1" style={{ color: kickerColor }}>
            {isUrgent && <AlertTriangle className="w-3 h-3" />}
            {isWaiting && <Clock className="w-3 h-3" />}
            {kicker}
          </span>
          {urgencyText && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ color: kickerColor, background: `${kickerColor}20` }}>
              {urgencyText}
            </span>
          )}
        </div>
        <div className="text-lg font-extrabold mb-1.5 leading-tight tracking-tight text-white flex items-center gap-2">
          <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={28} />
          {p.university_name}
        </div>
        <div className="flex items-center gap-2 mb-2.5">
          {p.division && <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(26,138,128,0.12)", color: "rgba(255,255,255,0.6)" }}>{p.division}</span>}
          {p.conference && <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}><MapPin className="w-2.5 h-2.5" />{p.conference}</span>}
        </div>
        {advice && (
          <div className="rounded-lg p-3 flex gap-2.5" style={{ background: "rgba(26,138,128,0.06)", border: "1px solid rgba(26,138,128,0.12)", borderLeft: "3px solid #1a8a80" }}>
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#1a8a80" }} />
            <div>
              <span className="text-[10px] font-bold block mb-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>What to do next</span>
              <p className="text-[13px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{advice}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex sm:flex-col gap-1.5 flex-shrink-0 sm:min-w-[130px]">
        <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer w-full"
          style={{ background: "#1a8a80", color: "white", border: "none" }}
          onClick={() => navigate(`/journey/${p.program_id}`)} data-testid="hero-action-btn">
          <Send className="w-3 h-3" />{quickLabel}
        </button>
      </div>
    </div>
  );
}

function AllCaughtUpCard({ navigate }) {
  return (
    <div className="rounded-xl overflow-hidden flex items-center gap-6" style={{ background: "#1e1e2e", padding: "18px 22px" }} data-testid="all-caught-up">
      <div className="flex-1 min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-[1.5px] mb-1.5 block" style={{ color: "#4ade80" }}>All Caught Up</span>
        <p className="text-lg font-extrabold text-white mb-1 leading-tight">You're on top of recruiting!</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>All schools are in conversation or archived.</p>
      </div>
      <button className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-[11px] font-bold cursor-pointer flex-shrink-0"
        style={{ background: "#1a8a80", color: "white", border: "none" }}
        onClick={() => navigate("/knowledge-base")} data-testid="add-more-schools">
        <Plus className="w-3 h-3" />Add School
      </button>
    </div>
  );
}

/* ── Pipeline Section ── */
function PipelineSection({ sectionCfg, programs, matchScores, navigate, expandAll }) {
  const [collapsed, setCollapsed] = useState(false);
  if (programs.length === 0) return null;

  return (
    <div data-testid={`section-${sectionCfg.key}`} className="mb-6">
      <div
        className="flex items-center gap-2.5 mb-3 cursor-pointer select-none group"
        onClick={() => setCollapsed(c => !c)}
        data-testid={`section-header-${sectionCfg.key}`}
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 opacity-50 group-hover:opacity-100 ${collapsed ? "-rotate-90" : ""}`}
          style={{ color: sectionCfg.color }}
        />
        <span className="text-[10px] font-extrabold uppercase tracking-[1.8px]"
          style={{ color: sectionCfg.color }}>{sectionCfg.label}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
          style={{ backgroundColor: `${sectionCfg.color}15`, color: sectionCfg.color }}>{programs.length}</span>
        <div className="flex-1 h-px" style={{ backgroundColor: `${sectionCfg.color}30` }} />
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-2.5">
          {programs.map(p => (
            <PipelineCard
              key={p.program_id}
              program={p}
              section={sectionCfg.key}
              matchScore={matchScores[p.program_id]}
              navigate={navigate}
              forceExpand={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Filter Bar ── */
function FilterBar({ sectionCounts, total, active, onFilter }) {
  const chips = [
    { key: null, label: "All", count: total },
    ...SECTIONS.map(s => ({ key: s.key, label: s.key === "outreach" ? "Outreach" : s.key === "waiting" ? "Waiting" : s.key === "convo" ? "In Convo" : "Committed", count: sectionCounts[s.key] || 0 })),
  ].filter(c => c.key === null || c.count > 0);

  return (
    <div className="flex gap-2 flex-wrap" data-testid="pipeline-filters">
      {chips.map(c => {
        const isActive = active === c.key;
        return (
          <button key={c.key || "all"}
            onClick={() => onFilter(isActive && c.key !== null ? null : c.key)}
            className="px-4 py-1.5 rounded-full text-[13px] font-semibold border-[1.5px] transition-all"
            style={isActive
              ? { backgroundColor: "var(--t-text)", color: "var(--t-bg, #fff)", borderColor: "var(--t-text)" }
              : { backgroundColor: "var(--t-surface)", color: "var(--t-text-secondary, #555)", borderColor: "var(--t-border)" }
            }
            data-testid={`filter-${c.key || "all"}`}
          >
            {c.label}<span className="font-extrabold ml-1">{c.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── View Toggle ── */
function ViewToggle({ mode, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg p-0.5" style={{ backgroundColor: "var(--t-surface-alt, #e8e8e8)" }} data-testid="view-toggle">
      {["compact", "expanded"].map(m => (
        <button key={m}
          onClick={() => onChange(m)}
          className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all"
          style={mode === m
            ? { backgroundColor: "var(--t-surface)", color: "var(--t-text)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
            : { backgroundColor: "transparent", color: "var(--t-text-muted)" }
          }
          data-testid={`view-${m}`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Main Board ── */
/* ══════════════════════════════════════════ */
export default function RecruitingBoard() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [activeSection, setActiveSection] = useState(null);
  const [viewMode, setViewMode] = useState("compact");
  const [matchScores, setMatchScores] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCongrats, setShowCongrats] = useState(false);

  // Congrats param
  useEffect(() => {
    if (searchParams.get("congrats") === "true") {
      setShowCongrats(true);
      searchParams.delete("congrats");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch match scores
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
      const params = {};
      if (search) params.search = search;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      const res = await api.get("/programs", { params });
      setAllPrograms(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [search, filterDivision, filterRegion]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

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

  // Filter out archived from count/display
  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const total = activePrograms.length;

  // Group into sections
  const sectionGroups = groupIntoSections(activePrograms);
  const sectionCounts = {};
  SECTIONS.forEach(s => { sectionCounts[s.key] = sectionGroups[s.key].length; });

  // Congrats screen
  if (showCongrats && total > 0) {
    const first = activePrograms[0];
    return (
      <div className="flex items-center justify-center min-h-[70vh]" data-testid="congrats-screen">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.1)" }}>
              <PartyPopper className="w-10 h-10" style={{ color: "#1a8a80" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--t-text)", letterSpacing: "-0.5px" }}>Congratulations!</h1>
          <p className="text-base mb-2" style={{ color: "var(--t-text-secondary)" }}>
            You added <strong style={{ color: "var(--t-text)" }}>{first?.university_name || "your first school"}</strong> to your board.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--t-text-muted)" }}>Your recruiting journey starts now.</p>
          <button
            className="inline-flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a8a80", color: "white", boxShadow: "0 4px 14px rgba(26,138,128,0.3)" }}
            onClick={() => first?.program_id ? navigate(`/journey/${first.program_id}`) : setShowCongrats(false)}
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

  // Empty state
  if (total === 0) {
    return <EmptyBoardState onSchoolAdded={fetchPrograms} />;
  }

  const expandAll = viewMode === "expanded";

  // Focus program = most urgent school for hero card
  const focusPriority = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];
  const focusProgram = focusPriority.reduce((found, stage) => {
    if (found) return found;
    const candidates = activePrograms.filter(p => p.board_group === stage && p.recruiting_status !== "Committed");
    if (candidates.length === 0) return null;
    if (stage === "needs_outreach") {
      // Best match score first — contact your strongest fit first
      candidates.sort((a, b) => {
        const ma = matchScores[a.program_id]?.match_score ?? 0;
        const mb = matchScores[b.program_id]?.match_score ?? 0;
        return mb - ma;
      });
    } else if (stage === "in_conversation") {
      // Most stale conversation first — don't let relationships go cold
      candidates.sort((a, b) => {
        const da = a.signals?.days_since_activity ?? 0;
        const db = b.signals?.days_since_activity ?? 0;
        return db - da;
      });
    } else {
      // overdue & waiting_on_reply — soonest/most overdue due date first
      candidates.sort((a, b) => {
        const da = a.next_action_due || "9999-12-31";
        const db = b.next_action_due || "9999-12-31";
        return da.localeCompare(db);
      });
    }
    return candidates[0];
  }, null);

  return (
    <div className="flex flex-col gap-5" data-testid="recruiting-board">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "var(--t-text)" }} data-testid="pipeline-title">My Schools</h1>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg border transition-colors hover:opacity-70"
            style={{ borderColor: "var(--t-border)" }}
            data-testid="toggle-filters"
          >
            <Filter className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          </button>
          <Button data-testid="add-school-btn" onClick={() => navigate("/knowledge-base")}
            className="text-white text-xs shadow-md"
            style={{ background: "#1a8a80", padding: "8px 16px", height: "auto" }}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add School
          </Button>
        </div>
      </div>

      {/* ── Progress Ring + Hero Card ── */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-stretch" data-testid="pipeline-snapshot">
        <div className="rounded-xl border p-4 md:p-5 flex items-center justify-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <ProgressRing sectionCounts={sectionCounts} total={total} />
        </div>
        <div className="flex-1 min-w-0">
          {focusProgram
            ? <HeroCard program={focusProgram} navigate={navigate} />
            : <AllCaughtUpCard navigate={navigate} />}
        </div>
      </div>

      {/* ── Advanced Filters ── */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2" data-testid="board-filters">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
            <Input data-testid="board-search" placeholder="Search schools..." value={search} onChange={e => setSearch(e.target.value)}
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

      {/* ── Filter Chips ── */}
      <FilterBar sectionCounts={sectionCounts} total={total} active={activeSection} onFilter={setActiveSection} />

      {/* ── Sections ── */}
      {SECTIONS.filter(s => activeSection === null || activeSection === s.key).map(s => (
        <PipelineSection
          key={s.key}
          sectionCfg={s}
          programs={sectionGroups[s.key]}
          matchScores={matchScores}
          navigate={navigate}
          expandAll={expandAll}
        />
      ))}

      {activeSection && (sectionGroups[activeSection]?.length || 0) === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: "var(--t-text-muted)" }} data-testid="filtered-empty">
          No schools in {SECTIONS.find(s => s.key === activeSection)?.label || activeSection}
        </div>
      )}
    </div>
  );
}
