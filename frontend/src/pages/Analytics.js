import { BarChart3, TrendingUp, PieChart, Sparkles } from "lucide-react";
import FeatureGate from "../components/FeatureGate";

export default function Analytics() {
  return (
    <FeatureGate feature="analytics">
      <div data-testid="analytics-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div 
        className="w-24 h-24 rounded-3xl bg-pink-600/20 border border-pink-600/30 flex items-center justify-center mb-6 shadow-lg"
      >
        <BarChart3 className="w-12 h-12 text-pink-600" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-3xl font-bold mb-3" style={{ color: "var(--t-text)" }}>Analytics</h2>
      <p className="text-center max-w-md leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
        Track your recruiting progress with detailed analytics and insights.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-4">
        <div 
          className="flex items-center gap-3 px-5 py-3 rounded-xl border"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <TrendingUp className="w-5 h-5 text-green-500" />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Response Rate</span>
        </div>
        <div 
          className="flex items-center gap-3 px-5 py-3 rounded-xl border"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <PieChart className="w-5 h-5 text-blue-500" />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Division Breakdown</span>
        </div>
        <Sparkles className="w-5 h-5 text-amber-500" />
      </div>
    </div>
  );
}
