import { useState, useEffect } from "react";
import {
  TrendingUp, BarChart3, Target, ArrowUpRight, Loader2,
  Zap, AlertTriangle, CheckCircle, ChevronRight, MessageCircle,
  Shield, RefreshCw, Eye, Radio, Lock, Crown
} from "lucide-react";
import FeatureGate from "../components/FeatureGate";
import UpgradeBenefitsPage from "../components/UpgradeBenefitsPage";
import { useSubscription } from "../lib/subscription";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import UpgradeModal from "../components/UpgradeModal";

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
  const { subscription } = useSubscription();
  const isBasic = false; // Starter now has all Pro features
  const isPremium = subscription?.tier === "premium";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPremium) { setLoading(false); return; }
    const fetchAnalysis = async () => {
      try {
        const res = await api.get("/ai/outreach-analysis");
        setData(res.data.analysis);
      } catch (err) {
        if (err.response?.status === 403) return;
        setError("Failed to generate analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [isPremium]);

  if (!isPremium) return <UpgradeBenefitsPage featureKey="outreach-analysis" premiumOnly={!isBasic} />;

  return (
      <div data-testid="outreach-analysis-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Engagement Analysis</h2>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>AI-powered insights into your recruiting engagement</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500 mb-3" />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatBox label="Schools Tracked" value={data.stats.total_schools} icon={Target} color="text-blue-400" />
              <StatBox label="Total Outreach" value={data.stats.total_interactions} icon={MessageCircle} color="text-teal-600" />
              <StatBox label="Schools Replied" value={data.stats.replied_schools} icon={CheckCircle} color="text-teal-600" />
              <StatBox label="Response Rate" value={`${data.stats.response_rate}%`} icon={TrendingUp} color="text-amber-400" />
            </div>

            {data.ai_insights && (
              <>
                {/* Score + Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  <div className="rounded-xl border p-4 flex flex-col items-center justify-center relative" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="outreach-score">
                    <ScoreRing score={data.ai_insights.overall_score} label={data.ai_insights.score_label} />
                  </div>
                  <div className="md:col-span-2 rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--t-text)" }}>AI Summary</h3>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--t-text-secondary)" }}>
                      {data.ai_insights.summary}
                    </p>
                    {data.ai_insights.division_insights && (
                      <div className="rounded-lg p-2.5 border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--t-text-muted)" }}>Division Insights</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{data.ai_insights.division_insights}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Strengths + Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <CheckCircle className="w-4 h-4 text-teal-600" /> Strengths
                    </h3>
                    <ul className="space-y-1.5">
                      {(data.ai_insights.strengths || []).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
                          <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 text-teal-600 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <Zap className="w-4 h-4 text-amber-400" /> Areas to Improve
                    </h3>
                    <ul className="space-y-1.5">
                      {(data.ai_insights.improvements || []).map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
                          <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-amber-400 flex-shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="rounded-xl border p-4 mb-6" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                    <Target className="w-4 h-4 text-teal-600" /> Recommended Next Steps
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(data.ai_insights.next_steps || []).map((step, i) => (
                      <div key={i} className="rounded-lg border p-2.5 flex items-start gap-2" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                        <span className="w-5 h-5 rounded-full bg-teal-600/15 text-teal-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interaction Breakdown */}
                {data.stats.by_type && Object.keys(data.stats.by_type).length > 0 && (
                  <div className="rounded-xl border p-4 mb-6" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
                      <BarChart3 className="w-4 h-4 text-blue-400" /> Engagement by Type
                    </h3>
                    <div className="space-y-1.5">
                      {Object.entries(data.stats.by_type).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-xs w-24 text-right" style={{ color: "var(--t-text-muted)" }}>{type}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                            <div
                              className="h-full rounded-full bg-slate-500"
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

        {/* Coach Watch Section */}
        <CoachWatch isPremium={isPremium} />
      </div>
  );
}

const SEVERITY_CONFIG = {
  red: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertTriangle, label: "Coaching Change" },
  yellow: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Eye, label: "Monitor" },
  green: { color: "text-teal-600", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: CheckCircle, label: "Stable" },
};

function CoachWatch({ isPremium }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedAt, setScannedAt] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();

  useEffect(() => {
    if (!isPremium) return;
    api.get("/ai/coach-watch/alerts").then(res => {
      setAlerts(res.data.alerts || []);
    }).catch(() => {});
  }, [isPremium]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await api.post("/ai/coach-watch/scan");
      setAlerts(res.data.alerts || []);
      setScannedAt(res.data.scanned_at);
    } catch (err) {
      console.error("Coach watch scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const redAlerts = alerts.filter(a => a.severity === "red");
  const yellowAlerts = alerts.filter(a => a.severity === "yellow");
  const greenAlerts = alerts.filter(a => a.severity === "green");

  return (
    <div className="rounded-xl border p-5 relative" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="coach-watch-section">
      {!isPremium && (
        <div className="absolute inset-0 z-10 rounded-xl flex flex-col items-center justify-center backdrop-blur-[2px]" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Lock className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-sm font-semibold text-white mb-1">Premium Exclusive</p>
          <p className="text-xs text-white/60 mb-3 text-center max-w-xs">Coach Watch monitors coaching staff changes at your target schools in real time.</p>
          <button
            onClick={() => setShowUpgrade(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 transition-all"
            data-testid="coach-watch-upgrade-btn"
          >
            <Crown className="w-3 h-3 inline mr-1.5" />Upgrade to Premium
          </button>
          <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="auto_reply_detection" currentTier={subscription?.tier || "basic"} />
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Coach Watch</h3>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">PREMIUM</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runScan}
          disabled={scanning}
          className="h-7 text-xs gap-1.5"
          data-testid="coach-watch-scan-btn"
        >
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {scanning ? "Scanning..." : "Scan Now"}
        </Button>
      </div>

      <p className="text-[11px] mb-4" style={{ color: "var(--t-text-muted)" }}>
        AI monitors coaching staff changes at schools in your pipeline. Scan weekly to stay ahead of disruptions.
      </p>

      {scanning ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500 mb-2" />
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Scanning news for coaching changes...</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--t-text-muted)" }}>This may take 30-60 seconds</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <Radio className="w-6 h-6 mx-auto opacity-20 mb-2" style={{ color: "var(--t-text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
            {scannedAt ? "No coaching changes detected. Your pipeline looks stable." : "Click \"Scan Now\" to check for coaching changes at your target schools."}
          </p>
        </div>
      ) : (
        <div>
          {[...redAlerts, ...yellowAlerts, ...greenAlerts].map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.green;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.alert_id}
                className={`rounded-lg border p-3 mb-4 ${cfg.border}`}
                style={{ backgroundColor: "var(--t-surface-alt)" }}
                data-testid={`coach-alert-${alert.severity}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-md ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{alert.university_name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--t-text-secondary)" }}>{alert.headline}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{alert.summary}</p>
                    {alert.recommendation && (
                      <div className="mt-2 rounded-md p-2 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                        <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--t-text-muted)" }}>What this means for you</p>
                        <p className="text-[11px]" style={{ color: "var(--t-text-secondary)" }}>{alert.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {scannedAt && (
            <p className="text-[10px] text-right pt-1" style={{ color: "var(--t-text-muted)" }}>
              Last scan: {new Date(scannedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
