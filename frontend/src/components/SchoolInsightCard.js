import { useState } from "react";
import { Check, AlertTriangle, Info, RefreshCw, Loader2, AlertCircle } from "lucide-react";

const SEVERITY_STYLES = {
  high: { bg: "rgba(239,68,68,0.08)", dot: "#ef4444" },
  medium: { bg: "rgba(245,158,11,0.08)", dot: "#f59e0b" },
  low: { bg: "rgba(148,163,184,0.08)", dot: "#94a3b8" },
};

export function SchoolInsightCard({ insight, loading, onRefresh, dataConfidence, program }) {
  const [showInfo, setShowInfo] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        data-testid="school-insight-loading">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6366f1" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Analyzing this school for you...</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Reviewing data sources and generating personalized insights</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insight) return null;

  // Support both new intelligence pipeline and legacy response shape
  const isNewSchema = "strengths" in insight || "card_type" in insight;
  const strengths = isNewSchema ? (insight.strengths || []) : ((insight.insight?.ai_insight?.top_reasons) || []);
  const concerns = isNewSchema ? (insight.concerns || []) : ((insight.insight?.ai_insight?.top_risks) || []);
  const status = insight.status || "ok";
  const unknowns = insight.unknowns || [];
  const summary = insight.summary || null;
  const dq = insight.data_quality || {};

  const division = (insight.division || program?.division || "").toUpperCase();
  const rosterLimit = division === "D1" || division === "D2" ? 18 : null;
  const ctxTags = [];
  if (division) ctxTags.push(`NCAA ${division}`);
  if (division === "D1" || division === "D2") ctxTags.push("Equivalency Era");
  if (rosterLimit) ctxTags.push(`Roster Limit: ${rosterLimit}`);

  const generatedAt = insight.generated_at ? new Date(insight.generated_at) : new Date();
  const updatedDate = `${generatedAt.toLocaleString("en-US", { month: "short" })} ${generatedAt.getFullYear()}`;

  // Insufficient data state
  if (status === "insufficient_data") {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        data-testid="school-insight-card">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl" role="img" aria-label="brain">🧠</span>
              <h3 className="text-base font-bold" style={{ color: "#1a1a2e" }} data-testid="insight-card-title">Why This School / Why Not</h3>
            </div>
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="insight-refresh-btn">
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
              </button>
            )}
          </div>
          <div className="rounded-lg px-4 py-3 flex items-start gap-2.5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
            data-testid="insight-insufficient-data">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#92400e" }}>{insight.reason || "Insufficient data for analysis."}</p>
              {insight.missing_sections?.length > 0 && (
                <p className="text-[12px] mt-1" style={{ color: "#6b7280" }}>
                  Missing: {insight.missing_sections.join(", ")}
                </p>
              )}
            </div>
          </div>
          {unknowns.length > 0 && (
            <div className="space-y-1.5">
              {unknowns.slice(0, 4).map((u, i) => (
                <p key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: "#6b7280" }}>
                  <span style={{ color: "#9ca3af" }}>·</span> {u.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="school-insight-card">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" role="img" aria-label="brain">🧠</span>
            <h3 className="text-base font-bold" style={{ color: "#1a1a2e" }} data-testid="insight-card-title">
              Why This School / Why Not
            </h3>
          </div>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
              title="Refresh analysis" data-testid="insight-refresh-btn">
              <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
            </button>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <p className="text-[13px] font-medium leading-relaxed" style={{ color: "#374151" }} data-testid="insight-summary">
            {summary}
          </p>
        )}

        {/* Main content with left border */}
        <div style={{ borderLeft: "2px solid rgba(99,102,241,0.15)", paddingLeft: 16 }}>
          {/* AI attribution */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base" role="img" aria-label="robot">🤖</span>
            <p className="text-[13px]" style={{ color: "#6b7280" }}>
              AI-generated based on coach, roster, and program insights.
            </p>
          </div>

          {/* Two-column: Strengths + Concerns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-lg border overflow-hidden mb-4" style={{ borderColor: "#e5e7eb" }}>
            {/* Left: Strengths */}
            <div className="p-3.5 sm:border-r" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
                  <Check className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                </span>
                <h4 className="text-[13px] font-bold" style={{ color: "#1a1a2e" }}>Strengths of This Program</h4>
              </div>
              <ul className="space-y-2.5">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    <span>
                      {s.text}
                      {s.evidence === "partial" && (
                        <span className="ml-1 text-[10px] font-medium" style={{ color: "#9ca3af" }}>(partial data)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Concerns */}
            <div className="p-3.5 border-t sm:border-t-0" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
                </span>
                <h4 className="text-[13px] font-bold" style={{ color: "#1a1a2e" }}>Factors to Consider</h4>
              </div>
              <ul className="space-y-2.5">
                {concerns.map((c, i) => {
                  const sev = SEVERITY_STYLES[c.severity] || SEVERITY_STYLES.medium;
                  return (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sev.dot }} />
                      <span>
                        {c.text}
                        {c.evidence === "partial" && (
                          <span className="ml-1 text-[10px] font-medium" style={{ color: "#9ca3af" }}>(partial data)</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Unknowns */}
          {unknowns.length > 0 && (
            <div className="rounded-lg px-3.5 py-2.5 mb-4" style={{ background: "#f8fafc", border: "1px solid #f1f5f9" }}
              data-testid="insight-unknowns">
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "#64748b" }}>Data gaps</p>
              {unknowns.slice(0, 4).map((u, i) => (
                <p key={i} className="text-[11px] leading-relaxed flex items-start gap-1.5" style={{ color: "#6b7280" }}>
                  <span className="mt-0.5" style={{ color: "#cbd5e1" }}>·</span>
                  {u.text}
                </p>
              ))}
            </div>
          )}

          {/* Context tags */}
          {ctxTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3" data-testid="insight-context-tags">
              {ctxTags.map((tag, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                    {tag}
                  </span>
                  {i < ctxTags.length - 1 && (
                    <span className="mx-1 text-[10px]" style={{ color: "#cbd5e1" }}>·</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] italic" style={{ color: "#9ca3af" }}>
            *This analysis should not be considered definitive.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold hover:opacity-70 transition-opacity"
            style={{ color: "#1a1a2e" }}
            data-testid="insight-info-btn">
            Recruiting HQ Perspective
            <Info className="w-3.5 h-3.5" style={{ color: "#93c5fd" }} />
          </button>
          <span className="text-[12px]" style={{ color: "#9ca3af" }}>
            Updated: {updatedDate}
          </span>
        </div>

        {/* Expandable info */}
        {showInfo && (
          <div className="rounded-lg px-4 py-3" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
            data-testid="insight-info-panel">
            <p className="text-[12px] leading-relaxed" style={{ color: "#6b7280" }}>
              Based on available information and current landscape. Factors may evolve with time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
