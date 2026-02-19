import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, PieChart, Users, Mail, Eye, Target, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import FeatureGate from "../components/FeatureGate";
import api from "../lib/api";

function StatCard({ icon: Icon, iconColor, iconBg, label, value, subtext, trend }) {
  return (
    <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? "text-emerald-400" : trend < 0 ? "text-red-400" : "text-gray-400"}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{label}</p>
      {subtext && <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-faint)" }}>{subtext}</p>}
    </div>
  );
}

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-28 text-right shrink-0" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
      <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ backgroundColor: "var(--t-surface-alt)" }}>
        <div className="h-full rounded-md transition-all duration-700 flex items-center px-2" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}>
          {pct > 15 && <span className="text-[10px] font-bold text-white">{value}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs font-medium w-6" style={{ color: "var(--t-text-muted)" }}>{value}</span>}
    </div>
  );
}

function DonutChart({ segments, size = 140 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dashLen = pct * circumference;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color} strokeWidth={20}
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={-offset}
            className="transition-all duration-700"
          />
        );
        offset += dashLen;
        return el;
      })}
    </svg>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/programs"),
      api.get("/profile-views").catch(() => ({ data: { total: 0, this_week: 0, today: 0 } })),
      api.get("/dashboard"),
    ]).then(([progRes, viewsRes, dashRes]) => {
      const programs = progRes.data || [];
      const views = viewsRes.data || {};

      // Division breakdown
      const divCounts = {};
      programs.forEach(p => {
        const d = p.division || "Unknown";
        divCounts[d] = (divCounts[d] || 0) + 1;
      });

      // Pipeline funnel
      const statusMap = {};
      programs.forEach(p => {
        const s = p.recruiting_status || "Not Contacted";
        statusMap[s] = (statusMap[s] || 0) + 1;
      });

      // Response rates
      const contacted = programs.filter(p => p.recruiting_status && p.recruiting_status !== "Not Contacted").length;
      const replied = programs.filter(p => p.reply_status === "Replied").length;
      const responseRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

      // Offers
      const offers = programs.filter(p => p.recruiting_status === "Offer Received").length;

      setData({
        totalSchools: programs.length,
        contacted,
        replied,
        responseRate,
        offers,
        views,
        divCounts,
        statusMap,
        programs,
      });
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <FeatureGate feature="analytics">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </FeatureGate>
    );
  }

  const divColors = { D1: "#10b981", D2: "#3b82f6", D3: "#8b5cf6", NAIA: "#f59e0b", JUCO: "#ef4444", Unknown: "#6b7280" };
  const statusColors = {
    "Not Contacted": "#6b7280", "Contacted": "#3b82f6", "Actively Recruiting": "#8b5cf6",
    "Active Communication": "#ec4899", "Offer Received": "#10b981", "Not a Fit / Closed": "#ef4444",
  };

  const divSegments = Object.entries(data?.divCounts || {}).map(([k, v]) => ({ label: k, value: v, color: divColors[k] || "#6b7280" }));
  const statusEntries = Object.entries(data?.statusMap || {}).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(...statusEntries.map(e => e[1]), 1);

  return (
    <FeatureGate feature="analytics">
      <div data-testid="analytics-page" className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard icon={Target} iconColor="text-teal-500" iconBg="bg-teal-500/15" label="Schools Tracked" value={data?.totalSchools || 0} subtext="In your pipeline" trend={12} />
          <StatCard icon={Mail} iconColor="text-blue-500" iconBg="bg-blue-500/15" label="Response Rate" value={`${data?.responseRate || 0}%`} subtext={`${data?.replied || 0} of ${data?.contacted || 0} contacted`} trend={data?.responseRate > 0 ? 8 : 0} />
          <StatCard icon={Eye} iconColor="text-emerald-500" iconBg="bg-emerald-500/15" label="Profile Views (7d)" value={data?.views?.this_week || 0} subtext={`${data?.views?.today || 0} today`} trend={5} />
          <StatCard icon={TrendingUp} iconColor="text-amber-500" iconBg="bg-amber-500/15" label="Offers Received" value={data?.offers || 0} subtext="Keep going!" trend={null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Pipeline Funnel */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="pipeline-funnel">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Pipeline Funnel</h3>
            </div>
            {statusEntries.length > 0 ? (
              <div className="space-y-3">
                {statusEntries.map(([status, count]) => (
                  <HBar key={status} label={status} value={count} max={maxStatus} color={statusColors[status] || "#ec4899"} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>Add schools to see your pipeline breakdown</p>
            )}
          </div>

          {/* Division Breakdown */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="division-breakdown">
            <div className="flex items-center gap-2 mb-5">
              <PieChart className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Division Breakdown</h3>
            </div>
            {divSegments.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="relative flex items-center justify-center">
                  <DonutChart segments={divSegments} />
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{data?.totalSchools}</span>
                    <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>total</span>
                  </div>
                </div>
                <div className="space-y-2.5 flex-1">
                  {divSegments.map(seg => (
                    <div key={seg.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>{seg.label}</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{seg.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: "var(--t-text-muted)" }}>Add schools to see division distribution</p>
            )}
          </div>
        </div>

        {/* Outreach Summary */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="outreach-summary">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Outreach Overview</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Not Contacted", value: data?.statusMap?.["Not Contacted"] || 0, color: "#6b7280" },
              { label: "Contacted", value: data?.contacted || 0, color: "#3b82f6" },
              { label: "Got Replies", value: data?.replied || 0, color: "#10b981" },
              { label: "Offers", value: data?.offers || 0, color: "#f59e0b" },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-4 text-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}
