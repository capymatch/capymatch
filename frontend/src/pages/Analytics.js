import { BarChart3, TrendingUp, PieChart, Sparkles } from "lucide-react";

export default function Analytics() {
  return (
    <div data-testid="analytics-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/10">
        <BarChart3 className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-3xl font-bold text-white mb-3">Analytics</h2>
      <p className="text-white/50 text-center max-w-md leading-relaxed">
        Track your recruiting progress with detailed analytics and insights.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-4">
        <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-xl border border-white/10">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <span className="text-white/40 text-sm">Response Rate</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-xl border border-white/10">
          <PieChart className="w-5 h-5 text-blue-400" />
          <span className="text-white/40 text-sm">Division Breakdown</span>
        </div>
        <Sparkles className="w-5 h-5 text-amber-400" />
      </div>
    </div>
  );
}
