import { Info, Check } from "lucide-react";
import { useState } from "react";

const STATUS_CONFIG = {
  friendly:     { dot: "#10b981", statusBg: "rgba(16,185,129,0.08)", statusBorder: "rgba(16,185,129,0.18)", accent: "#10b981" },
  limited:      { dot: "#f59e0b", statusBg: "rgba(245,158,11,0.08)", statusBorder: "rgba(245,158,11,0.18)", accent: "#f59e0b" },
  info_limited: { dot: "#94a3b8", statusBg: "rgba(148,163,184,0.08)", statusBorder: "rgba(148,163,184,0.18)", accent: "#94a3b8" },
  unknown:      { dot: "#94a3b8", statusBg: "rgba(148,163,184,0.08)", statusBorder: "rgba(148,163,184,0.18)", accent: "#94a3b8" },
};

export function NilReadinessCard({ nil, dataConfidence, timeline }) {
  const [showTooltip, setShowTooltip] = useState(false);
  if (!nil) return null;
  const cfg = STATUS_CONFIG[nil.status] || STATUS_CONFIG.unknown;
  const timelineLabel = timeline?.label || null;
  const timelineStatus = timeline?.status || null;
  const tlDot = timelineStatus === "filling_early" ? "#10b981" : timelineStatus === "standard" ? "#3b82f6" : timelineStatus === "late" ? "#f59e0b" : "#94a3b8";
  const confidenceLevel = dataConfidence?.level || "Medium";
  const now = new Date();
  const updatedDate = `${now.toLocaleString("en-US", { month: "short" })} ${now.getFullYear()}`;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="nil-readiness-card"
    >
      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" role="img" aria-label="money bag">💰</span>
            <h3 className="text-base font-bold" style={{ color: "#1a1a2e" }} data-testid="nil-card-title">NIL Readiness</h3>
          </div>
          <div className="flex items-center gap-2">
            {timelineLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: "#f8fafc", color: "#374151", border: "1px solid #e5e7eb" }}
                data-testid="nil-timeline-pill">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tlDot }} />
                {timelineLabel}
              </span>
            )}
          </div>
          {/* Tooltip bubble */}
          {showTooltip && (
            <div className="absolute right-0 -top-2 -translate-y-full z-10 max-w-[280px] p-3 rounded-lg border shadow-lg"
              style={{ backgroundColor: "#f8fafc", borderColor: "#e5e7eb" }}
              data-testid="nil-tooltip-bubble">
              <p className="text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                {nil.tooltip}
              </p>
              <div className="absolute bottom-0 right-8 translate-y-1/2 rotate-45 w-2.5 h-2.5"
                style={{ backgroundColor: "#f8fafc", borderRight: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }} />
            </div>
          )}
        </div>

        {/* Main content with left border */}
        <div style={{ borderLeft: `2px solid ${cfg.accent}20`, paddingLeft: 16 }}>
          {/* Status banner */}
          <div className="rounded-lg px-3.5 py-2.5 mb-3"
            style={{ background: cfg.statusBg, border: `1px solid ${cfg.statusBorder}` }}
            data-testid="nil-status-banner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              <span className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{nil.status_label || nil.label}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#4b5563" }}>
            {nil.explanation}
          </p>

          {/* Two-column: What This Involves + What This Means */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-lg border overflow-hidden mb-4" style={{ borderColor: "#e5e7eb" }}>
            {/* Left: What This Involves */}
            <div className="p-3.5 sm:border-r" style={{ borderColor: "#e5e7eb" }}>
              <h4 className="text-[13px] font-bold mb-2.5" style={{ color: "#1a1a2e" }}>What This Involves</h4>
              <ul className="space-y-2">
                {(nil.involves || nil.guidance || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: What This Means for You */}
            <div className="p-3.5 border-t sm:border-t-0" style={{ borderColor: "#e5e7eb" }}>
              <h4 className="text-[13px] font-bold mb-2.5" style={{ color: "#1a1a2e" }}>What This Means for You</h4>
              <p className="text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                {nil.meaning || (nil.guidance || []).join(". ") + "."}
              </p>
            </div>
          </div>

          {/* Context tags */}
          {nil.context_tags?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3" data-testid="nil-context-tags">
              {nil.context_tags.map((tag, i) => (
                <span key={i} className="flex items-center">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                    {tag}
                  </span>
                  {i < nil.context_tags.length - 1 && (
                    <span className="mx-1 text-[10px]" style={{ color: "#cbd5e1" }}>·</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-[11px] italic" style={{ color: "#9ca3af" }}>
            *NIL results vary by athlete, sport, and situation.
          </p>
        </div>

        {/* Footer: Data confidence + Updated */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-70 transition-opacity"
            style={{ color: "#6b7280" }}
            data-testid="nil-info-btn"
          >
            <Info className="w-3.5 h-3.5" style={{ color: "#93c5fd" }} />
            Data confidence: <span className="font-bold" style={{ color: "#1a1a2e" }}>{confidenceLevel}</span>
          </button>
          <span className="text-[12px]" style={{ color: "#9ca3af" }}>
            Updated: {updatedDate}
          </span>
        </div>
      </div>
    </div>
  );
}
