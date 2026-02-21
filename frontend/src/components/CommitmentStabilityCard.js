import { useState } from "react";
import { TrendingDown, Info, Check, X } from "lucide-react";

const STATUS_CONFIG = {
  high: { pill: "#d1fae5", pillText: "#065f46", pillDot: "#10b981", barColor: "#6ee7b7" },
  moderate: { pill: "#fef3c7", pillText: "#78350f", pillDot: "#f59e0b", barColor: "#93c5fd" },
  volatile: { pill: "#fee2e2", pillText: "#7f1d1d", pillDot: "#ef4444", barColor: "#fca5a5" },
};

function Sparkline({ data, trend }) {
  if (!data || data.length < 3) return null;
  // Generate 7 bar points from 3 data values (interpolated)
  const bars = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    let val;
    if (t <= 0.5) {
      val = data[0] + (data[1] - data[0]) * (t / 0.5);
    } else {
      val = data[1] + (data[2] - data[1]) * ((t - 0.5) / 0.5);
    }
    bars.push(val);
  }
  const max = Math.max(...bars);
  const min = Math.min(...bars);
  const range = max - min || 1;

  return (
    <div className="flex flex-col items-center" data-testid="stability-sparkline">
      <div className="flex items-end gap-[3px]" style={{ height: 44 }}>
        {bars.map((v, i) => {
          const h = 10 + ((v - min) / range) * 30;
          return (
            <div
              key={i}
              className="rounded-sm"
              style={{
                width: 10,
                height: h,
                backgroundColor: `rgba(147,197,253,${0.4 + (i / 6) * 0.6})`,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between w-full mt-1.5 px-0.5">
        <span className="text-[11px]" style={{ color: "#9ca3af" }}>2022</span>
        <span className="text-[11px]" style={{ color: "#9ca3af" }}>2023</span>
        <span className="text-[11px]" style={{ color: "#9ca3af" }}>2024</span>
      </div>
      <span className="text-[12px] mt-1" style={{ color: "#6b7280" }}>
        Trend: {trend}
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
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        border: "1px solid #f0f0f0",
      }}
      data-testid="commitment-stability-card"
    >
      <div className="p-5 pb-0">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4 relative">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" style={{ color: "#0d9488" }} />
            <span className="text-lg font-bold tracking-tight" style={{ color: "#1a1a1a" }}>
              Commitment Stability
            </span>
          </div>
          <button
            onClick={() => setShowBadgeTip(!showBadgeTip)}
            className="px-3.5 py-1 rounded-full text-[13px] font-semibold cursor-help"
            style={{ backgroundColor: cfg.pill, color: cfg.pillText }}
            data-testid="stability-status-pill"
          >
            {stability.label}
          </button>
          {showBadgeTip && (
            <div
              className="absolute top-full right-0 mt-2 p-3.5 rounded-xl border shadow-lg z-20 w-64"
              style={{ backgroundColor: "#fff", borderColor: "#e5e7eb" }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] leading-relaxed" style={{ color: "#4b5563" }}>
                  {stability.tooltip}
                </p>
                <button onClick={() => setShowBadgeTip(false)} className="p-0.5">
                  <X className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Metric Section (inner card) ── */}
        <div
          className="rounded-xl p-4 mb-5 grid grid-cols-2 gap-4 items-center"
          style={{ backgroundColor: "#f8fafc", border: "1px solid #f0f2f5" }}
        >
          {/* Left: Big number */}
          <div>
            <div className="flex items-baseline gap-0.5" data-testid="stability-retention-rate">
              <span className="text-[42px] font-bold leading-none" style={{ color: "#1e6091" }}>
                {stability.retention_rate}
              </span>
              <span className="text-xl font-medium" style={{ color: "#1e6091" }}>%</span>
            </div>
            <div className="text-[14px] font-semibold mt-1.5" style={{ color: "#1a1a1a" }}>
              Roster Retention Rate
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
              Last 3 recruiting cycles
            </div>
          </div>

          {/* Right: Sparkline */}
          <div className="flex justify-end">
            <Sparkline data={stability.sparkline} trend={stability.trend} />
          </div>
        </div>

        {/* ── Two-column insights ── */}
        <div className="grid grid-cols-2 gap-0 mb-5">
          {/* Left: What We're Seeing */}
          <div className="pr-4" style={{ borderRight: "1px solid #e5e7eb" }}>
            <p className="text-[15px] font-bold mb-3" style={{ color: "#1a1a1a" }}>
              What We're Seeing
            </p>
            <ul className="space-y-2.5">
              {stability.signals.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: "#374151" }}>
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#5eead4" }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: What This Means */}
          <div className="pl-4">
            <p className="text-[15px] font-bold mb-3" style={{ color: "#1a1a1a" }}>
              What This Means
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#4b5563" }}>
              {stability.meaning}
            </p>
          </div>
        </div>

        {/* ── Context Tags ── */}
        <div className="flex items-center flex-wrap gap-2 mb-5" data-testid="stability-context-tags">
          {stability.tags.map((tag, i) => (
            <span key={i} className="contents">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium"
                style={{ backgroundColor: "#f3f4f6", color: "#4b5563" }}
              >
                {tag}
              </span>
              {i < stability.tags.length - 1 && (
                <span className="text-[10px]" style={{ color: "#d1d5db" }}>&#x2022;</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Confidence footer ── */}
        <div
          className="flex items-center justify-between pb-4 pt-3"
          style={{ borderTop: "1px solid #e5e7eb" }}
          data-testid="stability-confidence-footer"
        >
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4" style={{ color: "#6b96b8" }} />
            <span className="text-[13px]" style={{ color: "#1a1a1a" }}>
              Data confidence: <strong>{stability.confidence}</strong>
            </span>
          </div>
          <span className="text-[13px]" style={{ color: "#1a1a1a" }}>
            Updated: {stability.last_updated}
          </span>
        </div>
      </div>

      {/* ── Bottom disclaimer bar ── */}
      <div
        className="px-5 py-3 text-center"
        style={{ backgroundColor: "#f8f9fa", borderTop: "1px solid #f0f0f0" }}
        data-testid="stability-disclaimer"
      >
        <p className="text-[12px]" style={{ color: "#9ca3af" }}>
          Based on public roster data and historical patterns. Not a prediction.
        </p>
      </div>
    </div>
  );
}
