import { ShieldCheck, AlertCircle, Info } from "lucide-react";

const CONFIDENCE_STYLES = {
  High: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", text: "#059669", label: "High Confidence" },
  Medium: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", text: "#d97706", label: "Medium Confidence" },
  Limited: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)", text: "#94a3b8", label: "Limited Data" },
};

export function DataConfidenceBadge({ level }) {
  const style = CONFIDENCE_STYLES[level] || CONFIDENCE_STYLES.Limited;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
      data-testid="data-confidence-badge"
    >
      <ShieldCheck className="w-3 h-3" />
      {style.label}
    </span>
  );
}

export function AcademicCompletenessFlag({ completeness }) {
  if (!completeness || completeness.complete) return null;
  const missingList = completeness.missing || [];
  if (missingList.length === 0) return null;
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg mt-2"
      style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
      data-testid="academic-completeness-flag"
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
      <p className="text-[11px] leading-relaxed" style={{ color: "#92400E" }}>
        Limited academic data — missing {missingList.join(", ")}. Insights may be less precise.
      </p>
    </div>
  );
}

export function ThisMayChangeCopy() {
  return (
    <div
      className="flex items-start gap-1.5 mt-2 pt-2"
      style={{ borderTop: "1px solid var(--t-border, #e5e7eb)" }}
      data-testid="this-may-change-copy"
    >
      <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
      <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-text-faint, #b0b0c0)" }}>
        Recruiting data changes frequently. Verify details directly with the school's coaching staff.
      </p>
    </div>
  );
}
