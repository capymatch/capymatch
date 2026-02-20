import { useState } from "react";
import { Plus, Users, Sparkles, Loader2, Crown, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { BOARD_STAGE_LABELS } from "./constants";
import { FollowUpScheduler } from "./FollowUpScheduler";

export function AtAGlanceCard({ program, coaches, isPremium, isBasic, programId, onDraftEmail, onAddCoach, onScheduleFollowup }) {
  const signals = program.signals || {};
  const boardGroup = program.board_group;
  const stageLabel = BOARD_STAGE_LABELS[boardGroup] || boardGroup;
  const stageColors = {
    overdue: "bg-slate-500/12 text-teal-600", needs_outreach: "bg-amber-500/12 text-amber-400",
    waiting_on_reply: "bg-blue-500/12 text-blue-400", in_conversation: "bg-slate-500/12 text-teal-600",
    archived: "bg-gray-500/12 text-gray-400",
  };

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
    <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", display: "flex", flexDirection: "column", gap: "14px" }} data-testid="at-a-glance">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>At a Glance</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stageColors[boardGroup] || stageColors.needs_outreach}`}>{stageLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {signals.has_coach_reply ? (
          <div className="p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Replied</p>
            <p className="text-sm font-bold text-teal-600">{signals.days_since_reply === 0 ? "Today" : `${signals.days_since_reply}d ago`}</p>
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

      {coaches.length > 0 ? (
        <div className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
          <div className="w-8 h-8 rounded-lg bg-teal-700/15 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-teal-700">{coaches[0].coach_name?.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--t-text)" }}>{coaches[0].coach_name}</p>
            {coaches[0].email && <p className="text-[10px] text-teal-700 truncate">{coaches[0].email}</p>}
            {!coaches[0].email && <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{coaches[0].role}</p>}
          </div>
          {coaches.length > 1 && <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>+{coaches.length - 1}</span>}
        </div>
      ) : (
        <button onClick={onAddCoach} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-dashed text-xs transition-colors hover:border-teal-700/30"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }} data-testid="glance-add-coach">
          <Plus className="w-3.5 h-3.5" /> Add coach contact
        </button>
      )}

      {program.next_action_due && (
        <div className="p-2.5 rounded-lg bg-orange-500/8 border border-orange-500/15">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            <span className="text-[11px] font-medium text-orange-300">Follow-up: {new Date(program.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
          {program.next_action && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{program.next_action}</p>}
        </div>
      )}

      {isPremium ? (
        <div className="rounded-lg p-2.5 border" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(46,196,182,0.04))", borderColor: "rgba(168,85,247,0.15)" }}>
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

      <button onClick={() => setShowMore(!showMore)} className="w-full text-[10px] font-medium flex items-center justify-center gap-1 pt-1"
        style={{ color: "var(--t-text-muted)" }} data-testid="glance-show-more">
        {showMore ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {showMore ? "Show less" : "More details"}
      </button>

      {showMore && (
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
          {coaches.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>All Coaches</p>
              {coaches.map(c => (
                <div key={c.coach_id} className="flex items-center gap-2 py-1.5">
                  <Users className="w-3 h-3 text-teal-700 flex-shrink-0" />
                  <span className="text-[11px]" style={{ color: "var(--t-text-secondary)" }}>{c.coach_name} — {c.role}</span>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>Schedule Follow-up</p>
            <FollowUpScheduler program={program} onSaved={onScheduleFollowup} />
          </div>
        </div>
      )}
    </div>
  );
}
