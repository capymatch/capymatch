import { BarChart3, TrendingUp, PieChart } from "lucide-react";

export default function Analytics() {
  return (
    <div data-testid="analytics-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
        <BarChart3 className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-2xl font-bold text-white mb-2">Analytics</h2>
      <p className="text-white/60 text-center max-w-md">
        Track your recruiting progress with detailed analytics and insights.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-white/40 text-sm">Response Rate</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <PieChart className="w-4 h-4 text-blue-400" />
          <span className="text-white/40 text-sm">Division Breakdown</span>
        </div>
      </div>
    </div>
  );
}
