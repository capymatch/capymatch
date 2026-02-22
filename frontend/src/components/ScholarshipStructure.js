import { GraduationCap, Info, X, RefreshCw, Loader2, MessageSquare, Copy, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DataConfidenceBadge, ThisMayChangeCopy } from "./TrustIndicators";
import { ImproveCardNudge } from "./ImproveCardNudge";
import { toast } from "sonner";

const STATUS_CONFIG = {
  mix:     { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  partial: { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  walkon:  { accent: "#475569", bg: "#F8FAFC", text: "#334155" },
  unknown: { accent: "#94A3B8", bg: "#F8FAFC", text: "#64748B" },
};

const UNIVERSAL_QUESTIONS = [
  "For my position and class year, what does a typical scholarship package look like at your program?",
  "How do families usually combine athletic aid with academic and need-based aid at your school?",
];

const LABEL_QUESTIONS = {
  unknown: [
    "Is athletic aid at your program most often partial, occasionally full, or primarily walk-on with later opportunities?",
    "What factors most influence aid decisions in your program (position needs, academics, timeline to contribute)?",
    "When are scholarship decisions typically finalized for my grad year?",
    "What should we share with you to evaluate fit (film, test scores, GPA, schedule)?",
  ],
  partial: [
    "For outside hitters in my class year, what is the usual range of partial support you offer?",
    "Do you typically reserve larger awards for certain positions or immediate-impact roles?",
    "How often do packages change after the season based on roster needs?",
    "Is academic aid commonly stacked with athletic aid here? If so, what GPA/test score thresholds help?",
    "What\u2019s the best timing for us to have this scholarship conversation in your process?",
  ],
  mix: [
    "What athlete profiles typically receive larger awards in your program?",
    "How much do position needs vs. timeline to contribute influence award size?",
    "Are larger awards usually decided earlier, or can they change later in the cycle?",
    "What academic benchmarks tend to strengthen scholarship opportunities at your school?",
    "If our athlete starts with partial aid, what paths commonly lead to increased support later?",
  ],
  walkon: [
    "How do walk-on athletes earn playing time and progress in your program?",
    "What milestones typically lead to athletic aid for walk-ons (role, performance, development)?",
    "How often do scholarships open due to roster movement, and when does that usually happen?",
    "What costs should families plan for in year one if aid is limited initially?",
    "What would you need to see from our athlete to consider future support?",
  ],
};

function ScholarshipQuestions({ status }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const labelQuestions = LABEL_QUESTIONS[status] || LABEL_QUESTIONS.unknown;
  const allQuestions = [...UNIVERSAL_QUESTIONS, ...labelQuestions];

  const handleCopy = () => {
    const text = allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Questions copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-2" data-testid="scholarship-questions">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
        style={{ color: "#6366f1" }}
        data-testid="scholarship-questions-toggle"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Questions to ask the coach
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <ul className="divide-y" style={{ borderColor: "#f3f4f6" }}>
            {allQuestions.map((q, i) => (
              <li
                key={i}
                className="px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                style={{ color: "#374151", background: i < UNIVERSAL_QUESTIONS.length ? "rgba(99,102,241,0.03)" : "#fff" }}
                data-testid={`scholarship-question-${i}`}
              >
                {q}
              </li>
            ))}
          </ul>
          <div className="px-3.5 py-2 flex justify-end" style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
              style={{
                background: copied ? "#ecfdf5" : "#f8fafc",
                color: copied ? "#059669" : "#6366f1",
                border: `1px solid ${copied ? "#a7f3d0" : "#e2e8f0"}`,
              }}
              data-testid="scholarship-copy-questions-btn"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy Questions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Full Scholarship Structure Card for Journey / Detail pages ── */
export function ScholarshipStructureCard({ scholarship, dataConfidence, loading, onRefresh, programId }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showNilTooltip, setShowNilTooltip] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        data-testid="scholarship-structure-loading">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6366f1" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Analyzing scholarship structure...</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Reviewing available financial aid data</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scholarship) return null;
  const cfg = STATUS_CONFIG[scholarship.status] || STATUS_CONFIG.unknown;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="scholarship-structure-card"
    >
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: cfg.accent }} />

        <div className="p-4 flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              {dataConfidence?.level && <DataConfidenceBadge level={dataConfidence.level} />}
              {onRefresh && (
                <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="scholarship-refresh-btn">
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}
            data-testid="scholarship-explanation">
            {scholarship.explanation}
          </p>

          {/* Guidance */}
          {scholarship.guidance && (
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.10)" }}
              data-testid="scholarship-guidance">
              <p className="text-[12px] font-medium mb-0.5" style={{ color: "var(--t-text-muted, #6b7280)" }}>
                What this means for you
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary, #4b5563)" }}>
                {scholarship.guidance}
              </p>
            </div>
          )}

          {/* NIL Context */}
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

          {/* Questions to ask the coach */}
          <ScholarshipQuestions status={scholarship.status} />

          {/* About this estimate */}
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

          {scholarship.status === "unknown" && programId && (
            <ImproveCardNudge cardType="scholarship_structure" programId={programId} />
          )}

          <ThisMayChangeCopy />
        </div>
      </div>
    </div>
  );
}
