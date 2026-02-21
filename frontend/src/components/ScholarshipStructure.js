import { GraduationCap, Info, X } from "lucide-react";
import { useState } from "react";
import { DataConfidenceBadge, ThisMayChangeCopy } from "./TrustIndicators";

const STATUS_CONFIG = {
  mix:     { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  partial: { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  walkon:  { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  unknown: { accent: "#94A3B8", bg: "#F8FAFC", text: "#64748B" },
};

/* ── Full Scholarship Structure Card for Journey / Detail pages ── */
export function ScholarshipStructureCard({ scholarship }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showNilTooltip, setShowNilTooltip] = useState(false);
  if (!scholarship) return null;
  const cfg = STATUS_CONFIG[scholarship.status] || STATUS_CONFIG.unknown;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="scholarship-structure-card"
    >
      <div className="flex">
        {/* Left accent bar — neutral blue/slate */}
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.accent }} />

        <div className="p-4 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
              <GraduationCap className="w-4 h-4" style={{ color: cfg.accent }} />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                Scholarship Structure
              </div>
              <div className="text-sm font-bold" style={{ color: cfg.text }}>
                {scholarship.label}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
            {scholarship.explanation}
          </p>

          {/* NIL Context — subtle sub-line */}
          {scholarship.nil_context && (
            <div className="relative inline-flex items-center gap-1.5">
              <span className="text-[12px] font-medium" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                NIL Environment:
              </span>
              <button
                onClick={() => setShowNilTooltip(!showNilTooltip)}
                className="text-[12px] font-semibold hover:opacity-70 transition-opacity"
                style={{ color: cfg.text }}
                data-testid="nil-context-btn"
              >
                {scholarship.nil_context}
              </button>
              {showNilTooltip && (
                <div
                  className="absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 max-w-xs"
                  style={{ backgroundColor: "var(--t-surface, #fff)", borderColor: "var(--t-border, #e5e7eb)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                      {scholarship.nil_tooltip}
                    </p>
                    <button onClick={() => setShowNilTooltip(false)} className="flex-shrink-0 p-0.5">
                      <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* How we know this */}
          <div className="relative">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="inline-flex items-center gap-1 text-[11px] font-medium hover:opacity-70 transition-opacity"
              style={{ color: "var(--t-text-muted, #9ca3af)" }}
              data-testid="scholarship-info-btn"
            >
              <Info className="w-3 h-3" />
              About this estimate
            </button>
            {showTooltip && (
              <div
                className="absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 max-w-xs"
                style={{ backgroundColor: "var(--t-surface, #fff)", borderColor: "var(--t-border, #e5e7eb)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                    {scholarship.tooltip}
                  </p>
                  <button onClick={() => setShowTooltip(false)} className="flex-shrink-0 p-0.5">
                    <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
