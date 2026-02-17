import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import {
  ArrowLeft, Send, Mail, Phone, Calendar, MapPin, Star,
  MessageSquare, Video, Users, Sparkles, Loader2, ChevronDown, ChevronUp,
  Plus, Clock, Edit2, Trash2, Save, X, ExternalLink, GraduationCap,
  Heart, Target, AlertCircle, CheckCircle2, FileText, Zap, Lock, Crown,
  GitCompare, ChevronRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════ */

const RAIL_STAGES = [
  { key: "added", label: "Added" },
  { key: "outreach_sent", label: "Outreach" },
  { key: "coach_replied", label: "Replied" },
  { key: "campus_visit", label: "Visit" },
  { key: "offer", label: "Offer" },
  { key: "committed", label: "Committed" },
];

const PULSE_CONFIG = {
  active:  { color: "emerald", label: "Active",     desc: "Recent activity" },
  cooling: { color: "amber",   label: "Cooling",    desc: "7+ days since contact" },
  cold:    { color: "rose",    label: "Going Cold",  desc: "14+ days, needs action" },
  neutral: { color: "gray",    label: "New",         desc: "No activity yet" },
};

const CONV_CONFIG = {
  email_sent:     { side: "right", color: "pink",   label: "Email sent" },
  email_received: { side: "left",  color: "emerald", label: "Email received" },
  coach_reply:    { side: "left",  color: "emerald", label: "Coach replied" },
  phone_call:     { side: "right", color: "pink",   label: "Phone call" },
  video_call:     { side: "right", color: "cyan",   label: "Video call" },
  camp:           { side: "center", color: "orange", label: "Camp" },
  visit:          { side: "center", color: "pink",   label: "Campus visit" },
  showcase:       { side: "center", color: "yellow", label: "Showcase" },
  meeting:        { side: "center", color: "indigo", label: "Meeting" },
  note:           { side: "right", color: "gray",   label: "Note" },
  interaction:    { side: "right", color: "gray",   label: "Interaction" },
};

const BOARD_STAGE_LABELS = {
  overdue: "Overdue", needs_outreach: "Needs Outreach",
  waiting_on_reply: "Waiting on Reply", in_conversation: "In Conversation", archived: "Archived",
};

/* ═══════════════════════════════════════════════════════════════
   PROGRESS RAIL
   ═══════════════════════════════════════════════════════════════ */
function ProgressRail({ rail, onStageClick }) {
  if (!rail) return null;
  const stages = rail.stages || {};
  const active = rail.active;
  const activeIdx = RAIL_STAGES.findIndex(s => s.key === active);

  return (
    <div className="relative flex items-start pt-2 pb-1" data-testid="progress-rail">
      {/* Background line */}
      <div className="absolute top-[18px] left-[40px] right-[40px] h-[2px]" style={{ background: "var(--t-border)" }} />
      {/* Filled line — uses scaleX on full-width track for pixel-perfect alignment */}
      <div className="absolute top-[18px] left-[40px] right-[40px] h-[2px] origin-left transition-all duration-500"
        style={{ transform: `scaleX(${activeIdx / (RAIL_STAGES.length - 1)})`, background: "#e8456b" }} />
      {RAIL_STAGES.map((s, i) => {
        const completed = stages[s.key];
        const isActive = s.key === active;
        return (
          <button key={s.key} className="flex-1 flex flex-col items-center relative z-10 group"
            onClick={() => onStageClick(s.key)} data-testid={`rail-stage-${s.key}`}>
            <div className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
              isActive ? "w-[18px] h-[18px] bg-pink-500 border-pink-500 shadow-[0_0_12px_rgba(232,69,107,0.4)]"
              : completed ? "bg-pink-500 border-pink-500 shadow-[0_0_8px_rgba(232,69,107,0.15)]"
              : "border-[var(--t-border)] bg-[var(--t-surface)]"
            }`} />
            <span className={`text-[10px] mt-1.5 font-medium transition-colors ${
              isActive ? "text-pink-500 font-semibold" : completed ? "text-[var(--t-text-secondary)]" : "text-[var(--t-text-muted)]"
            }`}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PULSE INDICATOR
   ═══════════════════════════════════════════════════════════════ */
function PulseIndicator({ pulse }) {
  const cfg = PULSE_CONFIG[pulse] || PULSE_CONFIG.neutral;
  const dotColor = { emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", gray: "bg-gray-500" }[cfg.color];
  const ringColor = { emerald: "border-emerald-500", amber: "border-amber-500", rose: "border-rose-500", gray: "border-gray-500" }[cfg.color];
  const textColor = { emerald: "text-emerald-400", amber: "text-amber-400", rose: "text-rose-400", gray: "text-gray-400" }[cfg.color];
  return (
    <div className="flex items-center gap-2" data-testid="pulse-indicator">
      <span className="relative flex h-2.5 w-2.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${dotColor}`} />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
      </span>
      <span className={`text-[11px] font-semibold ${textColor}`}>{cfg.label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GETTING STARTED CHECKLIST
   ═══════════════════════════════════════════════════════════════ */
function GettingStartedChecklist({ program, coaches, timeline, onAddCoach, onSendEmail, onSetFollowup }) {
  const steps = [
    { key: "added", label: `Add ${program.university_name} to your pipeline`, desc: `School added on ${new Date(program.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, done: true, action: null },
    { key: "coach", label: "Add the head coach's contact info", desc: "Find their name and email on the school's volleyball staff page", done: coaches.length > 0, action: onAddCoach },
    { key: "email", label: "Send your first introduction email", desc: "Make a great first impression with a personalized intro", done: timeline.length > 0, action: onSendEmail },
    { key: "followup", label: "Set a follow-up reminder", desc: "Schedule a 7-day follow-up so you don't forget", done: !!program.next_action_due, action: onSetFollowup },
  ];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="rounded-2xl border p-5 sm:p-6" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="getting-started-checklist">
      <h3 className="text-base font-bold mb-1" style={{ color: "var(--t-text)" }}>Start your {program.university_name} journey</h3>
      <p className="text-xs mb-5" style={{ color: "var(--t-text-muted)" }}>Complete these steps to kickstart your recruiting relationship</p>
      <div className="space-y-2">
        {steps.map(s => (
          <button key={s.key} className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${s.done ? "opacity-50" : "hover:border-pink-500/30 hover:bg-[var(--t-surface-alt)]"}`}
            style={{ borderColor: "var(--t-border)" }}
            onClick={() => !s.done && s.action && s.action()} disabled={s.done}
            data-testid={`checklist-step-${s.key}`}>
            <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${s.done ? "bg-emerald-500 border-emerald-500" : "border-[var(--t-border)]"}`}>
              {s.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium ${s.done ? "line-through" : ""}`} style={{ color: "var(--t-text)" }}>{s.label}</p>
              <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{s.desc}</p>
            </div>
            {!s.done && s.action && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--t-border)" }}>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--t-surface-alt)" }}>
          <div className="h-full rounded-full bg-pink-500 transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-pink-500">{doneCount} of {steps.length}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CELEBRATION HERO (In Conversation)
   ═══════════════════════════════════════════════════════════════ */
function CelebrationHero({ program, coaches, onEmail, onLog, onCall }) {
  const coachName = coaches?.[0]?.coach_name || "The coach";
  const signals = program.signals || {};
  const daysAgo = signals.days_since_reply;
  const timeText = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`;

  return (
    <div className="rounded-2xl border p-5 sm:p-6 text-center relative overflow-hidden"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "rgba(16,185,129,0.2)", background: "linear-gradient(135deg, rgba(16,185,129,0.04), var(--t-surface) 60%)" }}
      data-testid="celebration-hero">
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
      <div className="relative">
        <div className="text-3xl mb-2">&#127881;</div>
        <h3 className="text-base font-bold mb-1" style={{ color: "var(--t-text)" }}>{coachName} is interested!</h3>
        <p className="text-xs mb-4 max-w-sm mx-auto" style={{ color: "var(--t-text-muted)" }}>
          Replied {timeText} — keep the momentum going:
        </p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          <Button className="bg-pink-700 hover:bg-pink-800 text-white text-xs h-8 px-4 shadow-md" onClick={onEmail} data-testid="celebration-email-btn">
            <Mail className="w-3.5 h-3.5 mr-1.5" />Send Thank You
          </Button>
          <Button variant="outline" className="text-xs h-8 px-4" onClick={onCall}
            style={{ color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="celebration-call-btn">
            <Phone className="w-3.5 h-3.5 mr-1.5" />Schedule Call
          </Button>
          <Button variant="outline" className="text-xs h-8 px-4 border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/10"
            onClick={onLog} data-testid="celebration-log-btn">
            <FileText className="w-3.5 h-3.5 mr-1.5" />Log a Note
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONVERSATION TIMELINE
   ═══════════════════════════════════════════════════════════════ */
function ConversationBubble({ event }) {
  const [expanded, setExpanded] = useState(false);
  const evtType = (event.event_type || event.type || "interaction").toLowerCase().replace(/\s+/g, "_");
  const cfg = CONV_CONFIG[evtType] || CONV_CONFIG.interaction;
  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };
  const content = event.content || event.notes || "";
  const hasLong = content.length > 150;

  // Milestone (center)
  if (cfg.side === "center") {
    return (
      <div className="flex justify-center my-2" data-testid="conv-milestone">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${cfg.color}-500/10`}>
            {evtType === "camp" ? <Calendar className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : evtType === "visit" ? <MapPin className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : <Star className={`w-3.5 h-3.5 text-${cfg.color}-400`} />}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{event.title || cfg.label}</p>
            <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{formatDate(event.date)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Chat bubble — left (coach) or right (you)
  const isRight = cfg.side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} my-1`} data-testid={`conv-bubble-${isRight ? "right" : "left"}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 border ${
        isRight
          ? "rounded-br-md bg-pink-600/[0.06] border-pink-600/15"
          : "rounded-bl-md bg-emerald-500/[0.06] border-emerald-500/15"
      }`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isRight ? "text-pink-500" : "text-emerald-400"}`}>
          {isRight ? "You" : (event.coach_name || "Coach")}
        </p>
        {content && (
          <div className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
            {hasLong && !expanded ? (
              <><p className="line-clamp-3">{content}</p><button onClick={() => setExpanded(true)} className="text-pink-500 text-[10px] mt-1 font-medium">Show more</button></>
            ) : hasLong && expanded ? (
              <><p className="whitespace-pre-wrap">{content}</p><button onClick={() => setExpanded(false)} className="text-pink-500 text-[10px] mt-1 font-medium">Show less</button></>
            ) : <p>{content}</p>}
          </div>
        )}
        {!content && <p className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{event.title || cfg.label}</p>}
        <p className="text-[10px] mt-1.5" style={{ color: "var(--t-text-muted)" }}>{formatDate(event.date)} &middot; {cfg.label}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AT A GLANCE SIDEBAR
   ═══════════════════════════════════════════════════════════════ */
function AtAGlanceCard({ program, coaches, isPremium, isBasic, programId, onDraftEmail, onAddCoach, onScheduleFollowup }) {
  const signals = program.signals || {};
  const boardGroup = program.board_group;
  const stageLabel = BOARD_STAGE_LABELS[boardGroup] || boardGroup;
  const stageColors = {
    overdue: "bg-rose-500/12 text-rose-400", needs_outreach: "bg-amber-500/12 text-amber-400",
    waiting_on_reply: "bg-blue-500/12 text-blue-400", in_conversation: "bg-emerald-500/12 text-emerald-400",
    archived: "bg-gray-500/12 text-gray-400",
  };

  // AI summary
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const generateAI = async () => {
    if (!isPremium) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/journey-summary", { program_id: programId });
      setAiSummary(res.data);
    } catch { toast.error("Failed to generate insights"); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="at-a-glance">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>At a Glance</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stageColors[boardGroup] || stageColors.needs_outreach}`}>{stageLabel}</span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2">
        {signals.has_coach_reply ? (
          <div className="p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Replied</p>
            <p className="text-sm font-bold text-emerald-400">{signals.days_since_reply === 0 ? "Today" : `${signals.days_since_reply}d ago`}</p>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Outreach</p>
            <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{signals.outreach_count || 0} sent</p>
          </div>
        )}
        <div className="p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Events</p>
          <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{signals.total_interactions || 0}</p>
        </div>
      </div>

      {/* Primary Coach */}
      {coaches.length > 0 ? (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
          <div className="w-8 h-8 rounded-lg bg-pink-600/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-pink-500">{coaches[0].coach_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--t-text)" }}>{coaches[0].coach_name}</p>
            {coaches[0].email && <p className="text-[10px] text-pink-500 truncate">{coaches[0].email}</p>}
            {!coaches[0].email && <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{coaches[0].role}</p>}
          </div>
          {coaches.length > 1 && <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>+{coaches.length - 1}</span>}
        </div>
      ) : (
        <button onClick={onAddCoach} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-dashed text-xs transition-colors hover:border-pink-500/30"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }} data-testid="glance-add-coach">
          <Plus className="w-3.5 h-3.5" /> Add coach contact
        </button>
      )}

      {/* Follow-up */}
      {program.next_action_due && (
        <div className="p-2.5 rounded-lg bg-orange-500/8 border border-orange-500/15">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            <span className="text-[11px] font-medium text-orange-300">Follow-up: {new Date(program.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          {program.next_action && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{program.next_action}</p>}
        </div>
      )}

      {/* AI Suggestion or Tip */}
      {isPremium ? (
        <div className="rounded-lg p-2.5 border" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(232,69,107,0.04))", borderColor: "rgba(168,85,247,0.15)" }}>
          {aiSummary ? (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />Next move</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{aiSummary.suggested_action}</p>
              <button onClick={generateAI} disabled={aiLoading} className="text-[10px] text-purple-400 font-medium flex items-center gap-1 disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Refresh
              </button>
            </div>
          ) : (
            <button onClick={generateAI} disabled={aiLoading} className="w-full flex items-center gap-2 text-left disabled:opacity-50" data-testid="glance-ai-generate">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
              <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                {aiLoading ? "Analyzing..." : "Get AI-powered next step"}
              </span>
              {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-purple-400 ml-auto" />}
            </button>
          )}
        </div>
      ) : !isBasic ? (
        <div className="rounded-lg p-2.5 border" style={{ borderColor: "rgba(168,85,247,0.12)" }}>
          <div className="flex items-center gap-2">
            <Crown className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
            <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>AI insights</span>
            <a href="/account" className="ml-auto text-[10px] font-semibold text-purple-400 hover:text-purple-300">Upgrade</a>
          </div>
        </div>
      ) : null}

      {/* Show more: coaches list, key dates, schedule followup */}
      <button onClick={() => setShowMore(!showMore)} className="w-full text-[10px] font-medium flex items-center justify-center gap-1 pt-1"
        style={{ color: "var(--t-text-muted)" }} data-testid="glance-show-more">
        {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showMore ? "Show less" : "More details"}
      </button>

      {showMore && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
          {/* All Coaches */}
          {coaches.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>All Coaches</p>
              {coaches.map(c => (
                <div key={c.coach_id} className="flex items-center gap-2 py-1.5">
                  <Users className="w-3 h-3 text-pink-500 flex-shrink-0" />
                  <span className="text-[11px]" style={{ color: "var(--t-text-secondary)" }}>{c.coach_name} — {c.role}</span>
                </div>
              ))}
            </div>
          )}
          {/* Schedule Follow-up */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>Schedule Follow-up</p>
            <FollowUpScheduler program={program} onSaved={onScheduleFollowup} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING ACTION BAR
   ═══════════════════════════════════════════════════════════════ */
function FloatingActionBar({ onEmail, onLog, onReplied, onFollowup, isBasic }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ background: "rgba(22,27,37,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "var(--t-border)" }}
      data-testid="floating-action-bar">
      <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors"
        onClick={onEmail} disabled={isBasic} data-testid="fab-email">
        <Mail className="w-3.5 h-3.5" />Email
      </button>
      <div className="w-px h-6" style={{ background: "var(--t-border)" }} />
      <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-[var(--t-surface-alt)]"
        style={{ color: "var(--t-text-secondary)" }} onClick={onLog} data-testid="fab-log">
        <FileText className="w-3.5 h-3.5" />Log
      </button>
      <div className="w-px h-6" style={{ background: "var(--t-border)" }} />
      <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-[var(--t-surface-alt)]"
        style={{ color: "var(--t-text-secondary)" }} onClick={onReplied} data-testid="fab-replied">
        <CheckCircle2 className="w-3.5 h-3.5" />Replied
      </button>
      <div className="w-px h-6" style={{ background: "var(--t-border)" }} />
      <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors hover:bg-[var(--t-surface-alt)]"
        style={{ color: "var(--t-text-secondary)" }} onClick={onFollowup} data-testid="fab-followup">
        <Clock className="w-3.5 h-3.5" />Follow-up
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EXISTING FORM COMPONENTS (kept from original)
   ═══════════════════════════════════════════════════════════════ */

function CoachForm({ initial, programId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-pink-600";
  return (
    <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt)" }}>
      <input placeholder="Coach name" value={form.coach_name} onChange={e => set("coach_name", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-name-input" />
      <select value={form.role} onChange={e => set("role", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-role-select">
        {["Head Coach", "Associate Head Coach", "Assistant Coach", "Recruiting Coordinator", "Director of Operations"].map(r => <option key={r}>{r}</option>)}
      </select>
      <input placeholder="Email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-email-input" />
      <input placeholder="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-phone-input" />
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-pink-700 hover:bg-pink-800 text-white text-xs h-7" onClick={() => onSave({ ...form, program_id: programId })} data-testid="save-coach-btn"><Save className="w-3 h-3 mr-1" />Save</Button>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onCancel} style={{ color: "var(--t-text-muted)" }}><X className="w-3 h-3 mr-1" />Cancel</Button>
      </div>
    </div>
  );
}

function LogInteractionForm({ programId, universityName, onSaved, onCancel }) {
  const [form, setForm] = useState({ type: "Phone Call", notes: "", outcome: "Positive", date_time: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-pink-600";
  const save = async () => {
    if (!form.notes.trim()) { toast.error("Add a note"); return; }
    setSaving(true);
    try {
      await api.post("/interactions", { program_id: programId, university_name: universityName, type: form.type, notes: form.notes, outcome: form.outcome, date_time: form.date_time });
      toast.success("Interaction logged"); onSaved();
    } catch { toast.error("Failed to log interaction"); } finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="log-interaction-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Log Interaction</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-type-select">
          {["Phone Call", "Video Call", "Text Message", "Camp Meeting", "Campus Visit", "Showcase", "Other"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={form.outcome} onChange={e => set("outcome", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-outcome-select">
          {["Positive", "Neutral", "No Response", "Negative"].map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="datetime-local" value={form.date_time} onChange={e => set("date_time", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-date-input" />
      </div>
      <textarea placeholder="What happened? Key takeaways..." value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={`${inputCls} resize-none`} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-notes-input" />
      <Button className="bg-pink-700 hover:bg-pink-800 text-white text-xs w-full" onClick={save} disabled={saving} data-testid="save-interaction-btn">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Log Interaction
      </Button>
    </div>
  );
}

function EmailComposer({ coaches, programId, onSent, onCancel }) {
  const { subscription } = useSubscription();
  const canUseAIDrafts = subscription?.tier === "premium";
  const [to, setTo] = useState(coaches?.[0]?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-pink-600";
  const draftAI = async (type) => {
    if (!canUseAIDrafts) return;
    setDrafting(true);
    try {
      const res = await api.post("/ai/draft-email", { program_id: programId, email_type: type });
      setSubject(res.data.subject || ""); setBody(res.data.body || "");
      if (res.data.coach_email) setTo(res.data.coach_email);
      toast.success("AI draft ready");
    } catch (e) {
      if (e.response?.data?.detail?.error === "subscription_limit") return;
      toast.error("Failed to generate draft");
    } finally { setDrafting(false); }
  };
  const send = async () => {
    if (!to || !subject || !body) { toast.error("Fill all fields"); return; }
    setSending(true);
    try { await api.post("/gmail/send", { to, subject, body }); toast.success("Email sent!"); onSent(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed to send. Is Gmail connected?"); }
    finally { setSending(false); }
  };
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="email-composer">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Compose Email</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <div className="flex gap-1.5 flex-wrap items-center">
        {canUseAIDrafts ? (
          ["intro", "follow_up", "thank_you", "interest_update"].map(t => (
            <button key={t} onClick={() => draftAI(t)} disabled={drafting}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-pink-600/10 text-pink-500 hover:bg-pink-600/20 transition-colors disabled:opacity-50" data-testid={`draft-${t}-btn`}>
              <Sparkles className="w-3 h-3 inline mr-0.5" />{t.replace(/_/g, " ")}
            </button>
          ))
        ) : (
          <div className="flex items-center gap-2 w-full py-1 px-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15" data-testid="ai-draft-locked">
            <Crown className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
            <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>AI email drafts require <a href="/account" className="text-purple-400 hover:underline font-medium">Premium</a></span>
          </div>
        )}
      </div>
      {drafting && <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin text-pink-600" /><span className="text-xs" style={{ color: "var(--t-text-muted)" }}>AI is drafting...</span></div>}
      <select value={to} onChange={e => setTo(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-to-select">
        <option value="">Select recipient...</option>
        {coaches.filter(c => c.email).map(c => <option key={c.coach_id} value={c.email}>{c.coach_name} ({c.email})</option>)}
        <option value="_custom">Type custom email...</option>
      </select>
      {to === "_custom" && <input placeholder="coach@university.edu" onChange={e => setTo(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />}
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-subject-input" />
      <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={6} className={`${inputCls} resize-none`} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-body-input" />
      <Button className="bg-pink-700 hover:bg-pink-800 text-white text-xs w-full" onClick={send} disabled={sending} data-testid="send-email-btn">
        {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}Send Email
      </Button>
    </div>
  );
}

function FollowUpScheduler({ program, onSaved }) {
  const [date, setDate] = useState(program.next_action_due || "");
  const [action, setAction] = useState(program.next_action || "");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-pink-600";
  const save = async () => {
    setSaving(true);
    try { await api.put(`/programs/${program.program_id}`, { next_action_due: date, next_action: action }); toast.success("Follow-up scheduled"); onSaved(); }
    catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };
  return (
    <div className="space-y-2" data-testid="followup-scheduler">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="followup-date-input" />
      <input placeholder="Next action (e.g. Send follow-up email)" value={action} onChange={e => setAction(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="followup-action-input" />
      <Button size="sm" className="bg-pink-700 hover:bg-pink-800 text-white text-xs w-full h-7" onClick={save} disabled={saving} data-testid="save-followup-btn">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Clock className="w-3 h-3 mr-1" />Set Reminder</>}
      </Button>
    </div>
  );
}

function MarkAsRepliedModal({ programId, onSaved, onCancel }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-pink-600";
  const save = async () => {
    if (!note.trim()) { toast.error("Please describe what the coach said"); return; }
    setSaving(true);
    try { await api.post(`/programs/${programId}/mark-replied`, { note: note.trim() }); toast.success("Coach reply logged to timeline"); onSaved(); }
    catch { toast.error("Failed to log reply"); } finally { setSaving(false); }
  };
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="mark-replied-modal">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--t-text)" }}><Mail className="w-4 h-4 text-green-400" />Mark as Replied</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Describe what the coach said or shared. This gets logged to your timeline.</p>
      <textarea placeholder="e.g. Coach Smith replied and invited me to their summer camp..." value={note} onChange={e => setNote(e.target.value)} rows={3} className={`${inputCls} resize-none`} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="mark-replied-note" />
      <Button className="bg-green-600 hover:bg-green-700 text-white text-xs w-full" onClick={save} disabled={saving} data-testid="save-replied-btn">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}Log Coach Reply
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN JOURNEY PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function RecruitingJourney() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const isBasic = !subscription?.tier || subscription.tier === "basic";
  const isPremium = subscription?.tier === "premium";

  const [program, setProgram] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScore, setMatchScore] = useState(null);

  // Form visibility
  const [activeForm, setActiveForm] = useState(null); // 'email' | 'log' | 'replied' | 'coach' | 'followup'
  const [editCoach, setEditCoach] = useState(null);

  const closeForm = () => { setActiveForm(null); setEditCoach(null); };
  const openEmail = () => { setActiveForm("email"); };
  const openLog = () => { setActiveForm("log"); };
  const openReplied = () => { setActiveForm("replied"); };
  const openCoach = () => { setActiveForm("coach"); };
  const openFollowup = () => { setActiveForm("followup"); };

  const fetchData = useCallback(async () => {
    try {
      const [progRes, journeyRes, coachRes] = await Promise.all([
        api.get(`/programs/${programId}`),
        api.get(`/programs/${programId}/journey`),
        api.get(`/coaches?program_id=${programId}`),
      ]);
      setProgram(progRes.data);
      setTimeline(journeyRes.data.timeline || []);
      setCoaches(coachRes.data || []);
      if (!isBasic) {
        try {
          const msRes = await api.get("/match-scores");
          const found = (msRes.data?.scores || []).find(s => s.program_id === programId);
          if (found) setMatchScore(found);
        } catch {}
      }
    } catch {
      toast.error("Failed to load journey data");
    } finally { setLoading(false); }
  }, [programId, isBasic]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateProgram = async (updates) => {
    try {
      const res = await api.put(`/programs/${programId}`, updates);
      setProgram(prev => ({ ...prev, ...res.data }));
      toast.success("Updated");
    } catch { toast.error("Failed to update"); }
  };

  const saveCoach = async (data) => {
    try {
      if (editCoach) await api.put(`/coaches/${editCoach.coach_id}`, data);
      else await api.post("/coaches", { ...data, university_name: program.university_name });
      toast.success(editCoach ? "Coach updated" : "Coach added");
      closeForm();
      const res = await api.get(`/coaches?program_id=${programId}`);
      setCoaches(res.data || []);
    } catch { toast.error("Failed to save coach"); }
  };

  const deleteCoach = async (coachId) => {
    try {
      await api.delete(`/coaches/${coachId}`);
      setCoaches(prev => prev.filter(c => c.coach_id !== coachId));
      toast.success("Coach removed");
    } catch { toast.error("Failed to delete"); }
  };

  const handleStageClick = async (stageKey) => {
    await updateProgram({ journey_stage: stageKey });
    // Refetch to get updated rail
    const res = await api.get(`/programs/${programId}`);
    setProgram(res.data);
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-pink-600" /></div>;
  if (!program) return (
    <div className="text-center py-24">
      <p style={{ color: "var(--t-text-muted)" }}>Program not found</p>
      <Button onClick={() => navigate("/pipeline")} className="mt-4">Back to My Schools</Button>
    </div>
  );

  const rail = program.journey_rail;
  const boardGroup = program.board_group;
  const isNewSchool = timeline.length === 0 && coaches.length === 0 && !program.next_action_due;
  const isInConversation = boardGroup === "in_conversation";

  return (
    <div data-testid="recruiting-journey" className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* ─── Header with Progress Rail ─── */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="journey-header">
        <div className="flex items-start gap-3 mb-4">
          <button onClick={() => navigate("/pipeline")} className="p-1.5 rounded-lg hover:bg-[var(--t-surface-alt)] transition-colors mt-0.5" style={{ color: "var(--t-text-muted)" }} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold" style={{ color: "var(--t-text)" }}>{program.university_name}</h1>
              {rail && <PulseIndicator pulse={rail.pulse} />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {program.division && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-600/10 text-pink-500">{program.division}</span>}
              {matchScore && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  matchScore.match_score >= 80 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                  : matchScore.match_score >= 60 ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                  : "text-gray-400 bg-gray-500/15 border-gray-500/30"
                }`} data-testid="journey-match-score">
                  <Target className="w-3 h-3" /> {matchScore.match_score}% Match
                </span>
              )}
              <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{program.conference}{program.region ? ` · ${program.region}` : ""} · {timeline.length} events</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="text-[11px] h-8 hidden sm:flex" onClick={() => navigate(`/compare?selected=${programId}`)}
              style={{ color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="compare-btn">
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />Compare
            </Button>
            <button onClick={() => updateProgram({ is_active: !(program.is_active !== false) })}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                program.is_active !== false ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-gray-500/15 text-gray-400 border-gray-500/30"
              }`} data-testid="active-toggle">
              {program.is_active !== false ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
        {/* Progress Rail */}
        <ProgressRail rail={rail} onStageClick={handleStageClick} />
      </div>

      {/* ─── Contextual Hero: Checklist / Celebration / Nothing ─── */}
      {isNewSchool ? (
        <GettingStartedChecklist program={program} coaches={coaches} timeline={timeline}
          onAddCoach={openCoach} onSendEmail={isBasic ? null : openEmail} onSetFollowup={openFollowup} />
      ) : isInConversation ? (
        <CelebrationHero program={program} coaches={coaches} onEmail={isBasic ? null : openEmail} onLog={openLog} onCall={openLog} />
      ) : null}

      {/* ─── Inline Forms ─── */}
      {activeForm === "replied" && <MarkAsRepliedModal programId={programId} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "log" && <LogInteractionForm programId={programId} universityName={program.university_name} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "email" && <EmailComposer coaches={coaches} programId={programId} onSent={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "coach" && <CoachForm initial={editCoach} programId={programId} onSave={saveCoach} onCancel={closeForm} />}
      {activeForm === "followup" && (
        <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Schedule Follow-up</h3>
            <button onClick={closeForm} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
          </div>
          <FollowUpScheduler program={program} onSaved={() => { closeForm(); fetchData(); }} />
        </div>
      )}

      {/* ─── Main Grid: Conversation + At a Glance ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Conversation Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="conversation-timeline">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Conversation</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={openLog}
                  style={{ color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="timeline-log-btn">
                  <MessageSquare className="w-3 h-3 mr-1.5" />Log
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={openEmail}
                  disabled={isBasic} style={{ color: "var(--t-text-secondary)", borderColor: "var(--t-border)", opacity: isBasic ? 0.4 : 1 }} data-testid="timeline-email-btn">
                  <Mail className="w-3 h-3 mr-1.5" />{isBasic ? <><Lock className="w-3 h-3 mr-1" />Email</> : "Email"}
                </Button>
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "var(--t-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No interactions yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Send an email or log an interaction to get started</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {timeline.map((event, i) => <ConversationBubble key={event.id || i} event={event} />)}
              </div>
            )}
          </div>
        </div>

        {/* At a Glance Sidebar */}
        <div className="lg:col-span-1">
          <AtAGlanceCard program={program} coaches={coaches} isPremium={isPremium} isBasic={isBasic}
            programId={programId} onDraftEmail={openEmail} onAddCoach={openCoach} onScheduleFollowup={() => fetchData()} />

          {/* Coach management (below At a Glance) */}
          {coaches.length > 0 && (
            <div className="rounded-2xl border p-4 mt-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="coach-panel">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Users className="w-4 h-4 text-pink-500" />Coaches</h3>
                <button onClick={openCoach} className="p-1 rounded-lg hover:bg-[var(--t-surface-alt)]" data-testid="add-coach-btn"><Plus className="w-4 h-4 text-pink-500" /></button>
              </div>
              <div className="space-y-2">
                {coaches.map(c => (
                  <div key={c.coach_id} className="p-2.5 rounded-lg border group" style={{ borderColor: "var(--t-border)" }}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{c.coach_name}</p>
                        <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{c.role}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditCoach(c); setActiveForm("coach"); }} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><Edit2 className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
                        <button onClick={() => deleteCoach(c.coach_id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-red-400" /></button>
                      </div>
                    </div>
                    {c.email && <a href={`mailto:${c.email}`} className="text-[11px] text-pink-500 hover:text-pink-400 flex items-center gap-1 mt-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</a>}
                    {c.phone && <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "var(--t-text-muted)" }}><Phone className="w-3 h-3" />{c.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating Action Bar ─── */}
      <FloatingActionBar onEmail={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
        onLog={openLog} onReplied={openReplied} onFollowup={openFollowup} isBasic={isBasic} />
    </div>
  );
}
