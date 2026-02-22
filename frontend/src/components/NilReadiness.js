import { Info, Check, X, RefreshCw, Loader2, MessageSquare, Copy, ChevronDown, AlertCircle } from "lucide-react";
import { useState } from "react";
import { DataConfidenceBadge, ThisMayChangeCopy } from "./TrustIndicators";
import { ImproveCardNudge } from "./ImproveCardNudge";
import { toast } from "sonner";

const STATUS_CONFIG = {
  established:  { dot: "#10b981", statusBg: "rgba(16,185,129,0.08)", statusBorder: "rgba(16,185,129,0.18)", accent: "#10b981" },
  emerging:     { dot: "#f59e0b", statusBg: "rgba(245,158,11,0.08)", statusBorder: "rgba(245,158,11,0.18)", accent: "#f59e0b" },
  info_limited: { dot: "#94a3b8", statusBg: "rgba(148,163,184,0.08)", statusBorder: "rgba(148,163,184,0.18)", accent: "#94a3b8" },
};

const UNIVERSAL_QUESTIONS = [
  "What NIL resources or education does your program provide to athletes?",
  "Who supports athletes with NIL compliance and guidance at your school?",
];

const LABEL_QUESTIONS = {
  info_limited: [
    "Does your athletic department provide NIL education or onboarding for new athletes?",
    "Are athletes connected with compliance staff or advisors for NIL questions?",
    "At what point in the recruiting or onboarding process do NIL discussions usually happen?",
    "What steps should families take to stay compliant with NIL rules at your school?",
  ],
  emerging: [
    "What kind of NIL guidance or support is available to athletes in your program?",
    "Are there educational resources to help athletes understand NIL opportunities and responsibilities?",
    "How do athletes typically learn about compliant NIL opportunities?",
    "Who should we contact if NIL questions come up during the year?",
    "How do you help athletes balance NIL activities with team and academic commitments?",
  ],
  established: [
    "What NIL education or programming does your department provide to athletes?",
    "Are athletes supported by compliance staff or advisors for NIL planning?",
    "How do you help athletes understand what opportunities are compliant?",
    "At what point do athletes typically receive NIL guidance after joining the program?",
    "How do you ensure NIL activities don\u2019t interfere with team expectations or academics?",
  ],
  info_limited_vague: [
    "We\u2019ve seen mentions of NIL support \u2014 could you share how that works in practice?",
    "What resources are most helpful for athletes new to NIL at your school?",
    "Who helps athletes navigate NIL compliance questions?",
    "What should families understand about NIL expectations in your program?",
  ],
};

function NilQuestions({ status, isVague }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const questionKey = isVague ? "info_limited_vague" : status;
  const labelQuestions = LABEL_QUESTIONS[questionKey] || LABEL_QUESTIONS.info_limited;
  const allQuestions = [...UNIVERSAL_QUESTIONS, ...labelQuestions];

  const handleCopy = () => {
    const text = allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Questions copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-2" data-testid="nil-questions">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition-opacity"
        style={{ color: "#6366f1" }}
        data-testid="nil-questions-toggle"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Questions to ask about NIL
        <ChevronDown
          className="w-3 h-3 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {expanded && (
        <p className="text-[10.5px] leading-relaxed -mt-1" style={{ color: "#9ca3af" }}>
          These questions focus on NIL education, support, and compliance — not guarantees or compensation.
        </p>
      )}

      {expanded && (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
          <ul className="divide-y" style={{ borderColor: "#f3f4f6" }}>
            {allQuestions.map((q, i) => (
              <li
                key={i}
                className="px-3.5 py-2.5 text-[12.5px] leading-relaxed"
                style={{ color: "#374151", background: i < UNIVERSAL_QUESTIONS.length ? "var(--accent-subtle, rgba(99,102,241,0.03))" : "#fff" }}
                data-testid={`nil-question-${i}`}
              >
                {q}
              </li>
            ))}
          </ul>
          <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: "#f9fafb", borderTop: "1px solid #f3f4f6" }}>
            <p className="text-[10.5px] leading-relaxed" style={{ color: "#9ca3af" }}>
              NIL opportunities vary by school and individual circumstances. Participation and outcomes are not guaranteed.
            </p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0 ml-3"
              style={{
                background: copied ? "#ecfdf5" : "#f8fafc",
                color: copied ? "#059669" : "#6366f1",
                border: `1px solid ${copied ? "#a7f3d0" : "#e2e8f0"}`,
              }}
              data-testid="nil-copy-questions-btn"
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

