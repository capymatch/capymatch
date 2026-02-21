import { useState } from "react";
import { AlertTriangle, Info, Clock, DollarSign, CheckCircle2, X } from "lucide-react";

const BADGE_CONFIG = {
  academic_reach: {
    icon: AlertTriangle,
    bg: "#FFF7ED",
    text: "#9A3412",
    border: "#FDBA74",
  },
  roster_tight: {
    icon: Info,
    bg: "#F1F5F9",
    text: "#334155",
    border: "#CBD5E1",
  },
  timeline_risk: {
    icon: Clock,
    bg: "#EEF2FF",
    text: "#3730A3",
    border: "#A5B4FC",
  },
  funding_dependent: {
    icon: DollarSign,
    bg: "#F0FDF4",
    text: "#166534",
    border: "#86EFAC",
  },
};

export function RiskBadgePill({ badge, onClick }) {
  const config = BADGE_CONFIG[badge.key] || BADGE_CONFIG.roster_tight;
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-80 cursor-pointer border"
      style={{ backgroundColor: config.bg, color: config.text, borderColor: config.border }}
      data-testid={`risk-badge-${badge.key}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      {badge.label}
    </button>
  );
}

export function RiskBadgeRow({ badges, max = 2, onBadgeClick }) {
  if (!badges || badges.length === 0) return null;
  const visible = badges.slice(0, max);
  const overflow = badges.length - max;
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="risk-badges-row">
      {visible.map((b) => (
        <RiskBadgePill key={b.key} badge={b} onClick={() => onBadgeClick?.(b)} />
      ))}
      {overflow > 0 && (
        <button
          className="text-[11px] font-medium px-2 py-0.5 rounded-full hover:bg-gray-100 transition-colors"
          style={{ color: "var(--t-text-muted)" }}
          onClick={() => onBadgeClick?.(badges[max])}
          data-testid="risk-badges-overflow"
        >
          +{overflow} more
        </button>
      )}
    </div>
  );
}

export function RiskBadgeEmpty() {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium border"
      style={{ backgroundColor: "#F0FDF4", color: "#166534", borderColor: "#86EFAC" }}
      data-testid="risk-badge-clear"
    >
      <CheckCircle2 className="w-3 h-3" />
      No major risks identified
    </div>
  );
}

export function RiskExplainerDrawer({ badges, activeBadge, onClose }) {
  const [selected, setSelected] = useState(activeBadge || (badges?.[0] || null));
  if (!badges || badges.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="risk-explainer-drawer">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200"
        style={{ backgroundColor: "var(--t-surface, #fff)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface, #fff)" }}>
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>Risk Assessment</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" data-testid="close-risk-drawer">
            <X className="w-5 h-5" style={{ color: "var(--t-text-muted)" }} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {badges.map((badge) => {
            const config = BADGE_CONFIG[badge.key] || BADGE_CONFIG.roster_tight;
            const Icon = config.icon;
            const isSelected = selected?.key === badge.key;
            return (
              <button
                key={badge.key}
                onClick={() => setSelected(badge)}
                className="w-full text-left rounded-xl p-4 border-2 transition-all duration-150"
                style={{
                  backgroundColor: isSelected ? config.bg : "var(--t-surface, #fff)",
                  borderColor: isSelected ? config.border : "var(--t-border, #e5e7eb)",
                }}
                data-testid={`drawer-badge-${badge.key}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                    <Icon className="w-4 h-4" style={{ color: config.text }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: config.text }}>{badge.label}</span>
                </div>
                {isSelected && (
                  <p className="text-[13px] leading-relaxed mt-2 pl-9" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                    {badge.summary}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {badges.length === 0 && (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" style={{ color: "#166534" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>No major risks identified</p>
            <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>
              Based on available data, this school appears well-aligned with your profile.
            </p>
          </div>
        )}

        <div className="px-6 py-4 border-t" style={{ borderColor: "var(--t-border)" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
            Risk badges are based on publicly available data and NCAA roster rules. They are informational only and do not guarantee outcomes. Always verify directly with the school's coaching staff.
          </p>
        </div>
      </div>
    </div>
  );
}
