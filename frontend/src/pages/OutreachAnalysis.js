import { useState, useEffect } from "react";
import {
  TrendingUp, BarChart3, Target, ArrowUpRight, Loader2,
  Zap, AlertTriangle, CheckCircle, ChevronRight, MessageCircle
} from "lucide-react";
import FeatureGate from "../components/FeatureGate";
import api from "../lib/api";

function ScoreRing({ score, label }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute mt-7 flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] mt-[-2px]" style={{ color: "var(--t-text-muted)" }}>/100</span>
      </div>
      <span className="text-xs font-medium mt-2" style={{ color: "var(--t-text)" }}>{label}</span>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-lg border p-3" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{label}</span>
      </div>
      <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{value}</span>
    </div>
  );
}

export default function OutreachAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await api.get("/ai/outreach-analysis");
        setData(res.data.analysis);
      } catch (err) {
        if (err.response?.status === 403) return; // FeatureGate handles this
        setError("Failed to generate analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  return (
    <FeatureGate feature="auto_reply_detection">
      <div className="space-y-5" data-testid="outreach-analysis-page">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Outreach Analysis</h2>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>AI-powered insights into your recruiting outreach</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-3" />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Analyzing your outreach data...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>{error}</p>
          </div>
        ) : !data ? (
          <div className="text-center py-20">
            <MessageCircle className="w-8 h-8 mx-auto opacity-20 mb-3" style={{ color: "var(--t-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Add schools and interactions to get analysis</p>
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatBox label="Schools Tracked" value={data.stats.total_schools} icon={Target} color="text-blue-400" />
              <StatBox label="Total Outreach" value={data.stats.total_interactions} icon={MessageCircle} color="text-pink-400" />
              <StatBox label="Schools Replied" value={data.stats.replied_schools} icon={CheckCircle} color="text-emerald-400" />
              <StatBox label="Response Rate" value={`${data.stats.response_rate}%`} icon={TrendingUp} color="text-amber-400" />
            </div>

            {data.ai_insights && (
              <>
                {/* Score + Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border p-5 flex flex-col items-center justify-center relative" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="outreach-score">
                    <ScoreRing score={data.ai_insights.overall_score} label={data.ai_insights.score_label} />
                  </div>
                  <div className="md:col-span-2 rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>AI Summary</h3>
                    <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--t-text-secondary)" }}>
                      {data.ai_insights.summary}
                    </p>
                    {data.ai_insights.division_insights && (
                      <div className="rounded-lg p-3 border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: "var(--t-text-muted)" }}>Division Insights</p>
                        <p className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{data.ai_insights.division_insights}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Strengths + Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Strengths
                    </h3>
                    <ul className="space-y-2">
                      {(data.ai_insights.strengths || []).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                          <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <Zap className="w-4 h-4 text-amber-400" /> Areas to Improve
                    </h3>
                    <ul className="space-y-2">
                      {(data.ai_insights.improvements || []).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                          <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-amber-400 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <Target className="w-4 h-4 text-pink-400" /> Recommended Next Steps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(data.ai_insights.next_steps || []).map((step, i) => (
                      <div key={i} className="rounded-lg border p-3 flex items-start gap-2" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                        <span className="w-5 h-5 rounded-full bg-pink-600/15 text-pink-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interaction Breakdown */}
                {data.stats.by_type && Object.keys(data.stats.by_type).length > 0 && (
                  <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <BarChart3 className="w-4 h-4 text-blue-400" /> Outreach by Type
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(data.stats.by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs w-24 text-right" style={{ color: "var(--t-text-muted)" }}>{type}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                            <div
                              className="h-full rounded-full bg-pink-500"
                              style={{ width: `${(count / data.stats.total_interactions) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8" style={{ color: "var(--t-text)" }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </FeatureGate>
  );
}
