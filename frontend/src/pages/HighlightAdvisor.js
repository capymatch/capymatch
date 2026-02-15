import { useState } from "react";
import { Video, Play, Clock, AlertTriangle, CheckCircle, Loader2, Sparkles, ChevronRight, Send } from "lucide-react";
import FeatureGate from "../components/FeatureGate";
import UpgradeBenefitsPage from "../components/UpgradeBenefitsPage";
import { useSubscription } from "../lib/subscription";
import api from "../lib/api";

export default function HighlightAdvisor() {
  const { subscription } = useSubscription();
  const isBasic = !subscription?.tier || subscription.tier === "basic";
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState(null);

  const fetchAdvice = async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/ai/highlight-advice", { question: q });
      setAdvice(res.data.advice);
    } catch (err) {
      if (err.response?.status === 403) return; // FeatureGate handles this
      setError("Failed to generate advice. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return isBasic ? <UpgradeBenefitsPage featureKey="highlight-advisor" /> : (
      <div className="space-y-5" data-testid="highlight-advisor-page">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Highlight Reel Advisor</h2>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>AI-powered recommendations for your recruiting video</p>
          </div>
        </div>

        {!advice && !loading && (
          <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-pink-400" />
            </div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--t-text)" }}>
              Get Personalized Highlight Reel Advice
            </h3>
            <p className="text-xs max-w-md mx-auto mb-6" style={{ color: "var(--t-text-muted)" }}>
              Our AI analyzes your profile, position, and target schools to recommend exactly what to include in your highlight video.
            </p>
            <div className="max-w-sm mx-auto mb-4">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Optional: Ask a specific question..."
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  data-testid="highlight-question-input"
                  onKeyDown={(e) => e.key === "Enter" && fetchAdvice(question)}
                />
              </div>
            </div>
            <button
              onClick={() => fetchAdvice(question)}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 text-white text-sm font-semibold hover:from-pink-500 hover:to-rose-500 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-pink-900/30"
              data-testid="generate-advice-btn"
            >
              <Sparkles className="w-4 h-4" /> Generate Advice
            </button>
            {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-3" />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Generating personalized advice...</p>
          </div>
        )}

        {advice && !advice.error && !loading && (
          <>
            {/* Video Length + Coach Perspective */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Recommended Length</h3>
                </div>
                <p className="text-2xl font-bold text-pink-400">{advice.video_length}</p>
              </div>
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Coach Perspective</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{advice.coach_perspective}</p>
              </div>
            </div>

            {/* Video Structure */}
            {advice.structure && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="video-structure">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                  <Play className="w-4 h-4 text-pink-400" /> Video Structure
                </h3>
                <div className="space-y-3">
                  {advice.structure.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border p-3" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                      <span className="w-6 h-6 rounded-full bg-pink-600/15 text-pink-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{s.section}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-600/10 text-pink-400">{s.duration}</span>
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Must Include + Avoid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Must Include
                </h3>
                <ul className="space-y-2">
                  {(advice.must_include_skills || []).map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                      <ChevronRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Avoid
                </h3>
                <ul className="space-y-2">
                  {(advice.avoid || []).map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                      <ChevronRight className="w-3 h-3 text-red-400 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Position-Specific Advice */}
            {advice.position_specific && (
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Position-Specific Advice</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{advice.position_specific}</p>
              </div>
            )}

            {/* Technical Tips + Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Technical Tips</h3>
                <ul className="space-y-2">
                  {(advice.technical_tips || []).map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                      <span className="text-pink-400 font-bold">*</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                  <Send className="w-4 h-4 text-blue-400" /> How to Share
                </h3>
                <ul className="space-y-2">
                  {(advice.distribution_tips || []).map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                      <span className="text-blue-400 font-bold">{i + 1}.</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Regenerate */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="flex gap-2 max-w-sm flex-1">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  onKeyDown={(e) => e.key === "Enter" && fetchAdvice(question)}
                />
                <button
                  onClick={() => fetchAdvice(question)}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-500 transition-colors flex items-center gap-1.5"
                  data-testid="regenerate-advice-btn"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {question ? "Ask" : "Regenerate"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureGate>
  );
}
