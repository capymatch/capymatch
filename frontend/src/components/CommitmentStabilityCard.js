import { useState } from "react";
import { TrendingDown, Info, X, ShieldCheck } from "lucide-react";

const STATUS_CONFIG = {
  high: { accent: "#10b981", bg: "rgba(16,185,129,0.08)", text: "#065f46", pill: "rgba(16,185,129,0.12)", pillText: "#059669" },
  moderate: { accent: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#78350f", pill: "rgba(245,158,11,0.12)", pillText: "#d97706" },
  volatile: { accent: "#ef4444", bg: "rgba(239,68,68,0.08)", text: "#7f1d1d", pill: "rgba(239,68,68,0.12)", pillText: "#dc2626" },
};

function MiniSparkline({ data, trend, accent }) {
  if (!data || data.length < 3) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const years = ["2022", "2023", "2024"];

  return (
    <div className="flex flex-col items-end gap-1" data-testid="stability-sparkline">
      <div className="flex items-end gap-1.5" style={{ height: 32 }}>
        {data.map((v, i) => {
          const h = 8 + ((v - min) / range) * 22;
          return (
            <div
              key={i}
              className="rounded-sm"
              style={{
                width: 14,
                height: h,
                backgroundColor: accent,
                opacity: 0.25 + (i / (data.length - 1)) * 0.75,
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-1.5">
        {years.map((y) => (
          <span key={y} className="text-[8px]" style={{ color: "var(--t-text-faint, #b0b0c0)", width: 14, textAlign: "center" }}>{y}</span>
        ))}
      </div>
      <span className="text-[10px] font-medium" style={{ color: "var(--t-text-muted, #6b7280)" }}>
        Trend: {trend}
      </span>
    </div>
  );
}

function ConfidenceFooter({ confidence, lastUpdated, tooltip }) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div
      className="flex items-center justify-between pt-3 mt-3 relative"
      style={{ borderTop: "1px solid var(--t-border, #e5e7eb)" }}
      data-testid="stability-confidence-footer"
    >
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="w-3 h-3" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
        <span className="text-[10px]" style={{ color: "var(--t-text-faint, #b0b0c0)" }}>
          Data confidence: <strong>{confidence}</strong>
        </span>
        <button
          onClick={() => setShowTip(!showTip)}
          className="ml-0.5 hover:opacity-80"
        >
          <Info className="w-3 h-3" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
        </button>
        {showTip && (
          <div
            className="absolute bottom-full left-0 mb-2 p-3 rounded-lg border shadow-lg z-10 max-w-xs"
            style={{ backgroundColor: "var(--t-surface, #fff)", borderColor: "var(--t-border, #e5e7eb)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                {tooltip}
              </p>
              <button onClick={() => setShowTip(false)} className="flex-shrink-0 p-0.5">
                <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
              </button>
            </div>
          </div>
        )}
      </div>
      <span className="text-[10px]" style={{ color: "var(--t-text-faint, #b0b0c0)" }}>
        Updated: {lastUpdated}
      </span>
    </div>
  );
}

export function CommitmentStabilityCard({ stability }) {
  const [showBadgeTip, setShowBadgeTip] = useState(false);
  if (!stability) return null;
  const cfg = STATUS_CONFIG[stability.status] || STATUS_CONFIG.moderate;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #EEF2F6",
        boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
      }}
      data-testid="commitment-stability-card"
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.accent }} />

        <div className="p-5 flex-1">
          {/* 1. Header Row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" style={{ color: cfg.accent }} />
              <span className="text-[15px] font-semibold" style={{ color: "var(--t-text, #1f2937)" }}>
                Commitment Stability
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowBadgeTip(!showBadgeTip)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold cursor-help"
                style={{ backgroundColor: cfg.pill, color: cfg.pillText }}
                data-testid="stability-status-pill"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.accent }} />
                {stability.label}
              </button>
              {showBadgeTip && (
                <div
                  className="absolute top-full right-0 mt-2 p-3 rounded-lg border shadow-lg z-10 w-64"
                  style={{ backgroundColor: "var(--t-surface, #fff)", borderColor: "var(--t-border, #e5e7eb)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                      {stability.tooltip}
                    </p>
                    <button onClick={() => setShowBadgeTip(false)} className="flex-shrink-0 p-0.5">
                      <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Primary Metric Row */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <div
                className="text-4xl font-extrabold tracking-tight leading-none"
                style={{ color: cfg.text }}
                data-testid="stability-retention-rate"
              >
                {stability.retention_rate}%
              </div>
              <div className="text-[13px] font-medium mt-1" style={{ color: "var(--t-text, #1f2937)" }}>
                Roster Retention Rate
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                Last 3 recruiting cycles
              </div>
            </div>
            <MiniSparkline data={stability.sparkline} trend={stability.trend} accent={cfg.accent} />
          </div>

          {/* 3. Key Signals Section (2-column) */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 rounded-lg"
            style={{ backgroundColor: "var(--t-bg-subtle, #f8fafc)" }}
            data-testid="stability-insights"
          >
            {/* Left: What We're Seeing */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                What We're Seeing
              </p>
              <ul className="space-y-1.5">
                {stability.signals.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "var(--t-text, #1f2937)" }}>
                    <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.accent }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: What This Means */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                What This Means
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                {stability.meaning}
              </p>
            </div>
          </div>

          {/* 4. Context Tags */}
          <div className="flex flex-wrap gap-2 mb-4" data-testid="stability-context-tags">
            {stability.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: "rgba(100,116,139,0.06)",
                  color: "var(--t-text-muted, #6b7280)",
                  border: "1px solid rgba(100,116,139,0.1)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 5. Confidence & Transparency Footer */}
          <ConfidenceFooter
            confidence={stability.confidence}
            lastUpdated={stability.last_updated}
            tooltip="Based on public roster data and historical patterns. Accuracy improves as data refreshes."
          />
        </div>
      </div>
    </div>
  );
}
