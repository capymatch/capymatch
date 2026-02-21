import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, ShieldCheck, AlertTriangle, Info, RefreshCw, Loader2 } from "lucide-react";
import { AcademicCompletenessFlag, ThisMayChangeCopy } from "./TrustIndicators";

const CONFIDENCE_STYLES = {
  High: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#059669", label: "High Confidence" },
  Medium: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", text: "#d97706", label: "Medium Confidence" },
  Limited: { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", text: "#94a3b8", label: "Limited Confidence" },
};

function SourceTag({ sourceId }) {
  const labels = {
    COLLEGE_SCORECARD: "IPEDS",
    SCHOOL_SITE_SCRAPE: "School Site",
    KNOWLEDGE_BASE: "Program Data",
  };
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{ background: "rgba(100,116,139,0.1)", color: "var(--t-text-faint, #94a3b8)", border: "1px solid rgba(100,116,139,0.15)" }}>
      {labels[sourceId] || sourceId}
    </span>
  );
}

function ReasonItem({ item, icon: Icon, accentColor }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${accentColor}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text)" }}>{item.text}</p>
        {item.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.sources.map((s, i) => <SourceTag key={i} sourceId={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }) {
  const style = CONFIDENCE_STYLES[confidence?.level] || CONFIDENCE_STYLES.Limited;
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
      data-testid="insight-confidence-badge">
      <ShieldCheck className="w-3 h-3" />
      {style.label}
    </div>
  );
}

export function SchoolInsightCard({ insight, loading, onRefresh, dataConfidence }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        data-testid="school-insight-loading">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.1)" }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Analyzing this school for you...</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>Reviewing data sources and generating personalized insights</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  const data = insight.insight || insight;
  const aiInsight = data.ai_insight || {};
  const reasons = aiInsight.top_reasons || [];
  const risks = aiInsight.top_risks || [];
  const confidence = data.data_confidence || { level: "Limited" };
  const disclaimers = data.disclaimers || [];
  const confidenceReasons = confidence.reasons || [];

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid="school-insight-card">
      {/* Accent bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.1)" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Why This School</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>AI-powered analysis based on your profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={confidence} />
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Refresh analysis" data-testid="insight-refresh-btn">
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Top 3 Reasons */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#6366f1" }}>
            Top reasons this may be a good fit
          </p>
          <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {reasons.map((r, i) => (
              <ReasonItem key={i} item={r} icon={ShieldCheck} accentColor="#059669" />
            ))}
          </div>
        </div>

        {/* Top 2 Risks */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#f59e0b" }}>
            Risks to consider
          </p>
          <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {risks.map((r, i) => (
              <ReasonItem key={i} item={r} icon={AlertTriangle} accentColor="#f59e0b" />
            ))}
          </div>
        </div>

        {/* Expandable details */}
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--t-text-muted)" }}
          data-testid="insight-expand-btn">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Data sources & confidence"}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--t-border)" }}>
            {/* Confidence reasons */}
            {confidenceReasons.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-text-muted)" }}>
                  Confidence factors
                </p>
                <ul className="space-y-1">
                  {confidenceReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources used */}
            {insight.sources_used?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-text-muted)" }}>
                  Data sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {insight.sources_used.map((s, i) => (
                    <SourceTag key={i} sourceId={s.source_id} />
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimers */}
            {disclaimers.length > 0 && (
              <div className="rounded-lg p-2.5" style={{ background: "rgba(100,116,139,0.06)" }}>
                {disclaimers.map((d, i) => (
                  <p key={i} className="text-[10px] leading-relaxed" style={{ color: "var(--t-text-faint, #94a3b8)" }}>
                    {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
