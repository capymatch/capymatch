import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, School, MessageSquare, Calendar, TrendingUp, Activity } from "lucide-react";
import api from "../lib/api";

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-4 transition-all ${onClick ? "cursor-pointer hover:border-pink-600/30" : ""}`}
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`admin-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{value}</p>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function PlanBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-16" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: "var(--t-text)" }}>{count}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/admin/stats").then(res => {
      setStats(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="bg-pink-600/15 text-pink-400" onClick={() => navigate("/admin/users")} />
        <StatCard icon={Activity} label="Active This Week" value={stats.active_users_this_week} color="bg-emerald-600/15 text-emerald-400" />
        <StatCard icon={School} label="Schools on Boards" value={stats.total_schools_on_boards} color="bg-blue-600/15 text-blue-400" />
        <StatCard icon={MessageSquare} label="Total Interactions" value={stats.total_interactions} color="bg-amber-600/15 text-amber-400" />
        <StatCard icon={Calendar} label="Total Events" value={stats.total_events} color="bg-violet-600/15 text-violet-400" />
        <StatCard icon={TrendingUp} label="Conversion" value={stats.total_users > 0 ? `${Math.round((stats.plan_counts.pro + stats.plan_counts.premium) / stats.total_users * 100)}%` : "0%"} color="bg-teal-600/15 text-teal-400" />
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>Subscription Distribution</h3>
          <div className="space-y-3">
            <PlanBar label="Starter" count={stats.plan_counts.basic} total={stats.total_users} color="bg-gray-400" />
            <PlanBar label="Pro" count={stats.plan_counts.pro} total={stats.total_users} color="bg-pink-500" />
            <PlanBar label="Premium" count={stats.plan_counts.premium} total={stats.total_users} color="bg-amber-500" />
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/admin/users")}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5"
              style={{ color: "var(--t-text-secondary)" }}
              data-testid="admin-quick-manage-users"
            >
              Manage Users
            </button>
            <button
              onClick={() => navigate("/admin/subscriptions")}
              className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5"
              style={{ color: "var(--t-text-secondary)" }}
              data-testid="admin-quick-manage-subscriptions"
            >
              Manage Subscriptions
            </button>
            <button
              className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/25 cursor-not-allowed"
            >
              Configure Automations (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