export function NilReadinessCard({ nil, dataConfidence, loading, onRefresh, programId }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="rounded-xl border p-5" style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        data-testid="nil-readiness-loading">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#6366f1" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#1a1a2e" }}>Analyzing NIL environment...</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Reviewing available NIL data and program signals</p>
          </div>
        </div>
      </div>
    );
  }

  if (!nil) return null;
  const cfg = STATUS_CONFIG[nil.status] || STATUS_CONFIG.info_limited;
  const isLimited = nil.status === "info_limited";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      data-testid="nil-readiness-card"
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.statusBg }}>
              <Info className="w-4 h-4" style={{ color: cfg.accent }} />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#6b7280" }}>
                NIL Readiness
              </div>
              <div className="text-sm font-bold" style={{ color: "#1a1a2e" }} data-testid="nil-card-label">
                {nil.label}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataConfidence?.level && <DataConfidenceBadge level={dataConfidence.level} />}
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100" data-testid="nil-refresh-btn">
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9ca3af" }} />
              </button>
            )}
          </div>

          {showTooltip && (
            <div className="absolute right-0 -top-2 -translate-y-full z-10 max-w-[280px] p-3 rounded-lg border shadow-lg"
              style={{ backgroundColor: "#f8fafc", borderColor: "#e5e7eb" }}
              data-testid="nil-tooltip-bubble">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                  {nil.tooltip}
                </p>
                <button onClick={() => setShowTooltip(false)} className="flex-shrink-0 p-0.5">
                  <X className="w-3 h-3" style={{ color: "#9ca3af" }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ borderLeft: `2px solid ${cfg.accent}20`, paddingLeft: 16 }}>
          {/* Status banner */}
          <div className="rounded-lg px-3.5 py-2.5 mb-3"
            style={{ background: cfg.statusBg, border: `1px solid ${cfg.statusBorder}` }}
            data-testid="nil-status-banner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
              <span className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{nil.status_label}</span>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#4b5563" }}
            data-testid="nil-explanation">
            {nil.explanation}
          </p>

          {/* Guidance block */}
          {nil.guidance && (
            <div className="rounded-lg px-3.5 py-2.5 mb-3" style={{ background: "var(--accent-subtle, rgba(99,102,241,0.04))", border: "1px solid rgba(99,102,241,0.10)" }}
              data-testid="nil-guidance">
              <p className="text-[12px] font-medium mb-0.5" style={{ color: "#6b7280" }}>
                What this means for you
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#4b5563" }}>
                {nil.guidance}
              </p>
            </div>
          )}

          {/* Two-column (only for non-limited states with involves/meaning) */}
          {!isLimited && nil.involves?.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 rounded-lg border overflow-hidden mb-3" style={{ borderColor: "#e5e7eb" }}>
              <div className="p-3.5 sm:border-r" style={{ borderColor: "#e5e7eb" }}>
                <h4 className="text-[13px] font-bold mb-2.5" style={{ color: "#1a1a2e" }}>What This Involves</h4>
                <ul className="space-y-2">
                  {nil.involves.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 border-t sm:border-t-0" style={{ borderColor: "#e5e7eb" }}>
                <h4 className="text-[13px] font-bold mb-2.5" style={{ color: "#1a1a2e" }}>What This Means for You</h4>
                <p className="text-[12px] leading-relaxed" style={{ color: "#4b5563" }}>
                  {nil.meaning}
                </p>
              </div>
            </div>
          )}

          {/* Context tags */}
          {nil.context_tags?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mb-3" data-testid="nil-context-tags">
              {nil.context_tags.map((tag, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Questions to ask */}
        <NilQuestions status={nil.status} isVague={nil.is_vague} />

        {/* About this estimate */}
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="inline-flex items-center gap-1 text-[11px] font-medium hover:opacity-70 transition-opacity"
          style={{ color: "#9ca3af" }}
          data-testid="nil-info-btn"
        >
          <Info className="w-3 h-3" />
          About this estimate
        </button>

        {/* Improve this card (info_limited only) */}
        {isLimited && programId && (
          <ImproveCardNudge cardType="nil_readiness" programId={programId} />
        )}

        {/* Disclaimer */}
        <p className="text-[11px]" style={{ color: "#9ca3af" }} data-testid="nil-disclaimer">
          NIL opportunities vary and are not guaranteed.
        </p>
      </div>
    </div>
  );
}
