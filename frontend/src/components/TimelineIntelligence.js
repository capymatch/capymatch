import { Clock, Info, X, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { DataConfidenceBadge, ThisMayChangeCopy } from "./TrustIndicators";
import { ImproveCardNudge } from "./ImproveCardNudge";

const STATUS_CONFIG = {
  filling_early: { accent: "#F59E0B", bg: "#FFFBEB", text: "#92400E", dotColor: "#F59E0B" },
  standard:      { accent: "#2563EB", bg: "#EFF6FF", text: "#1E40AF", dotColor: "#2563EB" },
  late:          { accent: "#16A34A", bg: "#F0FDF4", text: "#166534", dotColor: "#16A34A" },
  unknown:       { accent: "#94A3B8", bg: "#F8FAFC", text: "#64748B", dotColor: "#94A3B8" },
};

/* ── Compact label for match cards ── */
export function TimelineLabel({ timeline, onClick }) {
  if (!timeline) return null;
  const cfg = STATUS_CONFIG[timeline.status] || STATUS_CONFIG.unknown;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
      style={{ color: cfg.text }}
      data-testid="timeline-label"
    >
      <Clock className="w-3 h-3" style={{ color: cfg.accent }} />
      Recruiting Timeline: {timeline.label}
    </button>
  );
}

/* ── Full Timeline Status Card for Journey / Detail pages ── */
export function TimelineStatusCard({ timeline, dataConfidence, loading, onRefresh, programId }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        data-testid="timeline-status-loading">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6366f1" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Analyzing recruiting timeline...</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Reviewing timeline patterns and data sources</p>
          </div>
        </div>
      </div>
    );
  }

  if (!timeline) return null;
  const cfg = STATUS_CONFIG[timeline.status] || STATUS_CONFIG.unknown;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="timeline-status-card"
    >
      <div className="flex">
        {/* Left accent bar */}
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.accent }} />

        <div className="p-4 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                <Clock className="w-4 h-4" style={{ color: cfg.accent }} />
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                  Recruiting Timeline
                </div>
                <div className="text-sm font-bold" style={{ color: cfg.text }}>
                  {timeline.label}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {dataConfidence?.level && <DataConfidenceBadge level={dataConfidence.level} />}
              {onRefresh && (
                <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="timeline-refresh-btn">
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
            {timeline.explanation}
          </p>

          {/* Guidance */}
          <div className="rounded-lg p-3" style={{ backgroundColor: cfg.bg }}>
            <p className="text-[12px] font-semibold mb-0.5" style={{ color: cfg.text }}>
              What this means for you
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
              {timeline.guidance}
            </p>
          </div>

          {/* How we know this */}
          <div className="relative">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:opacity-70 transition-opacity"
              style={{ color: "var(--t-text-muted, #9ca3af)" }}
              data-testid="timeline-info-btn"
            >
              <Info className="w-3 h-3" />
              How this is determined
            </button>
            {showTooltip && (
              <div
                className="absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 max-w-xs"
                style={{ backgroundColor: "var(--t-surface, #fff)", borderColor: "var(--t-border, #e5e7eb)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                    {timeline.tooltip}
                  </p>
                  <button onClick={() => setShowTooltip(false)} className="flex-shrink-0 p-0.5">
                    <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <ThisMayChangeCopy />
        </div>
      </div>
    </div>
  );
}
